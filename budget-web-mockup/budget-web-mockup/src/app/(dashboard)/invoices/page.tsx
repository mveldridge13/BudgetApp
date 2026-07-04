'use client';

import {useMemo, useRef, useState, useEffect} from 'react';
import {createPortal} from 'react-dom';
import {
  Plus,
  Search,
  Filter as FilterIcon,
  Download,
  Clock,
  DollarSign,
  AlertCircle,
  FileText,
  Send,
  CheckCircle2,
  MoreVertical,
  Check,
  Ban,
  Trash2,
} from 'lucide-react';
import {useInvoices, deriveInvoiceStatus} from '@/hooks/useInvoices';
import {useAuth} from '@/contexts/AuthContext';
import InvoiceModal from '@/components/invoices/InvoiceModal';
import {Spinner} from '@/components/ui';
import {formatCurrency, formatDate} from '@/lib/formatters';
import type {Invoice, InvoiceFormData, InvoiceStatus} from '@/types';

const TABS: {id: 'ALL' | InvoiceStatus; label: string}[] = [
  {id: 'ALL', label: 'All'},
  {id: 'DRAFT', label: 'Draft'},
  {id: 'SENT', label: 'Sent'},
  {id: 'PAID', label: 'Paid'},
  {id: 'OVERDUE', label: 'Overdue'},
];

// Visual treatment per derived status, matching the mockup pills.
const STATUS_STYLE: Record<
  InvoiceStatus,
  {label: string; bg: string; text: string; icon: React.ReactNode}
