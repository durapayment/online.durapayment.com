"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RiLinksLine,
  RiAddLine,
  RiCloseLine,
  RiCheckLine,
  RiFileCopyLine,
  RiDeleteBinLine,
  RiToggleLine,
  RiAlertLine,
  RiImageLine,
} from "react-icons/ri";
import clsx from "clsx";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
interface PaymentLink {
  id: string;
  slug: string;
  url: string;
  title: string;
  description: string | null;
  images: string[];
  amount: number;
  currency: string;
  type: "one_time" | "multiple";
  status: "active" | "inactive" | "completed";
  payment_count: number;
  redirect_url: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
function fmt(amount: number, currency = "NGN"): string {
  if (currency === "NGN")
    return "₦" + amount.toLocaleString("en-NG", { minimumFractionDigits: 2 });
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(
    amount,
  );
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  inactive: "bg-gray-100 text-gray-500",
  completed: "bg-blue-50 text-blue-700",
};

const TYPE_LABELS: Record<string, string> = {
  one_time: "One-time",
  multiple: "Reusable",
};

// ─────────────────────────────────────────────────────────
// Create Link Modal
// ─────────────────────────────────────────────────────────
function CreateLinkModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"one_time" | "multiple">("multiple");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_IMAGES = 5;
  const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setError(null);

