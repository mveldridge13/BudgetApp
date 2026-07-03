// Invoice + client types — mirrors the backend `/invoices` module
// (NestJS InvoiceDto / ClientDto / InvoiceLineItemDto).

// Stored status on the backend. Note: OVERDUE is never set automatically by
// the backend — it's derived on the client from `status === 'SENT'` + a past
// due date (see `deriveInvoiceStatus`).
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELED';

export interface Client {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  address?: string | null;
  phone?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  amount: number;
  sortOrder: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  currency: string;
  issueDate: string; // ISO
  dueDate: string; // ISO
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  notes?: string | null;
  terms?: string | null;
  sentAt?: string | null;
  paidAt?: string | null;
  transactionId?: string | null;
  clientId: string;
  client?: Client;
  lineItems: InvoiceLineItem[];
  createdAt: string;
  updatedAt: string;
}

// ── Inputs ──────────────────────────────────────────────────────────────────

export interface ClientInput {
  name: string;
  email: string;
  company?: string;
  address?: string;
  phone?: string;
  notes?: string;
}

export interface InvoiceLineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
}

export interface CreateInvoiceInput {
  clientId: string;
  currency?: string;
  issueDate: string; // ISO date string
  dueDate: string; // ISO date string
  lineItems: InvoiceLineItemInput[];
  notes?: string;
  terms?: string;
}

// Shape produced by the Create Invoice modal: the client is captured inline as
// name + email (rather than picked), so the service resolves it to a clientId.
export interface InvoiceFormData {
  clientName: string;
  clientEmail: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  lineItems: InvoiceLineItemInput[];
  currency?: string;
  notes?: string;
}

// ── Derived ─────────────────────────────────────────────────────────────────

export interface InvoiceStats {
  outstanding: number; // owed: SENT + OVERDUE totals
  paidYtd: number; // PAID totals with paidAt in the current year
  overdueCount: number;
  totalInvoices: number;
}