> = {
  PAID: {
    label: 'Paid',
    bg: 'bg-green-50',
    text: 'text-green-700',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  SENT: {
    label: 'Sent',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: <Send className="w-3.5 h-3.5" />,
  },
  OVERDUE: {
    label: 'Overdue',
    bg: 'bg-red-50',
    text: 'text-red-700',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  DRAFT: {
    label: 'Draft',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    icon: <FileText className="w-3.5 h-3.5" />,
  },
  CANCELED: {
    label: 'Canceled',
    bg: 'bg-gray-100',
    text: 'text-gray-400',
    icon: <FileText className="w-3.5 h-3.5" />,
  },
};

function StatusBadge({status}: {status: InvoiceStatus}) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.icon}
      {s.label}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  valueColor = 'text-gray-900',
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const {user} = useAuth();
  const currency = user?.currency || 'USD';
  const {
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
  } = useInvoices();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'ALL' | InvoiceStatus>('ALL');
  // The row action menu renders in a portal (fixed-positioned) so it escapes
  // the table's `overflow-x-auto` wrapper — otherwise opening it would force a
  // scrollbar on that container (overflow-x:auto coerces overflow-y to auto).
  const [menu, setMenu] = useState<{
    id: string;
    top: number;
    right: number;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenuFor = (id: string, trigger: HTMLElement) => {
    if (menu?.id === id) {
      setMenu(null);
      return;
    }
    const r = trigger.getBoundingClientRect();
    setMenu({id, top: r.bottom + 6, right: window.innerWidth - r.right});
  };

  // Close the row action menu on outside click or scroll.
  useEffect(() => {
    if (!menu) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (menuRef.current?.contains(target)) return;
      if (target.closest('[data-invoice-menu-trigger]')) return;
      setMenu(null);
    };
    const onScroll = () => setMenu(null);
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [menu]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      const status = deriveInvoiceStatus(inv);
      if (tab !== 'ALL' && status !== tab) return false;
      if (!q) return true;
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.client?.name.toLowerCase().includes(q) ||
        inv.client?.email.toLowerCase().includes(q)
      );
    });
  }, [invoices, search, tab]);

  const handleExport = () => {
    const header = [
      'Invoice',
      'Client',
      'Email',
      'Status',
      'Issue Date',
      'Due Date',
      'Total',
    ];
    const rows = filtered.map((inv) => [
      inv.invoiceNumber,
      inv.client?.name ?? '',
      inv.client?.email ?? '',
      deriveInvoiceStatus(inv),
      inv.issueDate.split('T')[0],
      inv.dueDate.split('T')[0],
      inv.total.toFixed(2),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runAction = async (fn: () => Promise<unknown>, id: string) => {
    setMenu(null);
    setBusyId(id);
    try {
      await fn();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed. Try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (inv: Invoice) => {
    if (
      !confirm(
        `Delete ${inv.invoiceNumber}? This can't be undone.`,
      )
    ) {
      return;
    }
    runAction(() => deleteInvoice(inv.id), inv.id);
  };

  // Sent invoices can't be deleted (DELETE is draft-only) — they're voided:
  // status → CANCELED, number kept, client emailed a cancellation notice.
  const handleVoid = (inv: Invoice) => {
    if (
      !confirm(
        `Void ${inv.invoiceNumber}? This cancels the invoice and emails ${inv.client?.name ?? 'the client'} a cancellation notice. The invoice number is kept.`,
      )
    ) {
      return;
    }
    runAction(() => voidInvoice(inv.id), inv.id);
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  // Clicking a row opens the invoice — editable for drafts, read-only otherwise
  // (the modal decides based on status).
  const openInvoice = (inv: Invoice) => {
    setMenu(null);
    setEditing(inv);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSave = (data: InvoiceFormData, send: boolean) =>
    editing
      ? updateInvoice(editing.id, data, send)
      : createInvoice(data, send);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-1">
            Create and manage invoices for your freelance work.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="self-start text-white px-4 py-2 text-sm sm:px-5 sm:py-2.5 sm:text-base rounded-xl font-medium flex items-center gap-2 transition-all hover:shadow-lg shrink-0"
          style={{
            backgroundColor: '#6366f1',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)',
          }}>
          <Plus className="w-5 h-5" />
          <span>New Invoice</span>
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Outstanding"
          value={formatCurrency(stats.outstanding, currency)}
          icon={<Clock className="w-5 h-5" />}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
        />
        <StatCard
          label="Paid (YTD)"
          value={formatCurrency(stats.paidYtd, currency)}
          icon={<DollarSign className="w-5 h-5" />}
          iconBg="bg-green-50"
          iconColor="text-green-500"
          valueColor="text-green-600"
        />
        <StatCard
          label="Overdue"
          value={String(stats.overdueCount)}
          icon={<AlertCircle className="w-5 h-5" />}
          iconBg="bg-red-50"
          iconColor="text-red-500"
          valueColor="text-red-600"
        />
        <StatCard
          label="Total Invoices"
          value={String(stats.totalInvoices)}
          icon={<FileText className="w-5 h-5" />}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p>{error}</p>
          <button
            onClick={refresh}
            className="mt-2 text-sm font-medium text-red-600 hover:text-red-500">
            Retry
          </button>
        </div>
      )}

      {/* List card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoices..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearch('')}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <FilterIcon className="w-4 h-4" />
              <span>Filter</span>
            </button>
            <button
              onClick={handleExport}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 inline-flex bg-gray-50 rounded-lg p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="mt-4 overflow-x-auto">
          {isLoading && invoices.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-indigo-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {invoices.length === 0
                  ? 'No invoices yet'
                  : 'No matching invoices'}
              </h3>
              <p className="text-gray-500 mt-1">
                {invoices.length === 0
                  ? 'Create your first invoice to start getting paid.'
                  : 'Try a different search or filter.'}
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">Invoice</th>
                  <th className="pb-3 font-medium">Client</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Due Date</th>
                  <th className="pb-3 font-medium text-right">Amount</th>
                  <th className="pb-3 font-medium w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const status = deriveInvoiceStatus(inv);
                  const isBusy = busyId === inv.id;
                  const canSend = status === 'DRAFT';
                  const canPay = status === 'SENT' || status === 'OVERDUE';
                  // DELETE is draft-only on the backend; sent/overdue invoices
                  // are voided instead. Paid/canceled have neither.
                  const canDelete = status === 'DRAFT';
                  const canVoid = status === 'SENT' || status === 'OVERDUE';
                  const hasActions = canSend || canPay || canDelete || canVoid;
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => openInvoice(inv)}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors cursor-pointer">
                      <td className="py-4 pr-4 font-semibold text-gray-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-4 pr-4">
                        <p className="font-medium text-gray-900">
                          {inv.client?.name ?? '—'}
                        </p>
                        <p className="text-sm text-gray-400">
                          {inv.client?.email ?? ''}
                        </p>
                      </td>
                      <td className="py-4 pr-4">
                        <StatusBadge status={status} />
                      </td>
                      <td className="py-4 pr-4 text-gray-600">
                        {formatDate(inv.dueDate)}
                      </td>
                      <td className="py-4 pl-4 text-right font-bold text-gray-900">
                        {formatCurrency(inv.total, currency)}
                      </td>
                      <td
                        className="py-4 pl-2 text-right"
                        onClick={(e) => e.stopPropagation()}>
                        {isBusy ? (
                          <Spinner size="sm" />
                        ) : hasActions ? (
                          <button
                            data-invoice-menu-trigger
                            onClick={(e) => openMenuFor(inv.id, e.currentTarget)}
                            aria-label="Invoice actions"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        ) : null}
                        {menu?.id === inv.id &&
                          createPortal(
                            <div
                              ref={menuRef}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'fixed',
                                top: menu.top,
                                right: menu.right,
                              }}
                              className="z-50 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 text-left">
                              {canSend && (
                                <button
                                  onClick={() =>
                                    runAction(() => sendInvoice(inv.id), inv.id)
                                  }
                                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                                  <Send className="w-4 h-4 text-gray-400" />
                                  Send invoice
                                </button>
                              )}
                              {canPay && (
                                <button
                                  onClick={() =>
                                    runAction(() => markPaid(inv.id), inv.id)
                                  }
                                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                                  <Check className="w-4 h-4 text-gray-400" />
                                  Mark as paid
                                </button>
                              )}
                              {canVoid && (
                                <button
                                  onClick={() => handleVoid(inv)}
                                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50">
                                  <Ban className="w-4 h-4" />
                                  Void invoice
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(inv)}
                                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              )}
                            </div>,
                            document.body,
                          )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <InvoiceModal
        visible={modalOpen}
        onClose={closeModal}
        onSave={handleSave}
        currency={currency}
        invoice={editing}
      />
    </div>
  );
}
