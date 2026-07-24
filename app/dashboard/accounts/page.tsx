"use client";

import {
  RiSearchLine,
  RiMoreFill,
  RiRefreshLine,
  RiFileCopyLine,
  RiCheckLine,
  RiBankLine,
  RiShieldCheckLine,
  RiTimeLine,
  RiAlertLine,
} from "react-icons/ri";
import { Table } from "@heroui/react";
import { useState, useEffect, useCallback } from "react";
import clsx from "clsx";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
interface BusinessAccount {
  id: string;
  account_number: string;
  account_name: string;
  bank_name: string;
  bank_code: string;
  currency: string;
  tier: string;
  tier_label: string;
  status: string;
  daily_limit: number | null;
  max_transaction_limit: number | null;
  activated_at: string | null;
}

interface CustomerAccount {
  id: string;
  account_ref: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  account_number: string;
  account_name: string;
  bank_name: string;
  bank_code: string;
  currency: string;
  type: "static" | "dynamic";
  tier: string;
  status: string;
  is_expired: boolean;
  expires_at: string | null;
  provider: string;
  is_default: boolean;
  created_at: string;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
function formatDate(dateString: string): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number | null): string {
  if (!amount) return "Unlimited";
  return "₦" + new Intl.NumberFormat("en-NG").format(amount);
}

