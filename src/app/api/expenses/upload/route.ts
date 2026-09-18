import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
const MAX_SIZE = 4 * 1024 * 1024; // stay under Vercel's serverless request body limit

// Server-side upload: the browser sends the file to this route (instead of
// going directly to Vercel Blob with a client token), and the server
// uploads it using OIDC-based auth. Switched from the client-token flow
// after that flow started rejecting every upload with "Cannot get token
// from authorization header or cookie" at Vercel's blob API, even against
// a freshly created store, pointing to a platform-side issue with that
// auth path on this account rather than anything fixable in our token
// setup.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File is too large. Please upload a receipt under 4 MB." },
      { status: 400 }
    );
  }

  try {
    const blob = await put(file.name, file, {
      access: "public",
      addRandomSuffix: true,
      storeId: process.env.BLOB2_STORE_ID,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 }
    );
  }
}
