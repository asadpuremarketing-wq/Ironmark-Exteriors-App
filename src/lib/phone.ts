/**
 * Formats a Canadian/US phone number as the user types, e.g. "6479512786"
 * -> "+1 647-951-2786". Keeps the leading "+1 " fixed and only lets the
 * user edit the 10 local digits.
 */
export function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^1/, "").slice(0, 10);

  if (digits.length === 0) return "";

  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6, 10);

  let formatted = "+1 " + area;
  if (digits.length > 3) formatted += "-" + prefix;
  if (digits.length > 6) formatted += "-" + line;

  return formatted;
}
