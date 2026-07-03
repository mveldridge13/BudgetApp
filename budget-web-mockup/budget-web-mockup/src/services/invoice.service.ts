import {api} from './api';
import type {
  Invoice,
  Client,
  ClientInput,
  CreateInvoiceInput,
  InvoiceFormData,
} from '@/types';

// Backend responses come back as raw DTOs / arrays (no `{data}` envelope), but
// stay defensive in case that changes — normalize either shape.
function unwrapOne<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in res) {
    return (res as {data: T}).data;
  }
  return res as T;
}

function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === 'object') {
    const r = res as Record<string, unknown>;
    if (Array.isArray(r.data)) return r.data as T[];
  }
  return [];
}

// Strip undefined/empty values so we never trip the backend's
// forbidNonWhitelisted validation with stray fields.
function clean<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined) out[k] = v;
  });
  return out as Partial<T>;
}

class InvoiceService {
  // ── Invoices ───────────────────────────────────────────────────────────────
  async getInvoices(): Promise<Invoice[]> {
    const res = await api.get<unknown>('/invoices', undefined, {
      skipUnwrap: true,
    });
    return unwrapList<Invoice>(res);
  }

  async getInvoice(id: string): Promise<Invoice> {
    const res = await api.get<unknown>(`/invoices/${id}`, undefined, {
      skipUnwrap: true,
    });
    return unwrapOne<Invoice>(res);
  }

  async createInvoice(data: CreateInvoiceInput): Promise<Invoice> {
    const res = await api.post<unknown>('/invoices', clean({...data}));
    return unwrapOne<Invoice>(res);
  }

  async updateInvoice(
    id: string,
    data: Partial<CreateInvoiceInput>,
  ): Promise<Invoice> {
    // Backend route is @Put (not PATCH).
    const res = await api.put<unknown>(`/invoices/${id}`, clean({...data}));
    return unwrapOne<Invoice>(res);
  }

  async deleteInvoice(id: string): Promise<void> {
    await api.delete(`/invoices/${id}`);
  }

  // Generate the PDF + email it to the client, transitioning DRAFT → SENT.
  async sendInvoice(id: string): Promise<Invoice> {
    const res = await api.post<unknown>(`/invoices/${id}/send`);
    return unwrapOne<Invoice>(res);
  }

  // Mark paid → creates the linked INCOME transaction on the backend.
  async payInvoice(id: string): Promise<Invoice> {
    const res = await api.post<unknown>(`/invoices/${id}/pay`);
    return unwrapOne<Invoice>(res);
  }

  // ── Clients ─────────────────────────────────────────────────────────────────
  async getClients(): Promise<Client[]> {
    const res = await api.get<unknown>('/invoices/clients', undefined, {
      skipUnwrap: true,
    });
    return unwrapList<Client>(res);
  }

  async createClient(data: ClientInput): Promise<Client> {
    const res = await api.post<unknown>('/invoices/clients', clean({...data}));
    return unwrapOne<Client>(res);
  }

  // ── Form helpers ─────────────────────────────────────────────────────────────

  // The modal captures the client inline (name + email) rather than picking an
  // existing record, but the backend's create-invoice contract requires a
  // clientId. Reuse a matching client (by email, case-insensitive) or create a
  // new one, then create the invoice.
  async createFromForm(form: InvoiceFormData, send: boolean): Promise<Invoice> {
    const clientId = await this.resolveClientId(
      form.clientName,
      form.clientEmail,
    );

    const invoice = await this.createInvoice({
      clientId,
      currency: form.currency,
      // Send local calendar dates as UTC-midnight instants.
      issueDate: `${form.issueDate}T00:00:00.000Z`,
      dueDate: `${form.dueDate}T00:00:00.000Z`,
      lineItems: form.lineItems,
      notes: form.notes,
    });

    if (send) {
      // The invoice already exists as a draft; if the email fails it stays a
      // draft rather than being lost, and the caller surfaces the error.
      return this.sendInvoice(invoice.id);
    }
    return invoice;
  }

  // Edit an existing (draft) invoice from the modal. The client can't change
  // after creation, so only the editable fields are sent — never clientId,
  // which the backend's UpdateInvoiceDto forbids.
  async updateFromForm(
    id: string,
    form: InvoiceFormData,
    send: boolean,
  ): Promise<Invoice> {
    const invoice = await this.updateInvoice(id, {
      currency: form.currency,
      issueDate: `${form.issueDate}T00:00:00.000Z`,
      dueDate: `${form.dueDate}T00:00:00.000Z`,
      lineItems: form.lineItems,
      notes: form.notes,
    });

    if (send) {
      return this.sendInvoice(invoice.id);
    }
    return invoice;
  }

  private async resolveClientId(name: string, email: string): Promise<string> {
    const clients = await this.getClients();
    const match = clients.find(
      (c) => c.email.trim().toLowerCase() === email.trim().toLowerCase(),
    );
    if (match) return match.id;
    const created = await this.createClient({name, email});
    return created.id;
  }
}

export const invoiceService = new InvoiceService();
