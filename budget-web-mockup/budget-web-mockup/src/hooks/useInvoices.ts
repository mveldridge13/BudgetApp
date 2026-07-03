'use client';

import {useState, useCallback, useEffect, useMemo} from 'react';
import {invoiceService} from '@/services/invoice.service';
import type {
  Invoice,
  InvoiceStatus,
  InvoiceStats,
  InvoiceFormData,
} from '@/types';

// The backend never flips an invoice to OVERDUE; it's a display-only status
// derived from a SENT invoice whose due date has passed.
export function deriveInvoiceStatus(invoice: Invoice): InvoiceStatus {
  if (invoice.status === 'SENT' && new Date(invoice.dueDate) < new Date()) {
    return 'OVERDUE';
  }
  return invoice.status;
}

interface UseInvoicesReturn {
  invoices: Invoice[];
  stats: InvoiceStats;
  isLoading: boolean;
  error: string | null;
  createInvoice: (form: InvoiceFormData, send: boolean) => Promise<Invoice>;
  updateInvoice: (
    id: string,
    form: InvoiceFormData,
    send: boolean,
  ) => Promise<Invoice>;
  sendInvoice: (id: string) => Promise<Invoice>;
  markPaid: (id: string) => Promise<Invoice>;
  voidInvoice: (id: string) => Promise<Invoice>;
  deleteInvoice: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useInvoices(): UseInvoicesReturn {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await invoiceService.getInvoices();
      // Newest first.
      data.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setInvoices(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load invoices';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createInvoice = useCallback(
    async (form: InvoiceFormData, send: boolean) => {
      // Refresh even if the send step throws (e.g. email misconfigured): the
      // draft was already created, so keep it visible to resend from the row
      // menu instead of leaving a hidden draft the user might recreate.
      try {
        return await invoiceService.createFromForm(form, send);
      } finally {
        await refresh();
      }
    },
    [refresh],
  );

  const updateInvoice = useCallback(
    async (id: string, form: InvoiceFormData, send: boolean) => {
      // Same as create: a failed send still leaves the (updated) draft, so
      // always resync the list.
      try {
        return await invoiceService.updateFromForm(id, form, send);
      } finally {
        await refresh();
      }
    },
    [refresh],
  );

  const sendInvoice = useCallback(
    async (id: string) => {
      const invoice = await invoiceService.sendInvoice(id);
      await refresh();
      return invoice;
    },
    [refresh],
  );

  const markPaid = useCallback(
    async (id: string) => {
      const invoice = await invoiceService.payInvoice(id);
      await refresh();
      return invoice;
    },
    [refresh],
  );

  const voidInvoice = useCallback(
    async (id: string) => {
      const invoice = await invoiceService.voidInvoice(id);
      await refresh();
      return invoice;
    },
    [refresh],
  );

  const deleteInvoice = useCallback(
    async (id: string) => {
      await invoiceService.deleteInvoice(id);
      await refresh();
    },
    [refresh],
  );

  const stats = useMemo<InvoiceStats>(() => {
    const currentYear = new Date().getFullYear();
    let outstanding = 0;
    let paidYtd = 0;
    let overdueCount = 0;

    for (const inv of invoices) {
      const status = deriveInvoiceStatus(inv);
      if (status === 'SENT' || status === 'OVERDUE') {
        outstanding += inv.total;
      }
      if (status === 'OVERDUE') {
        overdueCount += 1;
      }
      if (
        status === 'PAID' &&
        inv.paidAt &&
        new Date(inv.paidAt).getFullYear() === currentYear
      ) {
        paidYtd += inv.total;
      }
    }

    return {
      outstanding,
      paidYtd,
      overdueCount,
      totalInvoices: invoices.length,
    };
  }, [invoices]);

  return {
    invoices,
    stats,
    isLoading,
    error,
    createInvoice,
    updateInvoice,
    sendInvoice,
    markPaid,
    voidInvoice,
    deleteInvoice,
    refresh,
  };
}
