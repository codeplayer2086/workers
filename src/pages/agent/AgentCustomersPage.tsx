import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  History,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Trash2,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { SendCvWhatsAppModal } from '../../components/cv/SendCvWhatsAppModal';
import { apiFetch } from '../../lib/api';
import {
  formatNormalizedPhoneDisplay,
  normalizeWhatsAppPhone,
  WHATSAPP_COUNTRY_CODES,
} from '../../lib/whatsapp-utils';
import type { AgentCustomerItem } from '../../types/portal';

type StatusFilter = 'ALL' | 'VERIFIED' | 'NOT_REGISTERED' | 'UNVERIFIED';

export function AgentCustomersPage() {
  const [customers, setCustomers] = useState<AgentCustomerItem[]>([]);
  const [gatewayConfigured, setGatewayConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Add Customer Form State
  const [fullName, setFullName] = useState('');
  const [countryCode, setCountryCode] = useState('+966');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastVerificationBanner, setLastVerificationBanner] = useState<{
    customerName: string;
    phoneDisplay: string;
    status: 'VERIFIED' | 'NOT_REGISTERED' | 'UNVERIFIED';
    warning: string | null;
  } | null>(null);

  // Search, Filter & Row Actions
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // History Drawer & Send CV Modal
  const [historyCustomerId, setHistoryCustomerId] = useState<string | null>(null);
  const [sendModalCustomerIds, setSendModalCustomerIds] = useState<string[] | null>(null);

  const loadCustomers = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiFetch<{
        gateway: { configured: boolean };
        customers: AgentCustomerItem[];
      }>('/api/whatsapp/customers');
      setCustomers(res.customers);
      setGatewayConfigured(res.gateway.configured);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load customer directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCustomers();
  }, []);

  const normalizedPreview = useMemo(() => {
    if (!phoneNumber.trim()) return null;
    try {
      const normalized = normalizeWhatsAppPhone(countryCode, phoneNumber);
      return formatNormalizedPhoneDisplay(countryCode, normalized);
    } catch {
      return null;
    }
  }, [countryCode, phoneNumber]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setActionFeedback(null);
    setLastVerificationBanner(null);
    setSubmitting(true);

    try {
      const res = await apiFetch<{
        customer: AgentCustomerItem;
        whatsappStatus: 'VERIFIED' | 'NOT_REGISTERED' | 'UNVERIFIED';
        gatewayWarning: string | null;
      }>('/api/whatsapp/customers', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          countryCode,
          phoneNumber: phoneNumber.trim(),
          notes: notes.trim() || null,
        }),
      });

      setCustomers((prev) => [res.customer, ...prev]);
      setLastVerificationBanner({
        customerName: res.customer.fullName,
        phoneDisplay: formatNormalizedPhoneDisplay(
          res.customer.countryCode,
          res.customer.phoneNumber
        ),
        status: res.whatsappStatus,
        warning: res.gatewayWarning,
      });

      setFullName('');
      setPhoneNumber('');
      setNotes('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add householder');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverify = async (customer: AgentCustomerItem) => {
    setVerifyingId(customer.id);
    setActionFeedback(null);
    try {
      const res = await apiFetch<{ customer: AgentCustomerItem }>(
        `/api/whatsapp/customers/${customer.id}/verify`,
        { method: 'POST' }
      );
      setCustomers((prev) =>
        prev.map((row) =>
          row.id === customer.id
            ? { ...res.customer, shareLogs: row.shareLogs }
            : row
        )
      );
      setActionFeedback({
        type: res.customer.whatsappStatus === 'VERIFIED' ? 'success' : 'error',
        message:
          res.customer.whatsappStatus === 'VERIFIED'
            ? `${customer.fullName} is Verified on WhatsApp.`
            : `${customer.fullName} is Not Registered on WhatsApp.`,
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Re-verification failed',
      });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async (customer: AgentCustomerItem) => {
    setDeletingId(customer.id);
    setActionFeedback(null);
    try {
      await apiFetch(`/api/whatsapp/customers/${customer.id}`, { method: 'DELETE' });
      setCustomers((prev) => prev.filter((row) => row.id !== customer.id));
      if (historyCustomerId === customer.id) {
        setHistoryCustomerId(null);
      }
      setActionFeedback({
        type: 'success',
        message: `Removed ${customer.fullName} from your private directory.`,
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to delete customer',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const counts = useMemo(
    () => ({
      ALL: customers.length,
      VERIFIED: customers.filter((c) => c.whatsappStatus === 'VERIFIED').length,
      NOT_REGISTERED: customers.filter((c) => c.whatsappStatus === 'NOT_REGISTERED').length,
      UNVERIFIED: customers.filter((c) => c.whatsappStatus === 'UNVERIFIED').length,
    }),
    [customers]
  );

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (statusFilter !== 'ALL' && c.whatsappStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.phoneNumber.includes(q) ||
        (c.notes || '').toLowerCase().includes(q)
      );
    });
  }, [customers, search, statusFilter]);

  const historyCustomer = useMemo(
    () => customers.find((c) => c.id === historyCustomerId) ?? null,
    [customers, historyCustomerId]
  );

  return (
    <DashboardShell
      title="My Householder Customers"
      breadcrumb="Agent / Private Directory & WhatsApp Sharing"
      primaryAction={
        <Link
          to="/agent/candidates"
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          Browse Candidates
        </Link>
      }
    >
      <div className="space-y-6">
        {!gatewayConfigured && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-3.5 text-xs text-amber-950"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <p className="font-semibold">Central WhatsApp Gateway Is Not Connected Yet</p>
              <p className="mt-0.5 text-amber-900">
                You can still save householder contacts here. Once{' '}
                <span className="font-mono-tabular font-semibold">WHATSAPP_GATEWAY_URL</span>,{' '}
                <span className="font-mono-tabular font-semibold">WHATSAPP_GATEWAY_API_KEY</span>,
                and{' '}
                <span className="font-mono-tabular font-semibold">WHATSAPP_CENTRAL_INSTANCE</span>{' '}
                are set on the server, click <span className="font-semibold">Re-verify</span> and{' '}
                <span className="font-semibold">Send CV</span>.
              </p>
            </div>
          </div>
        )}

        {/* Top Summary Stats Strip */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Private Contacts</p>
            <p className="mt-1 font-mono-tabular text-2xl font-bold text-slate-900">
              {counts.ALL}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">WhatsApp Verified</p>
            <p className="mt-1 font-mono-tabular text-2xl font-bold text-emerald-700">
              {counts.VERIFIED}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Not Registered</p>
            <p className="mt-1 font-mono-tabular text-2xl font-bold text-red-700">
              {counts.NOT_REGISTERED}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Total CVs Dispatched</p>
            <p className="mt-1 font-mono-tabular text-2xl font-bold text-sky-700">
              {customers.reduce(
                (acc, c) => acc + c.shareLogs.filter((l) => l.status === 'SENT').length,
                0
              )}
            </p>
          </div>
        </section>

        {/* Add Householder & Auto-Verify Card */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-900">
                <UserPlus className="h-4 w-4 text-sky-600" />
                <span>Add Householder & Auto-Verify WhatsApp</span>
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Contacts saved here are strictly private to your agent account. Verification runs
                automatically via the platform&apos;s central WhatsApp sender.
              </p>
            </div>
          </div>

          {lastVerificationBanner && (
            <div
              role="status"
              className={`mt-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-xs ${
                lastVerificationBanner.status === 'VERIFIED'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : lastVerificationBanner.status === 'NOT_REGISTERED'
                    ? 'border-red-200 bg-red-50 text-red-900'
                    : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {lastVerificationBanner.status === 'VERIFIED' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : lastVerificationBanner.status === 'NOT_REGISTERED' ? (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                )}
                <div>
                  <p className="font-semibold">
                    {lastVerificationBanner.customerName} (
                    <span className="font-mono-tabular">{lastVerificationBanner.phoneDisplay}</span>
                    ) —{' '}
                    {lastVerificationBanner.status === 'VERIFIED'
                      ? 'Verified on WhatsApp'
                      : lastVerificationBanner.status === 'NOT_REGISTERED'
                        ? 'Not Registered on WhatsApp'
                        : 'Saved as Unverified'}
                  </p>
                  {lastVerificationBanner.warning && (
                    <p className="mt-0.5">{lastVerificationBanner.warning}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLastVerificationBanner(null)}
                aria-label="Dismiss verification notice"
                className="rounded p-1 hover:bg-black/5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {formError && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800"
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleAddCustomer} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-3">
              <label htmlFor="cust-full-name" className="block text-xs font-semibold text-slate-700">
                Householder Full Name *
              </label>
              <input
                id="cust-full-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Abdullah Al-Mansoor"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <div className="md:col-span-3">
              <label
                htmlFor="cust-country-code"
                className="block text-xs font-semibold text-slate-700"
              >
                Country Code *
              </label>
              <select
                id="cust-country-code"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono-tabular text-xs text-slate-900"
              >
                {WHATSAPP_COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} · {c.country}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label htmlFor="cust-phone" className="block text-xs font-semibold text-slate-700">
                WhatsApp Number *
              </label>
              <input
                id="cust-phone"
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={
                  WHATSAPP_COUNTRY_CODES.find((c) => c.code === countryCode)?.example ||
                  '50 123 4567'
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-xs text-slate-900"
              />
              {normalizedPreview && (
                <p className="mt-1 font-mono-tabular text-[11px] text-slate-500">
                  Normalized: {normalizedPreview}
                </p>
              )}
            </div>

            <div className="md:col-span-3">
              <label htmlFor="cust-notes" className="block text-xs font-semibold text-slate-700">
                Family / Visa Notes (Optional)
              </label>
              <input
                id="cust-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Riyadh villa, baby care"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <div className="flex justify-end md:col-span-12">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>{submitting ? 'Verifying & Saving...' : 'Add & Verify on WhatsApp'}</span>
              </button>
            </div>
          </form>
        </section>

        {/* Searchable Customer Directory Table */}
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-base font-bold text-slate-900">
                Saved Householders
              </h2>
              <div
                role="group"
                aria-label="Filter customers by WhatsApp status"
                className="inline-flex max-w-full overflow-x-auto rounded-lg bg-slate-100 p-1"
              >
                {(
                  [
                    ['ALL', 'All'],
                    ['VERIFIED', 'Verified'],
                    ['NOT_REGISTERED', 'Not Registered'],
                    ['UNVERIFIED', 'Unverified'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(key)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                      statusFilter === key
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {label} ({counts[key]})
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, notes..."
                className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-xs"
              />
            </div>
          </div>

          {actionFeedback && (
            <div
              role="status"
              className={`border-b px-6 py-2.5 text-xs font-medium ${
                actionFeedback.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {actionFeedback.message}
            </div>
          )}

          {loadError && (
            <div role="alert" className="p-6 text-sm text-red-700">
              {loadError}
            </div>
          )}

          {loading ? (
            <div className="space-y-2 p-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              {customers.length === 0
                ? 'No householders added yet. Use the form above to add and verify your first customer.'
                : 'No householders match your search or status filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-6 py-3 font-semibold">Householder</th>
                    <th className="px-4 py-3 font-semibold">WhatsApp Number</th>
                    <th className="px-4 py-3 font-semibold">Verification Status</th>
                    <th className="px-4 py-3 text-right font-semibold">CVs Sent</th>
                    <th className="px-6 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((customer) => {
                    const sentCount = customer.shareLogs.filter((l) => l.status === 'SENT').length;
                    return (
                      <tr key={customer.id} className="hover:bg-slate-50/70">
                        <td className="px-6 py-3.5 align-top">
                          <p className="font-semibold text-slate-900">{customer.fullName}</p>
                          {customer.notes && (
                            <p className="mt-0.5 max-w-xs truncate text-[11px] text-slate-500">
                              {customer.notes}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 align-top font-mono-tabular text-slate-800 whitespace-nowrap">
                          {formatNormalizedPhoneDisplay(
                            customer.countryCode,
                            customer.phoneNumber
                          )}
                        </td>
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          {customer.whatsappStatus === 'VERIFIED' ? (
                            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Verified on WhatsApp
                            </span>
                          ) : customer.whatsappStatus === 'NOT_REGISTERED' ? (
                            <span className="inline-flex items-center gap-1.5 font-semibold text-red-700">
                              <XCircle className="h-3.5 w-3.5" />
                              Not Registered
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Unverified
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right align-top font-mono-tabular font-semibold text-slate-900">
                          {sentCount}
                        </td>
                        <td className="px-6 py-3.5 text-right align-top">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={customer.whatsappStatus !== 'VERIFIED'}
                              onClick={() => setSendModalCustomerIds([customer.id])}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap"
                            >
                              <Send className="h-3 w-3" />
                              <span>Send CV</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setHistoryCustomerId(customer.id)}
                              aria-label={`View CV history for ${customer.fullName}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                            >
                              <History className="h-3.5 w-3.5 text-slate-500" />
                              <span>History ({customer.shareLogs.length})</span>
                            </button>

                            <button
                              type="button"
                              disabled={verifyingId === customer.id}
                              onClick={() => handleReverify(customer)}
                              aria-label={`Re-verify ${customer.fullName}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
                            >
                              <RefreshCw
                                className={`h-3.5 w-3.5 ${
                                  verifyingId === customer.id ? 'animate-spin' : ''
                                }`}
                              />
                              <span>Re-verify</span>
                            </button>

                            <button
                              type="button"
                              disabled={deletingId === customer.id}
                              onClick={() => handleDelete(customer)}
                              aria-label={`Delete ${customer.fullName}`}
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Customer Sent-CV History Slide-Over Drawer */}
      {historyCustomer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`CV Share History for ${historyCustomer.fullName}`}
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/50"
          onClick={() => setHistoryCustomerId(null)}
        >
          <aside
            className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  {historyCustomer.fullName}
                </h3>
                <p className="font-mono-tabular text-xs text-slate-500">
                  {formatNormalizedPhoneDisplay(
                    historyCustomer.countryCode,
                    historyCustomer.phoneNumber
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryCustomerId(null)}
                aria-label="Close history drawer"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              {historyCustomer.notes && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">Notes: </span>
                  {historyCustomer.notes}
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-slate-700">
                  Dispatched Worker CVs ({historyCustomer.shareLogs.length})
                </h4>

                {historyCustomer.shareLogs.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-500">
                    No worker CVs have been sent to this householder yet.
                  </p>
                ) : (
                  <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {historyCustomer.shareLogs.map((log) => (
                      <div key={log.id} className="p-3.5 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link
                              to={`/agent/candidates/${log.workerId}`}
                              className="font-semibold text-slate-900 hover:text-sky-700"
                            >
                              {log.workerNameEn || log.workerId}
                            </Link>
                            <p className="mt-0.5 font-mono-tabular text-[11px] text-slate-500">
                              {log.workerCode} · {log.language} / {log.format}
                            </p>
                          </div>
                          {log.status === 'SENT' ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Sent
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                              <XCircle className="h-3.5 w-3.5" />
                              Failed
                            </span>
                          )}
                        </div>
                        {log.errorMsg && (
                          <p className="mt-1 text-[11px] text-red-700">{log.errorMsg}</p>
                        )}
                        <p className="mt-1 font-mono-tabular text-[11px] text-slate-400">
                          {new Date(log.sentAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-200 p-4">
              <button
                type="button"
                disabled={historyCustomer.whatsappStatus !== 'VERIFIED'}
                onClick={() => {
                  const id = historyCustomer.id;
                  setHistoryCustomerId(null);
                  setSendModalCustomerIds([id]);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send Candidate CV to {historyCustomer.fullName}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Send CV via WhatsApp Modal launched from Customer Row */}
      <SendCvWhatsAppModal
        isOpen={sendModalCustomerIds !== null}
        onClose={() => setSendModalCustomerIds(null)}
        preselectedCustomerIds={sendModalCustomerIds ?? []}
        onSent={() => {
          void loadCustomers();
        }}
      />
    </DashboardShell>
  );
}