    const combined = [...images, ...files];
    if (combined.length > MAX_IMAGES) {
      setError(`You can only add up to ${MAX_IMAGES} images.`);
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        setError(`"${file.name}" isn't an image file.`);
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setError(`"${file.name}" is larger than 2MB.`);
        return;
      }
    }

    setImages(combined);
    setImagePreviews(combined.map((f) => URL.createObjectURL(f)));

    // reset the input so selecting the same file again still fires onChange
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    setImagePreviews(newImages.map((f) => URL.createObjectURL(f)));
  };

  const submit = async () => {
    if (!title.trim() || !amount) {
      setError("Title and amount are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      if (description.trim())
        formData.append("description", description.trim());
      formData.append("amount", amount);
      formData.append("type", type);
      if (redirectUrl.trim())
        formData.append("redirect_url", redirectUrl.trim());
      images.forEach((file) => formData.append("images[]", file));

      const res = await fetch("/api/payment-links", {
        method: "POST",
        body: formData, // no Content-Type header — browser sets the multipart boundary itself
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to create link");
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create link");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-semibold text-[16px] text-gray-900">
            Create Payment Link
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RiCloseLine size={20} />
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          <div>
            <label className="text-[13px] font-medium text-gray-600 mb-1.5 block">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Premium Consultation"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-[14px] outline-none focus:border-gray-400"
            />
          </div>

          <div>
            <label className="text-[13px] font-medium text-gray-600 mb-1.5 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this payment for?"
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-[14px] outline-none focus:border-gray-400 resize-none"
            />
          </div>

          <div>
            <label className="text-[13px] font-medium text-gray-600 mb-1.5 block">
              Images{" "}
              <span className="text-gray-400">
                (optional, up to {MAX_IMAGES}, 2MB each)
              </span>
            </label>

            {imagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="relative w-16 h-16 shrink-0">
                    <img
                      src={src}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                    />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center"
                    >
                      <RiCloseLine size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {images.length < MAX_IMAGES && (
              <label className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-gray-300 rounded-xl text-[13px] text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors">
                <RiImageLine size={16} />
                Choose image{images.length > 0 ? "s" : ""}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div>
            <label className="text-[13px] font-medium text-gray-600 mb-1.5 block">
              Amount (₦)
            </label>
            <input
              type="number"
              min={100}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5000"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-[14px] outline-none focus:border-gray-400"
            />
          </div>

          <div>
            <label className="text-[13px] font-medium text-gray-600 mb-1.5 block">
              Link Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setType("multiple")}
                className={clsx(
                  "px-3 py-2.5 rounded-xl text-[13px] font-medium border transition-colors",
                  type === "multiple"
                    ? "bg-accent text-white border-accent"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50",
                )}
              >
                Reusable
              </button>
              <button
                onClick={() => setType("one_time")}
                className={clsx(
                  "px-3 py-2.5 rounded-xl text-[13px] font-medium border transition-colors",
                  type === "one_time"
                    ? "bg-accent text-white border-accent"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50",
                )}
              >
                One-time
              </button>
            </div>
            <p className="text-[12px] text-gray-400 mt-1.5">
              {type === "multiple"
                ? "Stays active — anyone can pay it, any number of times."
                : "Deactivates automatically after its first successful payment."}
            </p>
          </div>

          <div>
            <label className="text-[13px] font-medium text-gray-600 mb-1.5 block">
              Redirect URL <span className="text-gray-400">(optional)</span>
            </label>
            <input
              value={redirectUrl}
              onChange={(e) => setRedirectUrl(e.target.value)}
              placeholder="https://yoursite.com/thank-you"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-[14px] outline-none focus:border-gray-400"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              <RiAlertLine size={14} />
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={submitting}
            className="w-full mt-1 py-3 rounded-xl bg-accent text-white font-semibold text-[14px] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create Link"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────
export default function PaymentLinksPage() {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payment-links?per_page=20");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to load links");
      setLinks(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load links");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const copyLink = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleStatus = async (link: PaymentLink) => {
    if (link.status === "completed") return; // can't reactivate a used one-time link
    setActioningId(link.id);
    try {
      const newStatus = link.status === "active" ? "inactive" : "active";
      const res = await fetch(`/api/payment-links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update link");
      await fetchLinks();
    } catch (e) {
      console.error(e);
    } finally {
      setActioningId(null);
    }
  };

  const deleteLink = async (id: string) => {
    if (!confirm("Delete this payment link? This can't be undone.")) return;
    setActioningId(id);
    try {
      const res = await fetch(`/api/payment-links/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete link");
      await fetchLinks();
    } catch (e) {
      console.error(e);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="w-full flex flex-col items-center pt-6 pb-12">
      <div className="max-w-310 w-full flex flex-col gap-6 px-4 sm:px-0">
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 tracking-tight leading-tight">
              Payment Links
            </h1>
            <p className="text-[14px] text-gray-400 mt-1">
              Share a link to collect payments — no integration needed.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
          >
            <RiAddLine size={16} />
            Create Link
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-700">
            <RiAlertLine size={16} className="shrink-0 text-gray-400" />
            {error}
            <button
              onClick={fetchLinks}
              className="ml-auto text-accent underline underline-offset-2 font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── List ── */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-50">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-40" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : links.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <RiLinksLine size={32} className="text-gray-300 mb-3" />
              <p className="text-[15px] font-semibold text-gray-700">
                No payment links yet
              </p>
              <p className="text-[13px] text-gray-400 mt-1 mb-4">
                Create one to start collecting payments without any code.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
              >
                <RiAddLine size={15} />
                Create your first link
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center gap-4 px-6 py-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {link.images.length > 0 ? (
                      <img
                        src={link.images[0]}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <RiImageLine size={16} className="text-gray-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-gray-900 truncate">
                      {link.title}
                    </p>
                    <p className="text-[12px] text-gray-400 mt-0.5">
                      {fmt(link.amount, link.currency)} ·{" "}
                      {TYPE_LABELS[link.type]} · {link.payment_count} payment
                      {link.payment_count === 1 ? "" : "s"}
                    </p>
                  </div>

                  <span
                    className={clsx(
                      "px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0",
                      STATUS_STYLES[link.status],
                    )}
                  >
                    {link.status.charAt(0).toUpperCase() + link.status.slice(1)}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => copyLink(link.id, link.url)}
                      title="Copy link"
                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-500"
                    >
                      {copiedId === link.id ? (
                        <RiCheckLine size={14} className="text-green-600" />
                      ) : (
                        <RiFileCopyLine size={14} />
                      )}
                    </button>
                    {link.status !== "completed" && (
                      <button
                        onClick={() => toggleStatus(link)}
                        disabled={actioningId === link.id}
                        title={
                          link.status === "active" ? "Deactivate" : "Activate"
                        }
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-500 disabled:opacity-40"
                      >
                        <RiToggleLine size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteLink(link.id)}
                      disabled={actioningId === link.id}
                      title="Delete"
                      className="p-2 rounded-lg border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors text-gray-500 disabled:opacity-40"
                    >
                      <RiDeleteBinLine size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateLinkModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchLinks}
        />
      )}
    </div>
  );
}
