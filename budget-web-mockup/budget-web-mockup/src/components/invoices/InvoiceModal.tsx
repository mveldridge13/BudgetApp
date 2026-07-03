'use client';

import {useEffect, useMemo, useState} from 'react';
import {X, Plus, Trash2, Send} from 'lucide-react';
import {DatePicker} from '@/components/ui';
import {formatCurrency} from '@/lib/formatters';
import type {Invoice, InvoiceFormData, InvoiceLineItemInput} from '@/types';

interface InvoiceModalProps {
  visible: boolean;
  onClose: () => void;
  // `send` is true when the user chose "Send Invoice", false for a plain save.
  onSave: (data: InvoiceFormData, send: boolean) => Promise<unknown>;
  currency?: string;
  // When set, the modal opens on an existing invoice: editable if it's still a
  // DRAFT, otherwise read-only (the backend locks sent/paid invoices).
  invoice?: Invoice | null;
}

interface LineItemForm {
  description: string;
  quantity: string;
  unitPrice: string;
}

// Default tax rate (%) a new invoice opens with — the user can change it or
// clear it to 0 (no tax). Applied as a flat per-line taxRate on submit.
const DEFAULT_TAX_RATE = '10';

const EMPTY_ITEM: LineItemForm = {description: '', quantity: '1', unitPrice: ''};

const labelClass =
  'text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block';
const inputClass =
  'w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all border-gray-300 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

const toNum = (v: string): number => {
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
};

// Backend line-item quantity/unitPrice are Decimal(_, 2) — keep values within
// 2 dp so fractional hours (e.g. 2.5) submit cleanly instead of 400-ing.
const round2 = (n: number): number => Math.round(n * 100) / 100;

// The API client throws plain ApiError objects ({message, statusCode}), not
// Error instances, so pull a readable message out of whatever we catch.
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object') {
    const e = err as {message?: unknown; statusCode?: unknown};
    if (e.statusCode === 404) {
      return 'The invoices service isn’t available yet. Please try again later.';
    }
    if (typeof e.message === 'string' && e.message) return e.message;
  }
  return 'Failed to save the invoice. Please try again.';
}

