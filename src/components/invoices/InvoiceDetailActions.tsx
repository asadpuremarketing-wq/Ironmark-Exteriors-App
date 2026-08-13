"use client";

import { useState } from "react";
import RecordPaymentForm from "./RecordPaymentForm";

export default function InvoiceDetailActions({
  invoiceId,
  remaining,
  canRecordPayment,
}: {
  invoiceId: string;
  remaining: number;
  canRecordPayment: boolean;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canRecordPayment && remaining > 0 && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-brand-electric px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-electric-light"
          >
            Record Payment
          </button>
        )}
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-ink-900/10 px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-brand-electric/40 hover:text-brand-electric"
        >
          Print
        </button>
        <a
          href={`/api/invoices/${invoiceId}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-ink-900/10 px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-brand-electric/40 hover:text-brand-electric"
        >
          Download PDF
        </a>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:max-w-md sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-ink-900">Record Payment</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-900/40 hover:bg-ink-900/5 hover:text-ink-900"
              >
                ✕
              </button>
            </div>
            <RecordPaymentForm invoiceId={invoiceId} remaining={remaining} onClose={() => setShowModal(false)} />
          </div>
        </div>
      )}
    </>
  );
}
