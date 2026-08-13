import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { INVOICE_STATUS_LABELS } from "@/lib/invoices";
import { PAYMENT_METHOD_LABELS } from "@/lib/expenses";
import type { Invoice, Payment, Customer, BusinessSettings } from "@prisma/client";

const ELECTRIC = "#2563EB";
const INK = "#0B0F19";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingTop: 0,
    fontSize: 10,
    color: INK,
    fontFamily: "Helvetica",
  },
  topBar: {
    height: 6,
    backgroundColor: ELECTRIC,
    marginBottom: 32,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  businessName: {
    fontSize: 16,
    fontWeight: 700,
    color: INK,
  },
  businessSub: {
    fontSize: 9,
    color: "#6B7280",
    marginTop: 2,
  },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: ELECTRIC,
    textAlign: "right",
  },
  invoiceMeta: {
    fontSize: 9,
    color: "#6B7280",
    textAlign: "right",
    marginTop: 2,
  },
  statusBadge: {
    marginTop: 6,
    alignSelf: "flex-end",
    fontSize: 9,
    fontWeight: 700,
    color: "#FFFFFF",
    backgroundColor: ELECTRIC,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  section: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  billTo: {
    fontSize: 11,
    fontWeight: 700,
    color: INK,
  },
  billToLine: {
    fontSize: 9,
    color: "#374151",
    marginTop: 1,
  },
  table: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 4,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  colDescription: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.2, textAlign: "right" },
  colTotal: { flex: 1.2, textAlign: "right" },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 700,
    color: "#6B7280",
    textTransform: "uppercase",
  },
  totalsBlock: {
    marginTop: 10,
    alignSelf: "flex-end",
    width: 240,
    backgroundColor: "#F9FAFB",
    borderRadius: 4,
    padding: 12,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalsLabel: {
    fontSize: 9,
    color: "#374151",
  },
  totalsValue: {
    fontSize: 9,
    color: INK,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#D1D5DB",
    marginTop: 4,
    paddingTop: 6,
    paddingBottom: 2,
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: INK,
  },
  grandTotalValue: {
    fontSize: 11,
    fontWeight: 700,
    color: ELECTRIC,
  },
  paymentsTable: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 4,
  },
  paymentRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  footer: {
    marginTop: 30,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    fontSize: 9,
    color: "#6B7280",
    textAlign: "center",
  },
});

function formatMoney(n: number) {
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

type InvoiceWithRelations = Invoice & {
  customer: Customer;
  payments: Payment[];
};

export function InvoiceDocument({
  invoice,
  settings,
}: {
  invoice: InvoiceWithRelations;
  settings: BusinessSettings;
}) {
  const subtotal = Number(invoice.subtotal);
  const discount = Number(invoice.discount);
  const taxAmount = Number(invoice.taxAmount);
  const total = Number(invoice.total);
  const paidSum = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Math.max(0, total - paidSum);

  const businessAddressLine = [settings.address, settings.city, settings.province, settings.postalCode]
    .filter(Boolean)
    .join(", ");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topBar} fixed />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.businessName}>{settings.businessName}</Text>
            {businessAddressLine ? <Text style={styles.businessSub}>{businessAddressLine}</Text> : null}
            {settings.phone ? <Text style={styles.businessSub}>{settings.phone}</Text> : null}
            {settings.email ? <Text style={styles.businessSub}>{settings.email}</Text> : null}
            {settings.website ? <Text style={styles.businessSub}>{settings.website}</Text> : null}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceMeta}>{invoice.invoiceNumber}</Text>
            <Text style={styles.invoiceMeta}>Date: {formatDate(invoice.invoiceDate)}</Text>
            {invoice.dueDate ? <Text style={styles.invoiceMeta}>Due: {formatDate(invoice.dueDate)}</Text> : null}
            <Text style={styles.statusBadge}>{INVOICE_STATUS_LABELS[invoice.status]}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Bill To</Text>
          <Text style={styles.billTo}>
            {invoice.customer.firstName} {invoice.customer.lastName}
          </Text>
          {invoice.customer.streetAddress ? (
            <Text style={styles.billToLine}>{invoice.customer.streetAddress}</Text>
          ) : null}
          {(invoice.customer.city || invoice.customer.province) ? (
            <Text style={styles.billToLine}>
              {[invoice.customer.city, invoice.customer.province, invoice.customer.postalCode]
                .filter(Boolean)
                .join(", ")}
            </Text>
          ) : null}
          {invoice.customer.phone ? <Text style={styles.billToLine}>{invoice.customer.phone}</Text> : null}
          {invoice.customer.email ? <Text style={styles.billToLine}>{invoice.customer.email}</Text> : null}
        </View>

        <View style={styles.section}>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
              <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
              <Text style={[styles.tableHeaderText, styles.colPrice]}>Unit Price</Text>
              <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.colDescription}>{invoice.description}</Text>
              <Text style={styles.colQty}>{Number(invoice.quantity)}</Text>
              <Text style={styles.colPrice}>{formatMoney(Number(invoice.unitPrice))}</Text>
              <Text style={styles.colTotal}>
                {formatMoney(Number(invoice.quantity) * Number(invoice.unitPrice))}
              </Text>
            </View>
          </View>

          <View style={styles.totalsBlock}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatMoney(subtotal + discount)}</Text>
            </View>
            {discount > 0 ? (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Discount</Text>
                <Text style={styles.totalsValue}>-{formatMoney(discount)}</Text>
              </View>
            ) : null}
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>{invoice.taxLabel}</Text>
              <Text style={styles.totalsValue}>{formatMoney(taxAmount)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>{formatMoney(total)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Paid</Text>
              <Text style={styles.totalsValue}>{formatMoney(paidSum)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Balance Due</Text>
              <Text style={styles.totalsValue}>{formatMoney(remaining)}</Text>
            </View>
          </View>
        </View>

        {invoice.payments.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Payment History</Text>
            <View style={styles.paymentsTable}>
              {invoice.payments.map((p) => (
                <View key={p.id} style={styles.paymentRow}>
                  <Text style={{ flex: 2 }}>{formatDate(p.paymentDate)}</Text>
                  <Text style={{ flex: 2 }}>{PAYMENT_METHOD_LABELS[p.method]}</Text>
                  <Text style={{ flex: 2 }}>{p.referenceNumber ?? "—"}</Text>
                  <Text style={{ flex: 1, textAlign: "right" }}>{formatMoney(Number(p.amount))}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {invoice.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={{ fontSize: 9, color: "#374151" }}>{invoice.notes}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text>{settings.invoiceFooterMessage || "Thank you for your business."}</Text>
        </View>
      </Page>
    </Document>
  );
}