// ─────────────────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────────────────
function StatusBadge({
  status,
  isExpired,
}: {
  status: string;
  isExpired?: boolean;
}) {
  if (isExpired) {
    return (
      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        Expired
      </span>
    );
  }
  const styles: Record<string, string> = {
    active: "bg-green-50 text-green-600",
    inactive: "bg-gray-100 text-gray-500",
    suspended: "bg-red-50 text-red-600",
    pending_activation: "bg-amber-50 text-amber-600",
    failed_creation: "bg-red-50 text-red-600",
    expired: "bg-gray-100 text-gray-500",
  };
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-500"}`}
    >
      {status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// Type Badge
// ─────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={clsx(
        "inline-flex px-2.5 py-1 rounded-full text-xs font-medium",
        type === "static"
          ? "bg-blue-50 text-blue-600"
          : "bg-purple-50 text-purple-600",
      )}
    >
      {type === "static" ? "Static" : "Dynamic"}
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// Copy Button
// ─────────────────────────────────────────────────────────
function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-gray-400 hover:text-gray-700 transition-colors"
      title={`Copy ${label ?? value}`}
    >
      {copied ? (
        <RiCheckLine size={14} className="text-green-500" />
      ) : (
        <RiFileCopyLine size={14} />
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// Business Account Card
// ─────────────────────────────────────────────────────────
function BusinessAccountCard({
  account,
  verificationStatus,
}: {
  account: BusinessAccount | null;
  verificationStatus: string;
}) {
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopyAll = async () => {
    if (!account) return;
    await navigator.clipboard.writeText(
      `Bank: ${account.bank_name}\nAccount Name: ${account.account_name}\nAccount Number: ${account.account_number}`,
    );
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const isVerified = verificationStatus === "verified";

  // ── Not verified ───────────────────────────────────────
  if (!isVerified) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 border border-gray-200 rounded-2xl text-center">
        <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <RiShieldCheckLine size={20} className="text-gray-500" />
        </div>
        <h3 className="font-medium text-gray-900 mb-1">
          Account not assigned yet
        </h3>
        <p className="text-sm text-gray-500 max-w-sm leading-relaxed mb-5">
          Your dedicated bank account will be assigned once your business
          verification is approved.
        </p>
        <div className="inline-flex items-center gap-1.5 text-sm text-gray-600 mb-1">
          {verificationStatus === "under_review" ? (
            <RiTimeLine size={15} />
          ) : (
            <RiAlertLine size={15} />
          )}
          {verificationStatus === "under_review"
            ? "Verification under review"
            : verificationStatus === "rejected"
              ? "Verification rejected — resubmit to continue"
              : "Verification required"}
        </div>
        {verificationStatus !== "under_review" && (
          <a
            href="/dashboard/settings?completeVerification=true"
            className="mt-4 px-5 py-2 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Complete verification
          </a>
        )}
      </div>
    );
  }

  // ── Verified but no account yet ────────────────────────
  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 border border-gray-200 rounded-2xl text-center">
        <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <RiTimeLine size={20} className="text-gray-500" />
        </div>
        <h3 className="font-medium text-gray-900 mb-1">Account being set up</h3>
        <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
          Your business is verified. Your account will appear here shortly.
        </p>
      </div>
    );
  }

  // ── Account card ───────────────────────────────────────
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <RiBankLine size={18} className="text-gray-400" />
          <p className="text-sm font-medium text-gray-900">
            {account.bank_name}
          </p>
        </div>
        <span
          className={clsx(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            account.status === "active"
              ? "text-green-700 bg-green-50"
              : "text-red-700 bg-red-50",
          )}
        >
          {account.status === "active" ? "Active" : account.status}
        </span>
      </div>

      {/* Account number — the hero */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-2xl font-semibold text-gray-900 tracking-wide font-mono">
          {account.account_number}
        </p>
        <CopyButton value={account.account_number} label="account number" />
      </div>

      {/* Details */}
      <div className="space-y-3 text-sm mb-6">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Account name</span>
          <div className="flex items-center gap-2">
            <span className="text-gray-900">{account.account_name}</span>
            <CopyButton value={account.account_name} label="account name" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Daily limit</span>
          <span className="text-gray-900">
            {formatCurrency(account.daily_limit)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Max per transaction</span>
          <span className="text-gray-900">
            {formatCurrency(account.max_transaction_limit)}
          </span>
        </div>
      </div>

      {/* Copy all */}
      <button
        onClick={handleCopyAll}
        className="w-full py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
      >
        {copiedAll ? (
          <>
            <RiCheckLine size={14} className="text-green-500" />
            <span className="text-green-600">Copied</span>
          </>
        ) : (
          <>
            <RiFileCopyLine size={14} />
            Copy all details
          </>
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────
export default function AccountsPage() {
  // ── Business account state ─────────────────────────────
  const [businessAccount, setBusinessAccount] =
    useState<BusinessAccount | null>(null);
  const [verificationStatus, setVerificationStatus] =
    useState<string>("unverified");
  const [businessLoading, setBusinessLoading] = useState(true);

  // ── Customer accounts state ────────────────────────────
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "static" | "dynamic">(
    "all",
  );

  // ── Active tab ─────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"business" | "customers">(
    "business",
  );

  // ── Fetch business account ─────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/accounts/business");
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const json = await res.json();
        if (!res.ok) throw new Error(json.message);
        setBusinessAccount(json.data?.business_account ?? null);
        setVerificationStatus(json.data?.verification_status ?? "unverified");
      } catch (e) {
        console.error(e);
      } finally {
        setBusinessLoading(false);
      }
    })();
  }, []);

  // ── Debounce search ────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ── Fetch customer accounts ────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        per_page: "20",
        type: typeFilter,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/accounts/customers?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setCustomers(json.data?.accounts?.data ?? []);
      setMeta(json.data?.meta ?? null);
    } catch (e) {
      console.error(e);
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  }, [currentPage, debouncedSearch, typeFilter]);

  useEffect(() => {
    if (activeTab === "customers") fetchCustomers();
  }, [fetchCustomers, activeTab]);

  const totalPages = meta?.last_page ?? 1;

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="w-full flex flex-col items-center pt-5 sm:pt-8 pb-10">
      <div className="max-w-310 w-full flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Accounts
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your business account and customer virtual accounts
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {(
            [
              { id: "business", label: "My Business Account" },
              { id: "customers", label: "Customer Accounts" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "px-5 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Business Account Tab ─────────────────────── */}
        {activeTab === "business" && (
          <div className="max-w-lg">
            {businessLoading ? (
              <div className="flex items-center justify-center py-16">
                <RiRefreshLine
                  className="animate-spin text-gray-400"
                  size={28}
                />
              </div>
            ) : (
              <BusinessAccountCard
                account={businessAccount}
                verificationStatus={verificationStatus}
              />
            )}
          </div>
        )}

        {/* ── Customer Accounts Tab ────────────────────── */}
        {activeTab === "customers" && (
          <div className="flex flex-col gap-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              <div className="relative w-full sm:max-w-sm">
                <RiSearchLine
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by name, email, account number..."
                  className="pl-9 pr-4 py-2 rounded-full bg-white border border-gray-200 focus:border-gray-400 outline-none text-sm w-full"
                />
              </div>

              <div className="flex items-center gap-2">
                {(["all", "static", "dynamic"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTypeFilter(t);
                      setCurrentPage(1);
                    }}
                    className={clsx(
                      "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                      typeFilter === t
                        ? "bg-gray-900 text-white"
                        : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    {t === "all"
                      ? "All"
                      : t === "static"
                        ? "Static"
                        : "Dynamic"}
                  </button>
                ))}
                <button
                  onClick={fetchCustomers}
                  className="p-1.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <RiRefreshLine
                    size={16}
                    className={customersLoading ? "animate-spin" : ""}
                  />
                </button>
              </div>
            </div>

            {/* Table */}
            <Table variant="secondary" aria-label="Customer Accounts">
              <Table.ScrollContainer>
                <Table.Content>
                  <Table.Header>
                    <Table.Column isRowHeader>CUSTOMER</Table.Column>
                    <Table.Column>ACCOUNT NUMBER</Table.Column>
                    <Table.Column>BANK</Table.Column>
                    <Table.Column>TYPE</Table.Column>
                    <Table.Column>TIER</Table.Column>
                    <Table.Column>STATUS</Table.Column>
                    <Table.Column>EXPIRES</Table.Column>
                    <Table.Column>CREATED</Table.Column>
                    <Table.Column className="text-right">ACTIONS</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {customersLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <Table.Row key={i}>
                          {Array.from({ length: 9 }).map((_, j) => (
                            <Table.Cell key={j}>
                              <div className="h-4 bg-gray-100 rounded animate-pulse w-full max-w-[100px]" />
                            </Table.Cell>
                          ))}
                        </Table.Row>
                      ))
                    ) : customers.length === 0 ? (
                      <Table.Row>
                        <Table.Cell
                          colSpan={9}
                          className="text-center py-12 text-gray-400 text-sm"
                        >
                          No customer accounts found
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      customers.map((account) => (
                        <Table.Row key={account.id}>
                          <Table.Cell>
                            <div>
                              <p className="font-medium text-sm text-nowrap">
                                {account.customer_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {account.customer_email}
                              </p>
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-sm text-nowrap">
                                {account.account_number}
                              </span>
                              <CopyButton
                                value={account.account_number}
                                label="account number"
                              />
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <p className="text-sm text-nowrap">
                              {account.bank_name}
                            </p>
                          </Table.Cell>
                          <Table.Cell>
                            <TypeBadge type={account.type} />
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-sm font-medium">
                              Tier {account.tier}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <StatusBadge
                              status={account.status}
                              isExpired={account.is_expired}
                            />
                          </Table.Cell>
                          <Table.Cell>
                            <p className="text-sm text-gray-500 text-nowrap">
                              {account.expires_at
                                ? formatDate(account.expires_at)
                                : "Never"}
                            </p>
                          </Table.Cell>
                          <Table.Cell>
                            <p className="text-sm text-gray-500 text-nowrap">
                              {formatDate(account.created_at)}
                            </p>
                          </Table.Cell>
                          <Table.Cell className="text-right">
                            <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                              <RiMoreFill size={16} />
                            </button>
                          </Table.Cell>
                        </Table.Row>
                      ))
                    )}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>

            {/* Pagination */}
            {!customersLoading && totalPages > 1 && meta && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-gray-500">
                  Showing {meta.from ?? 0}–{meta.to ?? 0} of {meta.total}{" "}
                  accounts
                </p>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - currentPage) <= 1,
                    )
                    .reduce<(number | "...")[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1)
                        acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, i) =>
                      item === "..." ? (
                        <span key={`e-${i}`} className="px-2 text-gray-400">
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setCurrentPage(item as number)}
                          className={clsx(
                            "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                            item === currentPage
                              ? "bg-gray-900 text-white border-gray-900"
                              : "border-gray-200 hover:bg-gray-50",
                          )}
                        >
                          {item}
                        </button>
                      ),
                    )}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