export default function InvoiceModal({
  visible,
  onClose,
  onSave,
  currency = 'USD',
  invoice = null,
}: InvoiceModalProps) {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [items, setItems] = useState<LineItemForm[]>([{...EMPTY_ITEM}]);
  const [taxRate, setTaxRate] = useState(DEFAULT_TAX_RATE);
  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<null | 'draft' | 'send'>(null);

  const isEdit = !!invoice;
  // Only drafts can be changed; anything else opens read-only.
  const readOnly = isEdit && invoice!.status !== 'DRAFT';
  // The client is fixed once an invoice exists (backend forbids changing it).
  const clientLocked = isEdit;

  useEffect(() => {
    if (!visible) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';

    if (invoice) {
      setClientName(invoice.client?.name ?? '');
      setClientEmail(invoice.client?.email ?? '');
      setItems(
        invoice.lineItems.length > 0
          ? invoice.lineItems.map((li) => ({
              description: li.description,
              quantity: String(li.quantity),
              unitPrice: String(li.unitPrice),
            }))
          : [{...EMPTY_ITEM}],
      );
      // Our create flow applies one flat rate to every line, so read it back
      // from the first line item.
      setTaxRate(
        invoice.lineItems.length > 0
          ? String(invoice.lineItems[0].taxRate)
          : DEFAULT_TAX_RATE,
      );
      setIssueDate(invoice.issueDate.split('T')[0]);
      setDueDate(invoice.dueDate.split('T')[0]);
    } else {
      setClientName('');
      setClientEmail('');
      setItems([{...EMPTY_ITEM}]);
      setTaxRate(DEFAULT_TAX_RATE);
      setIssueDate(todayISO());
      setDueDate('');
    }
    setErrors({});
    setSaving(null);
    return () => {
      document.body.style.overflow = '';
    };
  }, [visible, invoice]);

  const lineTotal = (item: LineItemForm): number =>
    toNum(item.quantity) * toNum(item.unitPrice);

  // Clamp to a sane 0–100% so the preview and payload stay in range.
  const taxRatePct = Math.min(Math.max(toNum(taxRate), 0), 100);

  const {subtotal, tax, total} = useMemo(() => {
    const sub = items.reduce((acc, item) => acc + lineTotal(item), 0);
    const t = (sub * taxRatePct) / 100;
    return {subtotal: sub, tax: t, total: sub + t};
  }, [items, taxRatePct]);

  const updateItem = (index: number, field: keyof LineItemForm, value: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? {...item, [field]: value} : item)),
    );
  };

  const addItem = () => setItems((prev) => [...prev, {...EMPTY_ITEM}]);
  const removeItem = (index: number) =>
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index),
    );

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!clientName.trim()) next.clientName = 'Client name is required';
    if (!clientEmail.trim()) {
      next.clientEmail = 'Client email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim())) {
      next.clientEmail = 'Enter a valid email';
    }
    const validItems = items.filter(
      (i) => i.description.trim() && toNum(i.quantity) > 0,
    );
    if (validItems.length === 0) {
      next.items = 'Add at least one item with a description and quantity';
    }
    if (!issueDate) next.issueDate = 'Issue date is required';
    if (!dueDate) next.dueDate = 'Due date is required';
    if (issueDate && dueDate && dueDate < issueDate) {
      next.dueDate = 'Due date must be on or after the issue date';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = (): InvoiceFormData => {
    const lineItems: InvoiceLineItemInput[] = items
      .filter((i) => i.description.trim() && toNum(i.quantity) > 0)
      .map((i) => ({
        description: i.description.trim(),
        quantity: round2(toNum(i.quantity)),
        unitPrice: round2(toNum(i.unitPrice)),
        taxRate: taxRatePct,
      }));
    return {
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      issueDate,
      dueDate,
      lineItems,
      currency,
    };
  };

  const handleSubmit = async (send: boolean) => {
    if (!validate()) return;
    try {
      setSaving(send ? 'send' : 'draft');
      await onSave(buildPayload(), send);
      onClose();
    } catch (err) {
      const message = extractErrorMessage(err);
      console.error('Failed to save invoice:', message, err);
      setErrors({submit: message});
    } finally {
      setSaving(null);
    }
  };

  if (!visible) return null;

  const title = !isEdit
    ? 'Create Invoice'
    : readOnly
      ? invoice!.invoiceNumber
      : `Edit ${invoice!.invoiceNumber}`;
  const subtitle = !isEdit
    ? 'Create a new invoice to send to your client.'
    : readOnly
      ? `${invoice!.status.charAt(0) + invoice!.status.slice(1).toLowerCase()} — this invoice can no longer be edited.`
      : 'Draft — make your changes below.';

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Client */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Client Name</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                disabled={readOnly || clientLocked}
                placeholder="Enter client name"
                className={`${inputClass} ${
                  errors.clientName ? 'border-red-300' : ''
                }`}
              />
              {errors.clientName && (
                <p className="mt-1.5 text-sm text-red-600">
                  {errors.clientName}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Client Email</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                disabled={readOnly || clientLocked}
                placeholder="client@example.com"
                className={`${inputClass} ${
                  errors.clientEmail ? 'border-red-300' : ''
                }`}
              />
              {errors.clientEmail && (
                <p className="mt-1.5 text-sm text-red-600">
                  {errors.clientEmail}
                </p>
              )}
            </div>
          </div>
          {clientLocked && !readOnly && (
            <p className="-mt-3 text-xs text-gray-400">
              The client can’t be changed after an invoice is created.
            </p>
          )}

          {/* Line items */}
          <div>
            <label className={labelClass}>Invoice Items</label>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Column headers */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <span className="flex-1">Description</span>
                <span className="w-16 text-center">Qty/Hr</span>
                <span className="w-28 text-right">Price</span>
                <span className="w-24 text-right">Total</span>
                {!readOnly && <span className="w-6" />}
              </div>

              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 px-4 py-3 border-t border-gray-100">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, 'description', e.target.value)
                    }
                    disabled={readOnly}
                    placeholder="Service description"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                  />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, 'quantity', e.target.value)
                    }
                    disabled={readOnly}
                    className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(index, 'unitPrice', e.target.value)
                    }
                    disabled={readOnly}
                    placeholder="0.00"
                    className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="w-24 text-right text-sm font-semibold text-gray-900">
                    {formatCurrency(lineTotal(item), currency)}
                  </span>
                  {!readOnly && (
                    <button
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      aria-label="Remove item"
                      className="w-6 flex items-center justify-center text-gray-300 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-300 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {!readOnly && (
                <button
                  onClick={addItem}
                  className="flex items-center gap-2 w-full px-4 py-3 border-t border-gray-100 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors">
                  <Plus className="w-4 h-4" />
                  <span>Add Item</span>
                </button>
              )}
            </div>
            {errors.items && (
              <p className="mt-1.5 text-sm text-red-600">{errors.items}</p>
            )}
            {!readOnly && (
              <p className="mt-2 text-xs text-gray-400">
                Billing hourly? Enter hours as Qty and your hourly rate as Price.
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Issue Date</label>
              <DatePicker
                value={issueDate}
                onChange={setIssueDate}
                disabled={readOnly}
                error={!!errors.issueDate}
              />
              {errors.issueDate && (
                <p className="mt-1.5 text-sm text-red-600">
                  {errors.issueDate}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Due Date</label>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                disabled={readOnly}
                min={issueDate || undefined}
                error={!!errors.dueDate}
              />
              {errors.dueDate && (
                <p className="mt-1.5 text-sm text-red-600">{errors.dueDate}</p>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl p-5 space-y-2.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(subtotal, currency)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <span>Tax</span>
                {readOnly ? (
                  <span>({taxRatePct}%)</span>
                ) : (
                  <span className="relative inline-flex items-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      aria-label="Tax rate percentage"
                      className="w-16 pl-2 pr-5 py-1 border border-gray-300 rounded-md text-sm text-right bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="absolute right-2 text-gray-400 pointer-events-none">
                      %
                    </span>
                  </span>
                )}
              </span>
              <span className="font-medium text-gray-900">
                {formatCurrency(tax, currency)}
              </span>
            </div>
            <div className="flex justify-between pt-2.5 border-t border-gray-200">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-gray-900">
                {formatCurrency(total, currency)}
              </span>
            </div>
          </div>

          {errors.submit && (
            <p className="text-sm text-red-600 text-center">{errors.submit}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          {readOnly ? (
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-medium text-white transition-all hover:shadow-lg"
              style={{backgroundColor: '#6366f1'}}>
              Close
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={saving !== null}
                className="px-4 py-2.5 rounded-xl font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={saving !== null}
                className="px-4 py-2.5 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50">
                {saving === 'draft'
                  ? 'Saving…'
                  : isEdit
                    ? 'Save Changes'
                    : 'Save as Draft'}
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={saving !== null}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white transition-all hover:shadow-lg disabled:opacity-60"
                style={{backgroundColor: '#6366f1'}}>
                <Send className="w-4 h-4" />
                <span>{saving === 'send' ? 'Sending…' : 'Send Invoice'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
