"use client";
import { useEffect, useState, useRef } from "react";
import {
  RiAddLine,
  RiCloseLine,
  RiBankLine,
  RiUserLine,
  RiRefreshLine,
  RiCheckLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiWallet3Line,
  RiInformationLine,
  RiTimeLine,
  RiAlertLine,
  RiExchangeDollarLine,
  RiMoreFill,
  RiSearchLine,
} from "react-icons/ri";
import { Button, ProgressCircle, Table } from "@heroui/react";
import { authService, User } from "@/app/lib/auth";
import { BusinessVerificationStatus } from "@/app/components/business_verification_status";
import { HiOutlineHashtag } from "react-icons/hi";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
export type TransferStatus = "pending" | "processing" | "completed" | "failed";

export interface Transfer {
  id: string;
  reference: string;
  amount: number;
  fee_amount: number;
  currency: string;
  status: TransferStatus;
  bank_name: string;
  account_number: string;
  account_name: string;
  narration: string | null;
  created_at: string;
  completed_at: string | null;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

interface TransferForm {
  bank_code: string;
  account_number: string;
  account_name: string;
  amount: string;
  narration: string;
}

interface TransferFormErrors {
  bank_code: string;
  account_number: string;
  account_name: string;
  amount: string;
  narration: string;
}

interface Bank {
  code: string;
  name: string;
}

interface AccountEnquiry {
  account_id: string;
  client_id: string;
  vfd_balance: number;
  wallet_balance: number;
  amount: number;
  fee: number;
  total_debit: number;
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
function fmt(amount: number, currency = "NGN") {
  if (currency === "NGN")
    return "₦" + amount.toLocaleString("en-NG", { minimumFractionDigits: 2 });
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(
    amount,
  );
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────
function TransferBadge({ status }: { status: TransferStatus }) {
  const map: Record<TransferStatus, { cls: string; icon: React.ReactNode }> = {
    completed: {
      cls: "bg-green-50 text-green-700",
      icon: <RiCheckLine size={11} />,
    },
    processing: {
      cls: "bg-yellow-50 text-yellow-700",
      icon: <RiTimeLine size={11} />,
    },
    pending: {
      cls: "bg-blue-50 text-blue-700",
      icon: <RiTimeLine size={11} />,
    },
    failed: {
      cls: "bg-red-50 text-red-700",
      icon: <RiAlertLine size={11} />,
    },
  };
  const { cls, icon } = map[status] ?? {
    cls: "bg-gray-100 text-gray-600",
    icon: null,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}
    >
      {icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// Shared plain modal shell (portal-safe, no HeroUI)
// ─────────────────────────────────────────────────────────
function PlainModal({
  onBackdropClick,
  children,
  size = "md",
  zIndex = 50,
}: {
  onBackdropClick?: () => void;
  children: React.ReactNode;
  size?: "sm" | "md";
  zIndex?: number;
}) {
  const maxW = size === "sm" ? "max-w-sm" : "max-w-md";
  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-center justify-center p-4`}
      style={{ zIndex }}
      onClick={(e) => e.target === e.currentTarget && onBackdropClick?.()}
    >
      <div
        className={`bg-white rounded-2xl w-full ${maxW} shadow-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Transfer Detail Modal
// ─────────────────────────────────────────────────────────
function TransferDetailModal({
  transfer: t,
  onClose,
}: {
  transfer: Transfer;
  onClose: () => void;
}) {
  return (
    <PlainModal onBackdropClick={onClose} size="sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-[16px] text-gray-900">
          Transfer Details
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <RiCloseLine size={20} />
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-5 space-y-4">
        <div className="text-center py-4 bg-gray-50 rounded-2xl">
          <p className="text-xs text-gray-500 mb-1">Amount Sent</p>
          <p className="text-3xl font-bold text-gray-900">
            {fmt(t.amount, t.currency)}
          </p>
          {t.fee_amount > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Fee: {fmt(t.fee_amount, t.currency)}
            </p>
          )}
          <div className="mt-2 flex justify-center">
            <TransferBadge status={t.status} />
          </div>
        </div>

        {[
          { label: "Reference", value: t.reference, mono: true },
          { label: "Bank", value: t.bank_name },
          { label: "Account Number", value: t.account_number, mono: true },
          { label: "Account Name", value: t.account_name },
          ...(t.narration ? [{ label: "Narration", value: t.narration }] : []),
          { label: "Initiated", value: fmtDate(t.created_at) },
          ...(t.completed_at
            ? [{ label: "Completed", value: fmtDate(t.completed_at) }]
            : []),
        ].map(({ label, value, mono }) => (
          <div key={label} className="flex justify-between items-start gap-4">
            <span className="text-sm text-gray-500 shrink-0">{label}</span>
            <span
              className={`text-sm text-gray-900 text-right ${mono ? "font-mono text-xs" : ""}`}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 pb-5">
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          Close
        </button>
      </div>
    </PlainModal>
  );
}

// ─────────────────────────────────────────────────────────
// Bank Picker Modal — plain div-based, always visible
// ─────────────────────────────────────────────────────────
function BankPickerModal({
  banks,
  selected,
  onSelect,
  onClose,
}: {
  banks: Bank[];
  selected: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = banks.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <PlainModal onBackdropClick={onClose} size="sm" zIndex={60}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-[16px] text-gray-900">Select Bank</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <RiCloseLine size={20} />
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {/* Search */}
        <div className="relative mb-3">
          <RiSearchLine
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={15}
          />
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bank name…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:border-gray-400 focus:bg-white text-sm outline-none transition-all"
          />
        </div>

        {/* Bank list */}
        <div className="overflow-y-auto max-h-72 space-y-1">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">
              No banks match &ldquo;{search}&rdquo;
            </p>
          ) : (
            filtered.map((b) => (
              <button
                key={b.code}
                type="button"
                onClick={() => {
                  onSelect(b.code);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors ${
                  selected === b.code
                    ? "bg-black text-white"
                    : "hover:bg-gray-50 text-gray-800"
                }`}
              >
                <span>{b.name}</span>
                {selected === b.code && (
                  <RiCheckLine size={16} className="shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </PlainModal>
  );
}

// ─────────────────────────────────────────────────────────
// New Transfer Modal
// ─────────────────────────────────────────────────────────
function NewTransferModal({
  balance,
  onClose,
  onSuccess,
}: {
  balance: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<"form" | "confirm" | "otp" | "success">(
    "form",
  );
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [enquiry, setEnquiry] = useState<AccountEnquiry | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState<TransferForm>({
    bank_code: "",
    account_number: "",
    account_name: "",
    amount: "",
    narration: "",
  });
  const [errors, setErrors] = useState<TransferFormErrors>({
    bank_code: "",
    account_number: "",
    account_name: "",
    amount: "",
    narration: "",
  });

  const resolveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load banks ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/banks");
        if (res.ok) {
          const data = await res.json();
          setBanks(data.data ?? []);
        }
      } catch {
        /* non-critical */
      } finally {
        setBanksLoading(false);
      }
    })();
  }, []);

  // ── Auto-resolve account name ─────────────────────────
  useEffect(() => {
    if (form.account_number.length !== 10 || !form.bank_code) return;
    if (resolveDebounce.current) clearTimeout(resolveDebounce.current);
    resolveDebounce.current = setTimeout(async () => {
      setResolving(true);
      setErrors((e) => ({ ...e, account_name: "" }));
      try {
        const res = await fetch(
          `/api/payments/resolve-bank?account_number=${form.account_number}&bank_code=${form.bank_code}`,
        );
        const data = await res.json();
        if (res.ok && data.data?.account_name) {
          setForm((f) => ({ ...f, account_name: data.data.account_name }));
        } else {
          setForm((f) => ({ ...f, account_name: "" }));
          setErrors((e) => ({
            ...e,
            account_name:
              data.message || "Could not resolve account. Check the number.",
          }));
        }
      } catch {
        setForm((f) => ({ ...f, account_name: "" }));
      } finally {
        setResolving(false);
      }
    }, 600);
  }, [form.account_number, form.bank_code]);

  // ── Cooldown timer cleanup ────────────────────────────
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  // ── Start 60s resend cooldown ─────────────────────────
  const startCooldown = () => {
    setOtpResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setOtpResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Validate form ─────────────────────────────────────
  const validate = (): boolean => {
    const e: TransferFormErrors = {
      bank_code: form.bank_code ? "" : "Select a bank",
      account_number:
        form.account_number.length === 10
          ? ""
          : "Account number must be 10 digits",
      account_name: form.account_name ? "" : "Account name is required",
      amount: (() => {
        const n = parseFloat(form.amount);
        if (!form.amount || isNaN(n)) return "Enter a valid amount";
        if (n < 100) return "Minimum transfer is ₦100";
        if (n > balance) return "Amount exceeds available balance";
        return "";
      })(),
      narration: "",
    };
    setErrors(e);
    return Object.values(e).every((v) => !v);
  };

  // ── Continue → account enquiry (checks VFD balance) → confirm step ──
  const proceedToConfirm = async () => {
    if (!validate()) return;
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch("/api/transactions/account-enquiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ amount: parseFloat(form.amount) }),
      });
      const data = await res.json();
      if (!res.ok) {
        // 422 comes back with a balance breakdown even on failure
        throw new Error(data.message || "Could not verify account balance");
      }
      setEnquiry(data.data);
      setStep("confirm");
    } catch (err: unknown) {
      setErrors((e) => ({
        ...e,
        amount:
          err instanceof Error ? err.message : "Could not verify balance.",
      }));
    } finally {
      setLoading(false);
    }
  };

  // ── Confirm tapped → send OTP, move to otp step ──────────────────
  const sendOtp = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch("/api/request/otp", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to send verification code");
      }
      setOtp(["", "", "", "", "", ""]);
      setOtpError(null);
      setStep("otp");
      startCooldown();
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Could not send code.");
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────
  const resendOtp = async () => {
    setOtpError(null);
    try {
      const res = await fetch("/api/request/otp", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to resend code");
      }
      startCooldown();
    } catch (err: unknown) {
      setOtpError(
        err instanceof Error ? err.message : "Could not resend code.",
      );
    }
  };

  // ── Resend OTP ────────────────────────────────────────
  // const resendOtp = async () => {
  //   setOtpError(null);
  //   try {
  //     const res = await fetch("/api/auth/two-factor/resend", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Accept: "application/json",
  //       },
  //     });
  //     if (!res.ok) {
  //       const data = await res.json().catch(() => ({}));
  //       throw new Error(data.message || "Failed to resend code");
  //     }
  //     startCooldown();
  //   } catch (err: unknown) {
  //     setOtpError(
  //       err instanceof Error ? err.message : "Could not resend code.",
  //     );
  //   }
  // };

  // ── OTP input handlers ────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setOtpError(null);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  // ── Verify OTP → submit transfer directly ─────────────
  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      setOtpError("Please enter the full 6-digit code.");
      return;
    }
    setLoading(true);
    setOtpError(null);
    try {
      const verifyRes = await fetch("/api/auth/two-factor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // NOTE: confirm the field name your backend expects here —
        // using `code` to match the auth/two-factor/verify convention;
        // adjust to `otp` if AuthController::verifyTwoFactorAuth reads that instead.
        body: JSON.stringify({ code }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.message || "Invalid verification code");
      }

      // 2FA passed — now actually submit the transfer
      await handleSubmit();
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? err.message : "Verification failed.");
      setLoading(false);
    }
  };

  // ── Submit transfer ───────────────────────────────────
  const handleSubmit = async () => {
    setApiError(null);
    try {
      const res = await fetch("/api/transactions/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          bank_code: form.bank_code,
          account_number: form.account_number,
          account_name: form.account_name,
          amount: parseFloat(form.amount),
          narration: form.narration || "Transfer",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Transfer failed");
      setStep("success");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setApiError(message);
      setOtpError(message);
      setStep("confirm");
    } finally {
      setLoading(false);
    }
  };

  const selectedBank = banks.find((b) => b.code === form.bank_code);
  const otpFilled = otp.every((d) => d !== "");

  return (
    <>
      <PlainModal onBackdropClick={onClose} size="md" zIndex={50}>
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <RiArrowUpLine size={14} className="text-white" />
            </div>
            <h2 className="font-semibold text-gray-900">
              {step === "success" ? "Transfer Sent" : "Bank Transfer"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RiCloseLine size={22} />
          </button>
        </div>

        {/* ── FORM ── */}
        {step === "form" && (
          <>
            <div className="px-5 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <span className="text-xs text-gray-500">Available balance</span>
                <span className="text-sm font-semibold text-gray-900">
                  {fmt(balance)}
                </span>
              </div>

              {/* Bank */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <RiBankLine size={12} /> Bank
                </label>
                <button
                  type="button"
                  onClick={() => setShowBankPicker(true)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-all ${
                    errors.bank_code
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200 bg-gray-50 hover:border-gray-400 hover:bg-white"
                  }`}
                >
                  <span
                    className={selectedBank ? "text-gray-900" : "text-gray-400"}
                  >
                    {banksLoading
                      ? "Loading banks…"
                      : (selectedBank?.name ?? "Select bank")}
                  </span>
                  <RiArrowDownLine
                    size={14}
                    className="text-gray-400 shrink-0"
                  />
                </button>
                {errors.bank_code && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.bank_code}
                  </p>
                )}
              </div>

              {/* Account number */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <HiOutlineHashtag size={12} /> Account Number
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.account_number}
                  maxLength={10}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setForm((f) => ({
                      ...f,
                      account_number: val,
                      account_name: "",
                    }));
                    setErrors((er) => ({ ...er, account_number: "" }));
                  }}
                  placeholder="10-digit account number"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none font-mono tracking-widest transition-all ${errors.account_number ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50 focus:border-gray-400 focus:bg-white"}`}
                />
                {errors.account_number && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.account_number}
                  </p>
                )}
              </div>

              {/* Account name */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <RiUserLine size={12} /> Account Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.account_name}
                    readOnly
                    placeholder={
                      resolving ? "Resolving…" : "Auto-filled after lookup"
                    }
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${
                      errors.account_name
                        ? "border-red-300 bg-red-50"
                        : form.account_name
                          ? "border-green-200 bg-green-50 text-green-800 font-medium"
                          : "border-gray-200 bg-gray-100 text-gray-400"
                    }`}
                  />
                  {resolving && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <RiRefreshLine
                        size={14}
                        className="animate-spin text-gray-400"
                      />
                    </div>
                  )}
                  {form.account_name && !resolving && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <RiCheckLine size={14} className="text-green-500" />
                    </div>
                  )}
                </div>
                {errors.account_name && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.account_name}
                  </p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <RiWallet3Line size={12} /> Amount (₦)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      amount: e.target.value.replace(/[^0-9.]/g, ""),
                    }));
                    setErrors((er) => ({ ...er, amount: "" }));
                  }}
                  placeholder="0.00"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${errors.amount ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50 focus:border-gray-400 focus:bg-white"}`}
                />
                {errors.amount && (
                  <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
                )}
                <div className="flex gap-2 mt-2">
                  {[1000, 5000, 10000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, amount: String(amt) }))
                      }
                      className="flex-1 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      ₦{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Narration */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Narration{" "}
                  <span className="text-gray-400 normal-case font-normal">
                    (optional)
                  </span>
                </label>
                <input
                  type="text"
                  value={form.narration}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, narration: e.target.value }))
                  }
                  placeholder="e.g., Payment for services"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:border-gray-400 focus:bg-white text-sm outline-none transition-all"
                />
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={proceedToConfirm}
                disabled={!form.account_name || resolving || loading}
                className="flex-1 py-2.5 rounded-xl bg-accent cursor-pointer text-white text-sm font-semibold hover:bg-tertiary transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RiRefreshLine size={14} className="animate-spin" />
                    Checking balance…
                  </>
                ) : (
                  "Continue"
                )}
              </button>
            </div>
          </>
        )}

        {/* ── CONFIRM ── */}
        {step === "confirm" && (
          <>
            <div className="px-5 py-6 space-y-4">
              <div className="text-center py-4 bg-gray-50 rounded-2xl">
                <p className="text-xs text-gray-500 mb-1">You are sending</p>
                <p className="text-4xl font-bold text-gray-900">
                  {fmt(parseFloat(form.amount || "0"))}
                </p>
                {enquiry && enquiry.fee > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    + {fmt(enquiry.fee)} fee · {fmt(enquiry.total_debit)} total
                  </p>
                )}
              </div>

              <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                {[
                  {
                    label: "Bank",
                    value: selectedBank?.name ?? form.bank_code,
                  },
                  {
                    label: "Account Number",
                    value: form.account_number,
                    mono: true,
                  },
                  { label: "Account Name", value: form.account_name },
                  { label: "Narration", value: form.narration || "Transfer" },
                  ...(enquiry
                    ? [
                        { label: "Transfer Fee", value: fmt(enquiry.fee) },
                        {
                          label: "Total Debit",
                          value: fmt(enquiry.total_debit),
                        },
                      ]
                    : []),
                ].map(({ label, value, mono }) => (
                  <div
                    key={label}
                    className="flex justify-between items-center gap-4"
                  >
                    <span className="text-sm text-gray-500">{label}</span>
                    <span
                      className={`text-sm font-medium text-gray-900 text-right ${mono ? "font-mono" : ""}`}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {apiError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {apiError}
                </div>
              )}

              <p className="text-xs text-gray-400 flex items-start gap-1.5">
                <RiInformationLine size={14} className="shrink-0 mt-0.5" />
                You&apos;ll be asked to verify with a code sent to your
                registered email before this transfer is sent. Transfers are
                processed within 30 minutes during banking hours and cannot be
                undone.
              </p>
            </div>

            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={() => setStep("form")}
                className="flex-1 py-2.5 rounded-xl border cursor-pointer border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={sendOtp}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-tertiary cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RiRefreshLine size={14} className="animate-spin" />
                    Sending code…
                  </>
                ) : (
                  "Confirm Transfer"
                )}
              </button>
            </div>
          </>
        )}

        {/* ── OTP (2FA) ── */}
        {step === "otp" && (
          <>
            <div className="px-5 py-6 space-y-5">
              {/* Transfer summary */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between border border-gray-100">
                <div>
                  <p className="text-xs text-gray-500">Sending to</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {form.account_name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {selectedBank?.name} ·{" "}
                    <span className="font-mono">{form.account_number}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Amount</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    {fmt(parseFloat(form.amount || "0"))}
                  </p>
                </div>
              </div>

              {/* Instruction */}
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-gray-900">
                  Enter verification code
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  A 6-digit code has been sent to your registered email address.
                </p>
              </div>

              {/* OTP boxes */}
              <div className="flex gap-2 justify-center">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      otpRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={i === 0 ? handleOtpPaste : undefined}
                    className={`w-11 h-12 text-center text-lg font-bold rounded-xl border outline-none transition-all ${
                      otpError
                        ? "border-red-300 bg-red-50 text-red-700"
                        : digit
                          ? "border-gray-900 text-black"
                          : "border-gray-200 bg-gray-50 focus:border-gray-400 focus:bg-white text-gray-900"
                    }`}
                  />
                ))}
              </div>

              {otpError && (
                <p className="text-xs text-red-500 text-center">{otpError}</p>
              )}

              {/* Resend */}
              <div className="text-center">
                {otpResendCooldown > 0 ? (
                  <p className="text-xs text-gray-400">
                    Resend code in{" "}
                    <span className="font-semibold text-gray-600">
                      {otpResendCooldown}s
                    </span>
                  </p>
                ) : (
                  <button
                    onClick={resendOtp}
                    className="text-xs text-gray-600 underline underline-offset-2 hover:text-gray-900 transition-colors"
                  >
                    Resend code
                  </button>
                )}
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={() => {
                  setStep("confirm");
                  setOtp(["", "", "", "", "", ""]);
                  setOtpError(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={verifyOtp}
                disabled={!otpFilled || loading}
                className="flex-1 py-2.5 rounded-xl bg-accent cursor-pointer text-white text-sm font-semibold hover:bg-tertiary disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RiRefreshLine size={14} className="animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Verify & Send"
                )}
              </button>
            </div>
          </>
        )}

        {/* ── SUCCESS ── */}
        {step === "success" && (
          <div className="px-5 py-8 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center">
              <RiCheckLine size={30} className="text-green-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                Transfer initiated
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {fmt(parseFloat(form.amount))} to{" "}
                <span className="font-medium">{form.account_name}</span> is
                being processed.
              </p>
            </div>
            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full py-3 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </PlainModal>

      {showBankPicker && (
        <BankPickerModal
          banks={banks}
          selected={form.bank_code}
          onSelect={(code) => {
            setForm((f) => ({ ...f, bank_code: code, account_name: "" }));
            setErrors((er) => ({ ...er, bank_code: "" }));
          }}
          onClose={() => setShowBankPicker(false)}
        />
      )}
    </>
  );
}
// ─────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const [user, setUser] = useState<User | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [business, setBusiness] = useState<any>(null);
  const [pageLoading, setPageLoading] = useState(true);

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [transfersLoading, setTransfersLoading] = useState(true);
  const [transfersError, setTransfersError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(
    null,
  );

  // ── Load user ─────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { isAuthenticated, user, business } =
          await authService.checkAuth();
        if (isAuthenticated && user) {
          setUser(user);
          setBusiness(business);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setPageLoading(false);
      }
    })();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setCurrentPage(1);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setDebouncedSearch(val), 400);
  };

  // ── Fetch transfers ───────────────────────────
  const fetchTransfers = async () => {
    setTransfersLoading(true);
    setTransfersError(null);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        per_page: "15",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/transactions?${params}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      if (res.status === 401) {
        window.location.href = "/";
        return;
      }

      if (!res.ok) throw new Error("Failed to load transfers");

      const json = await res.json();
      setTransfers(json.data ?? []);
      setMeta(json.meta ?? null);
    } catch (err: unknown) {
      setTransfersError(
        err instanceof Error ? err.message : "Something went wrong",
      );
      setTransfers([]);
    } finally {
      setTransfersLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pageLoading) fetchTransfers();
  }, [pageLoading, currentPage, debouncedSearch, statusFilter]);

  const balance = Number(business?.account_balance ?? 0);
  const totalPages = meta?.last_page ?? 1;

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center mt-10">
        <ProgressCircle isIndeterminate aria-label="Loading...">
          <ProgressCircle.Track>
            <ProgressCircle.TrackCircle />
            <ProgressCircle.FillCircle />
          </ProgressCircle.Track>
        </ProgressCircle>
      </div>
    );
  }

  return (
    <div className="w-full flex h-full flex-col items-center pt-5 sm:pt-6 pb-5 sm:pb-8">
      <div className="max-w-310 flex flex-col gap-6 flex-1 w-full">
        {business?.verification_status !== "verified" && (
          <BusinessVerificationStatus status={business?.verification_status} />
        )}

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-0 items-start md:items-center justify-between mt-4">
          <div className="">
            <h1 className="text-[26px] md:text-[30px] font-bold text-gray-900 tracking-tight">
              Transfer
            </h1>
            <p className="text-[14px] text-gray-500 mt-1">
              Send money to any Nigerian bank account
            </p>
          </div>
          <button
            onClick={() => setShowTransfer(true)}
            className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            <RiAddLine size={18} />
            New Transfer
          </button>
        </div>

        {/* ── Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <div className="bg-accent px-5 py-6 flex flex-col gap-3 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm uppercase tracking-[0.2em] text-white">
                Available Balance
              </p>
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <RiWallet3Line size={18} className="text-white" />
              </div>
            </div>
            <p className="text-[30px] font-bold text-white">{fmt(balance)}</p>
            <p className="text-sm text-white">
              {business?.bank_name ?? "DuraPayment MFB"} ·{" "}
              {business?.account_number ?? "—"}
            </p>
          </div>

          <div className="bg-white border border-gray-100 px-5 py-6 flex flex-col gap-3 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                Total Transfers
              </p>
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                <RiArrowUpLine size={16} className="text-gray-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {meta?.total?.toLocaleString() ?? "—"}
            </p>
            <p className="text-xs text-gray-400">All outbound transfers</p>
          </div>
        </div>

        {/* ── Table header ── */}
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Transfer History
            </h2>
            <p className="text-sm text-gray-500">
              All outbound bank transfers
              {meta ? ` · ${meta.total} total` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <RiSearchLine
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={14}
              />
              <input
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search reference, account…"
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-full text-sm outline-none focus:border-gray-400 bg-white w-52"
              />
            </div>

            <div className="px-3 py-2 border border-gray-200 rounded-full bg-white">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-sm outline-none focus:border-gray-400 cursor-pointer"
              >
                {[
                  { value: "all", label: "All Statuses" },
                  { value: "completed", label: "Completed" },
                  { value: "pending", label: "Pending" },
                  { value: "processing", label: "Processing" },
                  { value: "failed", label: "Failed" },
                ].map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchTransfers}
              className="p-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <RiRefreshLine
                size={15}
                className={transfersLoading ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>

        {transfersError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex justify-between items-center">
            <span>{transfersError}</span>
            <button onClick={fetchTransfers} className="underline ml-4">
              Retry
            </button>
          </div>
        )}

        {/* ── Table ── */}
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content aria-label="Transfer History">
              <Table.Header>
                <Table.Column isRowHeader>REFERENCE</Table.Column>
                <Table.Column>RECIPIENT</Table.Column>
                <Table.Column>AMOUNT</Table.Column>
                <Table.Column>FEE</Table.Column>
                <Table.Column>STATUS</Table.Column>
                <Table.Column className="text-nowrap">DATE</Table.Column>
                <Table.Column className="text-right">ACTIONS</Table.Column>
              </Table.Header>
              <Table.Body>
                {transfersLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <Table.Row key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <Table.Cell key={j}>
                          <div className="h-4 bg-gray-100 rounded animate-pulse w-full max-w-[110px]" />
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  ))
                ) : transfers.length === 0 ? (
                  <Table.Row>
                    <Table.Cell
                      colSpan={7}
                      className="text-center py-14 text-gray-400 text-sm"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <RiExchangeDollarLine
                          size={32}
                          className="opacity-30"
                        />
                        <p>No transfers yet</p>
                        <button
                          onClick={() => setShowTransfer(true)}
                          className="mt-1 text-xs text-black underline underline-offset-2"
                        >
                          Make your first transfer
                        </button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  transfers.map((t) => (
                    <Table.Row
                      key={t.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedTransfer(t)}
                    >
                      <Table.Cell>
                        <p className="font-mono text-xs text-gray-700">
                          {t.reference}
                        </p>
                        {t.narration && (
                          <p className="text-xs text-gray-400 mt-0.5 max-w-[180px] truncate">
                            {t.narration}
                          </p>
                        )}
                      </Table.Cell>

                      <Table.Cell>
                        <p className="text-sm font-medium text-gray-800 text-nowrap">
                          {t.account_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {t.bank_name} ·{" "}
                          <span className="font-mono">{t.account_number}</span>
                        </p>
                      </Table.Cell>

                      <Table.Cell>
                        <p className="text-sm font-semibold text-gray-900 text-nowrap">
                          {fmt(t.amount, t.currency)}
                        </p>
                      </Table.Cell>

                      <Table.Cell>
                        <p className="text-sm text-gray-500 text-nowrap">
                          {t.fee_amount > 0
                            ? fmt(t.fee_amount, t.currency)
                            : "—"}
                        </p>
                      </Table.Cell>

                      <Table.Cell>
                        <TransferBadge status={t.status} />
                      </Table.Cell>

                      <Table.Cell className="text-sm text-nowrap text-gray-500">
                        {fmtDate(t.created_at)}
                      </Table.Cell>

                      <Table.Cell className="text-right">
                        <Button
                          variant="outline"
                          isIconOnly
                          aria-label="View transfer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTransfer(t);
                          }}
                        >
                          <RiMoreFill size={18} />
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>

        {/* ── Pagination ── */}
        {!transfersLoading && meta && meta.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-4">
            <p className="text-sm text-gray-500">
              Showing {meta.from ?? 0}–{meta.to ?? 0} of {meta.total} transfers
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
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === "..." ? (
                    <span key={`e-${i}`} className="px-2 text-gray-400 text-sm">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setCurrentPage(item as number)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${item === currentPage ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 hover:bg-gray-50"}`}
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

        <div className="h-10" />
      </div>

      {showTransfer && (
        <NewTransferModal
          balance={balance}
          onClose={() => setShowTransfer(false)}
          onSuccess={fetchTransfers}
        />
      )}

      {selectedTransfer && (
        <TransferDetailModal
          transfer={selectedTransfer}
          onClose={() => setSelectedTransfer(null)}
        />
      )}
    </div>
  );
}
