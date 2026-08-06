"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  Users,
  Building2,
  User,
  FileText,
  RefreshCw,
  Lock,
} from "lucide-react";
import clsx from "clsx";
import {
  ComplianceData,
  BusinessType,
  BUSINESS_TYPES,
  BUSINESS_INDUSTRIES,
  NIGERIAN_STATES,
  STEPS_BY_TYPE,
  Director,
  MONTHLY_VOLUME_RANGES,
} from "@/app/lib/compliance";

import {
  StepIndicator,
  ProgressRing,
  VerificationBanner,
  WizardNav,
  DocUploadRow,
} from "./shared";
import { DirectorModal } from "./DirectorModal";
import {
  addDirector,
  deleteBusinessDocument,
  deleteDirector,
  fetchCompliance,
  saveComplianceInfo,
  submitCompliance,
  updateDirector,
  uploadBusinessDocument,
  uploadDirectorDocument,
} from "@/app/lib/compliance-api";

// ─────────────────────────────────────────────────────────
// Main Wizard
// ─────────────────────────────────────────────────────────
export function ComplianceWizard() {
  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);

  // Upload tracking per document
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadPct, setUploadPct] = useState<Record<string, number>>({});

  // Director modal
  const [directorModal, setDirectorModal] = useState<{
    open: boolean;
    director: Director | null;
  }>({ open: false, director: null });

  // Local form state
  const [infoForm, setInfoForm] = useState({
    business_type: "" as BusinessType | "",
    business_industry: "",
    business_description: "",
    monthly_transaction_volume: "",
    registration_number: "",
    incorporation_date: "",
    bvn: "",
    nin: "",
    date_of_birth: "",
    website: "",
    business_address: "",
    business_city: "",
    business_state: "",
    business_country: "Nigeria",
  });

  // ── Load ───────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchCompliance();
      setData(d);
      setInfoForm({
        business_type: d.business_type ?? "",
        business_industry: d.business_industry ?? "",
        business_description: d.business_description ?? "",
        monthly_transaction_volume: d.monthly_transaction_volume ?? "",
        registration_number: d.registration_number ?? "",
        incorporation_date: d.incorporation_date ?? "",
        bvn: d.bvn ?? "",
        nin: d.nin ?? "",
        date_of_birth: d.date_of_birth ?? "",
        website: d.website ?? "",
        business_address: d.business_address ?? "",
        business_city: d.business_city ?? "",
        business_state: d.business_state ?? "",
        business_country: d.business_country ?? "Nigeria",
      });
      // Resume from saved step
      if (d.compliance_step > 0) {
        setCurrentStep(
          Math.min(d.compliance_step, getSteps(d.business_type).length - 1),
        );
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Failed to load compliance data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Helpers ────────────────────────────────────────────
  const getSteps = (type: BusinessType | null | string | undefined) =>
    STEPS_BY_TYPE[(type as BusinessType) ?? "individual"] ??
    STEPS_BY_TYPE["individual"];

  const steps = getSteps(infoForm.business_type || data?.business_type);
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  // Locked once submitted and under review — no edits or resubmission allowed.
  const isLocked = data?.verification_status === "under_review";

  const showFeedback = (type: "ok" | "err", msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 5000);
  };

  const blockIfLocked = () => {
    if (isLocked) {
      showFeedback(
        "err",
        "Your submission is under review and can't be edited right now.",
      );
      return true;
    }
    return false;
  };

  // ── Save info ──────────────────────────────────────────
  const handleSaveInfo = async (andContinue = true) => {
    if (blockIfLocked()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      Object.entries(infoForm).forEach(([k, v]) => {
        if (v !== "" && v !== null) payload[k] = v;
      });
      const res = await saveComplianceInfo(payload);
      setData(res.data);
      showFeedback("ok", "Business information saved.");
      if (andContinue) setCurrentStep((s) => s + 1);
    } catch (e: unknown) {
      showFeedback("err", e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  // ── Upload business document ───────────────────────────
  const handleUploadDoc = async (docType: string, file: File) => {
    if (blockIfLocked()) return;
    setUploading((p) => ({ ...p, [docType]: true }));
    setUploadPct((p) => ({ ...p, [docType]: 0 }));
    try {
      await uploadBusinessDocument(docType, file, (pct) => {
        setUploadPct((p) => ({ ...p, [docType]: pct }));
      });
      showFeedback("ok", "Document uploaded.");
      const fresh = await fetchCompliance();
      setData(fresh);
    } catch (e: unknown) {
      showFeedback("err", e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading((p) => ({ ...p, [docType]: false }));
    }
  };

  // ── Delete business document ───────────────────────────
  const handleDeleteDoc = async (docType: string) => {
    if (blockIfLocked()) return;
    try {
      await deleteBusinessDocument(docType);
      showFeedback("ok", "Document removed.");
      const fresh = await fetchCompliance();
      setData(fresh);
    } catch (e: unknown) {
      showFeedback("err", e instanceof Error ? e.message : "Failed to remove.");
    }
  };

  // ── Add / update director ──────────────────────────────
  const handleSaveDirector = async (formData: Record<string, unknown>) => {
    if (isLocked) {
      showFeedback(
        "err",
        "Your submission is under review and can't be edited right now.",
      );
      return;
    }
    if (directorModal.director) {
      await updateDirector(directorModal.director.id, formData);
      showFeedback("ok", "Director updated.");
    } else {
      await addDirector(formData);
      showFeedback("ok", "Director added.");
    }
    const fresh = await fetchCompliance();
    setData(fresh);
  };

  // ── Delete director ────────────────────────────────────
  const handleDeleteDirector = async (id: string) => {
    if (blockIfLocked()) return;
    if (!confirm("Remove this director?")) return;
    try {
      await deleteDirector(id);
      showFeedback("ok", "Director removed.");
      const fresh = await fetchCompliance();
      setData(fresh);
    } catch (e: unknown) {
      showFeedback("err", e instanceof Error ? e.message : "Failed to remove.");
    }
  };

  // ── Upload director document ───────────────────────────
  const handleUploadDirectorDoc = async (
    directorId: string,
    docType: string,
    file: File,
  ) => {
    if (blockIfLocked()) return;
    const key = `${directorId}_${docType}`;
    setUploading((p) => ({ ...p, [key]: true }));
    setUploadPct((p) => ({ ...p, [key]: 0 }));
    try {
      await uploadDirectorDocument(directorId, docType, file, (pct) => {
        setUploadPct((p) => ({ ...p, [key]: pct }));
      });
      showFeedback("ok", "Document uploaded.");
      const fresh = await fetchCompliance();
      setData(fresh);
    } catch (e: unknown) {
      showFeedback("err", e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading((p) => ({ ...p, [key]: false }));
    }
  };

  // ── Submit ─────────────────────────────────────────────
  const handleSubmit = async () => {
    if (blockIfLocked()) return;
    setSaving(true);
    try {
      const res = await submitCompliance();
      setData(res.data);
      showFeedback("ok", res.message);
    } catch (e: unknown) {
      showFeedback(
        "err",
        e instanceof Error ? e.message : "Submission failed.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Loading / error states ─────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-gray-400" size={32} />
          <p className="text-sm text-gray-500">Loading compliance data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600 mb-3">{error ?? "Failed to load"}</p>
        <button
          onClick={load}
          className="px-4 py-2 rounded-xl border border-red-300 text-red-600 text-sm font-medium hover:bg-red-100 flex items-center gap-2 mx-auto"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const businessType = (infoForm.business_type ||
    data.business_type) as BusinessType;

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="w-full">
      {/* Feedback */}
      {feedback && (
        <div
          className={clsx(
            "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium text-white shadow-xl transition-all",
            feedback.type === "ok" ? "bg-gray-900" : "bg-red-600",
          )}
        >
          {feedback.msg}
        </div>
      )}

      {/* Status Banner */}
      {["under_review", "verified", "rejected"].includes(
        data.verification_status,
      ) && (
        <VerificationBanner
          status={data.verification_status}
          rejectionReason={data.rejection_reason}
        />
      )}

      {/* Locked notice */}
      {isLocked && (
        <div className="flex items-center gap-2 mb-6 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600">
          <Lock size={14} className="text-gray-400 shrink-0" />
          Your submission is under review. Editing and resubmission are disabled
          until a decision is made.
        </div>
      )}

      {/* Header + Progress */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            Business Verification (KYC)
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Complete your profile to unlock all features
          </p>
        </div>
        <div className="flex flex-col items-center">
          <ProgressRing percent={data.progress.percent} size={56} />
          <p className="text-[11px] text-gray-400 mt-1">
            {data.progress.percent}% done
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <StepIndicator steps={steps} currentStep={currentStep} />

      {/* ── Step 0: Business Type ────────────────────── */}
      {currentStep === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-6">
            Select the type that best describes your business. This determines
            which documents are required.
          </p>

          {BUSINESS_TYPES.map((type) => (
            <label
              key={type.value}
              className={clsx(
                "flex items-start gap-4 p-4 border-2 rounded-2xl transition-all",
                isLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                infoForm.business_type === type.value
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 hover:border-gray-300",
              )}
            >
              <input
                type="radio"
                name="business_type"
                value={type.value}
                checked={infoForm.business_type === type.value}
                disabled={isLocked}
                onChange={() =>
                  setInfoForm((f) => ({ ...f, business_type: type.value }))
                }
                className="mt-1 accent-gray-900"
              />
              <div className="flex items-start gap-3">
                <div
                  className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    type.value === "individual"
                      ? "bg-blue-100 text-blue-600"
                      : type.value === "business_name"
                        ? "bg-purple-100 text-purple-600"
                        : "bg-emerald-100 text-emerald-600",
                  )}
                >
                  {type.value === "individual" ? (
                    <User size={18} />
                  ) : type.value === "business_name" ? (
                    <FileText size={18} />
                  ) : (
                    <Building2 size={18} />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{type.label}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {type.description}
                  </p>
                </div>
              </div>
            </label>
          ))}

          <WizardNav
            isFirst
            disabled={isLocked}
            onNext={() => {
              if (blockIfLocked()) return;
              if (!infoForm.business_type) {
                showFeedback("err", "Please select a business type.");
                return;
              }
              setCurrentStep(1);
            }}
            nextLabel="Continue"
          />
        </div>
      )}

      {/* ── Step 1: Business Info ───────────────────── */}
      {currentStep === 1 && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Registration number — not for individual */}
            {businessType !== "individual" && (
              <>
                <div className="sm:col-span-2">
                  <label className="block text-[12px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                    {businessType === "business_name"
                      ? "Business Name Number (BN)"
                      : "RC Number"}
                  </label>
                  <input
                    disabled={isLocked}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-gray-400 outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder={
                      businessType === "business_name" ? "1234567" : "1234567"
                    }
                    value={infoForm.registration_number}
                    onChange={(e) =>
                      setInfoForm((f) => ({
                        ...f,
                        registration_number: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[12px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                    Incorporation Date
                  </label>
                  <input
                    type="date"
                    disabled={isLocked}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-gray-400 outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    max={new Date().toISOString().split("T")[0]}
                    value={infoForm.incorporation_date}
                    onChange={(e) =>
                      setInfoForm((f) => ({
                        ...f,
                        incorporation_date: e.target.value,
                      }))
                    }
                  />
                </div>
              </>
            )}

            {/* Industry */}
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Industry *
              </label>
              <select
                disabled={isLocked}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-gray-400 outline-none text-sm bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                value={infoForm.business_industry}
                onChange={(e) =>
                  setInfoForm((f) => ({
                    ...f,
                    business_industry: e.target.value,
                  }))
                }
              >
                <option value="">Select industry</option>
                {BUSINESS_INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>

            {/* Monthly Transaction Volume */}
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Monthly Transaction Volume *
              </label>
              <select
                disabled={isLocked}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-gray-400 outline-none text-sm bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                value={infoForm.monthly_transaction_volume}
                onChange={(e) =>
                  setInfoForm((f) => ({
                    ...f,
                    monthly_transaction_volume: e.target.value,
                  }))
                }
              >
                <option value="">Select expected volume</option>
                {MONTHLY_VOLUME_RANGES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Business Description */}
            <div className="sm:col-span-2">
              <label className="block text-[12px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Business Description *
              </label>
              <textarea
                disabled={isLocked}
                rows={3}
                maxLength={1000}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-gray-400 outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed resize-none"
                placeholder="Briefly describe what your business does, the products or services you offer, and who your customers are."
                value={infoForm.business_description}
                onChange={(e) =>
                  setInfoForm((f) => ({
                    ...f,
                    business_description: e.target.value,
                  }))
                }
              />
              <p className="text-[11px] text-gray-400 mt-1 text-right">
                {infoForm.business_description.length}/1000
              </p>
            </div>

            {/* BVN */}
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                BVN *
              </label>
              <input
                disabled={isLocked}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-gray-400 outline-none text-sm font-mono tracking-wider disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="11-digit BVN"
                maxLength={11}
                inputMode="numeric"
                value={infoForm.bvn}
                onChange={(e) =>
                  setInfoForm((f) => ({
                    ...f,
                    bvn: e.target.value.replace(/\D/g, "").slice(0, 11),
                  }))
                }
              />
              {infoForm.bvn && infoForm.bvn.length < 11 && (
                <p className="text-[11px] text-amber-500 mt-1">
                  {11 - infoForm.bvn.length} more digits needed
                </p>
              )}
            </div>

            {/* NIN */}
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                NIN *
              </label>
              <input
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-gray-400 outline-none text-sm font-mono tracking-wider"
                placeholder="11-digit NIN"
                maxLength={11}
                inputMode="numeric"
                value={infoForm.nin}
                onChange={(e) =>
                  setInfoForm((f) => ({
                    ...f,
                    nin: e.target.value.replace(/\D/g, "").slice(0, 11),
                  }))
                }
              />
              {infoForm.nin && infoForm.nin.length < 11 && (
                <p className="text-[11px] text-amber-500 mt-1">
                  {11 - infoForm.nin.length} more digits needed
                </p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Date of Birth *
              </label>
              <input
                type="date"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-gray-400 outline-none text-sm"
                value={infoForm.date_of_birth}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) =>
                  setInfoForm((f) => ({ ...f, date_of_birth: e.target.value }))
                }
              />
              {/* Advisory */}
              <p className="text-[11px] text-amber-600 mt-1.5 flex items-start gap-1.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={11}
                  height={11}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 mt-0.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Must match the date of birth on your BVN record
              </p>
            </div>

            {/* Website */}
            <div className="sm:col-span-2">
              <label className="block text-[12px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Website{" "}
                <span className="normal-case font-normal text-gray-400">
                  (optional)
                </span>
              </label>
              <input
                type="url"
                disabled={isLocked}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-gray-400 outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="https://yourbusiness.com"
                value={infoForm.website}
                onChange={(e) =>
                  setInfoForm((f) => ({ ...f, website: e.target.value }))
                }
              />
            </div>
          </div>

          <WizardNav
            onBack={() => setCurrentStep((s) => s - 1)}
            onNext={() => handleSaveInfo(true)}
            onSave={() => handleSaveInfo(false)}
            saving={saving}
            disabled={isLocked}
            nextLabel="Save & Continue"
          />
        </div>
      )}

      {/* ── Step 2: Address (ALL business types) ── */}
      {currentStep === 2 && (
        <div className="space-y-5">
          <p className="text-sm text-gray-500">
            Provide your{" "}
            {businessType === "limited_liability"
              ? "registered business"
              : businessType === "business_name"
                ? "business"
                : "residential"}{" "}
            address details.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[12px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Street Address
              </label>
              <input
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-gray-400 outline-none text-sm"
                placeholder="12 Adeola Odeku Street"
                value={infoForm.business_address}
                onChange={(e) =>
                  setInfoForm((f) => ({
                    ...f,
                    business_address: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                City
              </label>
              <input
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-gray-400 outline-none text-sm"
                placeholder="Lagos"
                value={infoForm.business_city}
                onChange={(e) =>
                  setInfoForm((f) => ({ ...f, business_city: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                State
              </label>
              <select
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-gray-400 outline-none text-sm bg-white"
                value={infoForm.business_state}
                onChange={(e) =>
                  setInfoForm((f) => ({ ...f, business_state: e.target.value }))
                }
              >
                <option value="">Select state</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <WizardNav
            onBack={() => setCurrentStep((s) => s - 1)}
            onNext={() => handleSaveInfo(true)}
            onSave={() => handleSaveInfo(false)}
            saving={saving}
            nextLabel="Save & Continue"
          />
        </div>
      )}

      {/* ── Step: Documents ─────────────────────────── */}
      {steps[currentStep] === "Documents" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-4">
            Upload the required documents below. You can save progress and
            return later. Accepted: PDF, JPEG, PNG · Max 5MB.
          </p>

          {/* Required first */}
          {data.required_document_types.map((docType) => {
            const doc = data.documents[docType];
            if (!doc) return null;
            return (
              <DocUploadRow
                key={docType}
                label={doc.label}
                hint={doc.hint}
                required={true}
                uploaded={doc.uploaded}
                status={doc.status}
                fileName={doc.file_name}
                url={doc.url}
                rejectionReason={doc.rejection_reason}
                uploading={uploading[docType]}
                uploadProgress={uploadPct[docType]}
                disabled={isLocked}
                onUpload={(file) => handleUploadDoc(docType, file)}
                onDelete={() => handleDeleteDoc(docType)}
              />
            );
          })}

          {/* Optional docs */}
          {Object.entries(data.documents)
            .filter(([k]) => !data.required_document_types.includes(k))
            .map(([docType, doc]) => (
              <DocUploadRow
                key={docType}
                label={doc.label}
                hint={doc.hint}
                required={false}
                uploaded={doc.uploaded}
                status={doc.status}
                fileName={doc.file_name}
                url={doc.url}
                rejectionReason={doc.rejection_reason}
                uploading={uploading[docType]}
                uploadProgress={uploadPct[docType]}
                disabled={isLocked}
                onUpload={(file) => handleUploadDoc(docType, file)}
                onDelete={() => handleDeleteDoc(docType)}
              />
            ))}

          <WizardNav
            onBack={() => setCurrentStep((s) => s - 1)}
            onNext={() => setCurrentStep((s) => s + 1)}
            saving={saving}
            nextLabel="Continue"
          />
        </div>
      )}

      {/* ── Step: Directors ─────────────────────────── */}
      {steps[currentStep] === "Directors" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-gray-600">
                Add all directors, shareholders, and beneficial owners (anyone
                with 5%+ ownership). At least one director is required.
              </p>
            </div>
            <button
              disabled={isLocked}
              onClick={() => {
                if (blockIfLocked()) return;
                setDirectorModal({ open: true, director: null });
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-900"
            >
              <Plus size={14} /> Add Director
            </button>
          </div>

          {data.directors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-2xl text-center">
              <Users size={32} className="text-gray-300 mb-3" />
              <p className="font-medium text-gray-600">
                No directors added yet
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Add at least one director to continue
              </p>
              <button
                disabled={isLocked}
                onClick={() => {
                  if (blockIfLocked()) return;
                  setDirectorModal({ open: true, director: null });
                }}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-900"
              >
                <Plus size={14} /> Add First Director
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {data.directors.map((director) => (
                <div
                  key={director.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-semibold text-gray-700 text-sm shrink-0">
                      {director.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-gray-900">
                          {director.full_name}
                        </p>
                        {director.is_primary && (
                          <span className="text-[10px] font-semibold bg-gray-900 text-white px-2 py-0.5 rounded-full">
                            Primary
                          </span>
                        )}
                        {director.is_pep && (
                          <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                            PEP
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-gray-400 mt-0.5">
                        {director.role_label}
                        {director.ownership_percentage
                          ? ` · ${director.ownership_percentage}% ownership`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {director.is_fully_documented ? (
                      <CheckCircle size={16} className="text-green-500 mr-2" />
                    ) : (
                      <div title="Documents incomplete">
                        <AlertCircle
                          size={16}
                          className="text-amber-400 mr-2"
                        />
                      </div>
                    )}
                    <button
                      disabled={isLocked}
                      onClick={() => {
                        if (blockIfLocked()) return;
                        setDirectorModal({ open: true, director });
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      disabled={isLocked}
                      onClick={() => handleDeleteDirector(director.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <WizardNav
            onBack={() => setCurrentStep((s) => s - 1)}
            onNext={() => {
              if (data.directors.length === 0) {
                showFeedback("err", "Add at least one director to continue.");
                return;
              }
              setCurrentStep((s) => s + 1);
            }}
            nextLabel="Continue"
          />
        </div>
      )}

      {/* ── Step: Director Documents ─────────────────── */}
      {steps[currentStep] === "Director Documents" && (
        <div className="space-y-6">
          <p className="text-sm text-gray-500">
            Upload identity and address documents for each director.
          </p>

          {data.directors.map((director) => (
            <div
              key={director.id}
              className="border border-gray-200 rounded-2xl overflow-hidden"
            >
              {/* Director header */}
              <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border-b border-gray-200">
                <div className="w-9 h-9 rounded-xl bg-gray-200 flex items-center justify-center font-semibold text-gray-700 text-sm">
                  {director.initials}
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">
                    {director.full_name}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {director.role_label}
                  </p>
                </div>
                {director.is_fully_documented && (
                  <CheckCircle size={16} className="text-green-500 ml-auto" />
                )}
              </div>

              {/* Director documents */}
              <div className="p-4 space-y-3">
                {(["government_id", "proof_of_address"] as const).map(
                  (docType) => {
                    const doc = director.documents[docType];
                    const key = `${director.id}_${docType}`;
                    return (
                      <DocUploadRow
                        key={docType}
                        label={doc.label}
                        hint={doc.hint}
                        required={true}
                        uploaded={doc.uploaded}
                        status={doc.status}
                        fileName={doc.file_name}
                        url={doc.url}
                        rejectionReason={doc.rejection_reason}
                        uploading={uploading[key]}
                        uploadProgress={uploadPct[key]}
                        disabled={isLocked}
                        onUpload={(file) =>
                          handleUploadDirectorDoc(director.id, docType, file)
                        }
                      />
                    );
                  },
                )}
              </div>
            </div>
          ))}

          <WizardNav
            onBack={() => setCurrentStep((s) => s - 1)}
            onNext={() => setCurrentStep((s) => s + 1)}
            nextLabel="Continue to Review"
          />
        </div>
      )}

      {/* ── Step: Review & Submit ────────────────────── */}
      {steps[currentStep] === "Review" && (
        <div className="space-y-6">
          <p className="text-sm text-gray-500">
            Review your information before submitting. You can go back to make
            changes.
          </p>

          {/* Business Info Summary */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
              <p className="font-semibold text-sm text-gray-900">
                Business Information
              </p>
            </div>
            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  label: "Business Type",
                  value:
                    BUSINESS_TYPES.find((t) => t.value === data.business_type)
                      ?.label ?? data.business_type,
                },
                {
                  label: "Industry",
                  value: data.business_industry,
                },
                {
                  label: "Monthly Volume",
                  value:
                    MONTHLY_VOLUME_RANGES.find(
                      (r) => r.value === data.monthly_transaction_volume,
                    )?.label ??
                    data.monthly_transaction_volume ??
                    "N/A",
                },
                {
                  label: "Registration Number",
                  value: data.registration_number ?? "N/A",
                },
                {
                  label: "Incorporation Date",
                  value: data.incorporation_date ?? "N/A",
                },
                {
                  label: "BVN",
                  value: data.bvn
                    ? "••••••••" + data.bvn.slice(-3)
                    : "Not provided",
                },
                { label: "Website", value: data.website ?? "N/A" },
                {
                  label: "Address",
                  value:
                    [
                      data.business_address,
                      data.business_city,
                      data.business_state,
                    ]
                      .filter(Boolean)
                      .join(", ") || "N/A",
                },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">
                    {label}
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {value ?? "—"}
                  </p>
                </div>
              ))}
            </div>
            {data.business_description && (
              <div className="px-5 pb-4">
                <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">
                  Business Description
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {data.business_description}
                </p>
              </div>
            )}
          </div>

          {/* Documents Summary */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
              <p className="font-semibold text-sm text-gray-900">Documents</p>
            </div>
            <div className="divide-y divide-gray-100">
              {data.required_document_types.map((docType) => {
                const doc = data.documents[docType];
                return (
                  <div
                    key={docType}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <p className="text-sm text-gray-700">{doc?.label}</p>
                    {doc?.uploaded ? (
                      <span className="flex items-center gap-1 text-[12px] text-green-600 font-medium">
                        <CheckCircle size={13} /> Uploaded
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[12px] text-red-500 font-medium">
                        <AlertCircle size={13} /> Missing
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Directors Summary */}
          {businessType === "limited_liability" &&
            data.directors.length > 0 && (
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                  <p className="font-semibold text-sm text-gray-900">
                    Directors ({data.directors.length})
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {data.directors.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {d.full_name}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {d.role_label}
                        </p>
                      </div>
                      {d.is_fully_documented ? (
                        <span className="flex items-center gap-1 text-[12px] text-green-600 font-medium">
                          <CheckCircle size={13} /> Complete
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[12px] text-amber-500 font-medium">
                          <AlertCircle size={13} /> Incomplete
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Already submitted */}
          {isLocked && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              Already submitted and under review. Editing and resubmission are
              disabled until a decision is made.
            </div>
          )}

          <WizardNav
            onBack={() => setCurrentStep((s) => s - 1)}
            onNext={handleSubmit}
            saving={saving}
            isLast
            disabled={isLocked}
            nextLabel={isLocked ? "Under Review" : "Submit for Review"}
          />
        </div>
      )}

      {/* Director Modal */}
      {directorModal.open && !isLocked && (
        <DirectorModal
          director={directorModal.director}
          onSave={handleSaveDirector}
          onClose={() => setDirectorModal({ open: false, director: null })}
        />
      )}
    </div>
  );
}
