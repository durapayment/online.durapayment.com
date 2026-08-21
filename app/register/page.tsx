"use client";
import React, { useState, useRef, useEffect } from "react";
import { BsFileEarmarkPerson } from "react-icons/bs";
import { MdOutlineBusiness } from "react-icons/md";
import {
  RiCheckboxCircleLine,
  RiCheckboxBlankCircleLine,
  RiInformation2Line,
} from "react-icons/ri";
import { Button } from "../components/button";
import Link from "next/link";
import {
  Button as HeroButton,
  Input,
  Label,
  Modal,
  ProgressBar,
  Surface,
  TextField,
} from "@heroui/react";
import { IoMdClose } from "react-icons/io";
import { HiEye, HiEyeOff } from "react-icons/hi";
import { useRouter } from "next/navigation";
import { FaRocket } from "react-icons/fa";
import { CBNBadge } from "../components/cbnbadge";

type AccountType = "individual" | "business" | "";

interface Step1Data {
  country: string;
  email: string;
  accountType: AccountType;
  referral: string;
  business_name: string;
  emailotp: string;
}

interface Step2Data {
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface Step1Errors {
  country: string;
  email: string;
  accountType: string;
  referral: string;
  business_name: string;
  emailotp: string;
}

interface Step2Errors {
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const COUNTRIES = [
  "Nigeria",
  // "Ghana",
  // "Kenya",
  // "South Africa",
  // "Uganda",
  // "Tanzania",
  // "Rwanda",
  // "Senegal",
  // "Côte d'Ivoire",
  // "Ethiopia",
];

// ─── Step 2 Component ────────────────────────────────────────────────────────

interface Step2Props {
  accountType: AccountType;
  step1Data: Step1Data; // ← receive full Step 1 data
  onBack: () => void;
}

function Step2({ accountType, step1Data, onBack }: Step2Props) {
  const router = useRouter();

  const [formData, setFormData] = useState<Step2Data>({
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Step2Errors>({
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  // ── General (non-field-specific) error — for server/backend
  //    failures that aren't Laravel validation errors and shouldn't
  //    be blamed on any one input field. ─────────────────────────
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (field: keyof Step2Data, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    }
  };

  const validateField = (field: keyof Step2Data, value: string): string => {
    switch (field) {
      case "firstName":
        return value.trim() ? "" : "First name is required.";
      case "lastName":
        return value.trim() ? "" : "Last name is required.";
      case "phone":
        if (!value.trim()) return "Phone number is required.";
        if (!/^\+?[0-9\s\-()]{7,15}$/.test(value))
          return "Enter a valid phone number.";
        return "";
      case "password":
        if (!value) return "Password is required.";
        if (value.length < 8) return "Password must be at least 8 characters.";
        if (!/[A-Z]/.test(value))
          return "Include at least one uppercase letter.";
        if (!/[0-9]/.test(value)) return "Include at least one number.";
        return "";
      case "confirmPassword":
        if (!value) return "Please confirm your password.";
        if (value !== formData.password) return "Passwords do not match.";
        return "";
      default:
        return "";
    }
  };

  const getPasswordStrength = (
    pass: string,
  ): { label: string; color: string; width: string } => {
    if (!pass) return { label: "", color: "", width: "0%" };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { label: "Weak", color: "#ef4444", width: "25%" };
    if (score === 2) return { label: "Fair", color: "#f59e0b", width: "50%" };
    if (score === 3) return { label: "Good", color: "#3b82f6", width: "75%" };
    return { label: "Strong", color: "#22c55e", width: "100%" };
  };

  const strength = getPasswordStrength(formData.password);

  const handleSubmit = async () => {
    setGeneralError(null);

    const newErrors = {} as Step2Errors;
    let hasError = false;

    for (const field of [
      "firstName",
      "lastName",
      "phone",
      "password",
      "confirmPassword",
    ] as (keyof Step2Data)[]) {
      const err = validateField(field, formData[field]);
      newErrors[field] = err;
      if (err) hasError = true;
    }

    setErrors(newErrors);
    if (hasError) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          // Step 2 fields
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone_number: formData.phone,
          password: formData.password,

          // Step 1 fields passed through
          business_type: step1Data.accountType,
          country: step1Data.country,
          email: step1Data.email,
          business_name: step1Data.business_name,
          referral: step1Data.referral,
        }),
      });

      const result = await response.json();
      console.log("Registration response:", result);

      if (!response.ok) {
        if (result.errors) {
          const apiErrors: Partial<Step2Errors> = {};
          const unmatchedMessages: string[] = [];

          for (const key in result.errors) {
            if (key === "first_name")
              apiErrors.firstName = result.errors[key][0];
            else if (key === "last_name")
              apiErrors.lastName = result.errors[key][0];
            else if (key === "phone_number")
              apiErrors.phone = result.errors[key][0];
            else if (key === "password")
              apiErrors.password = result.errors[key][0];
            else unmatchedMessages.push(result.errors[key][0]); // ← catch email, etc.
          }

          setErrors((prev) => ({ ...prev, ...apiErrors }));

          // ── Any error for a field this component doesn't have its own
          //    input for (e.g. email, which lives on Step 1) — show it as
          //    a general banner instead of silently dropping it. ────────
          if (unmatchedMessages.length > 0) {
            setGeneralError(unmatchedMessages.join(" "));
          }
        } else {
          setGeneralError(
            result.message || "Registration failed. Please try again.",
          );
        }
        return;
      }

      setSuccess(true);
      router.push("/dashboard");
    } catch {
      setGeneralError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-154 w-full flex flex-col gap-8 px-0 md:px-10 py-10">
      <div className="flex flex-col gap-1">
        <p className="text-[28px] leading-8 font-semibold">
          Tell us about yourself
        </p>
        <p className="text-[13px]">
          Fill in your details to complete account setup.
        </p>
      </div>

      {success && (
        <div className="rounded-md bg-green-50 border border-green-300 px-4 py-3 text-sm text-green-800">
          Account created successfully! Redirecting you to your dashboard...
        </div>
      )}

      {generalError && (
        <div className="rounded-md bg-red-50 border border-red-300 px-4 py-3 text-sm text-red-700">
          {generalError}
        </div>
      )}

      {/* First Name + Last Name */}
      <div className="flex gap-3 w-full">
        <div className="flex flex-col gap-1 flex-1">
          <p className="text-[13px]">First Name</p>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
            onBlur={() =>
              setErrors((prev) => ({
                ...prev,
                firstName: validateField("firstName", formData.firstName),
              }))
            }
            placeholder="John"
            className={`rounded-md border bg-white px-3 py-3 text-sm text-black focus:outline-none transition-all ${
              errors.firstName
                ? "border-red-400 ring-1 ring-red-200"
                : "border-neutral-300 focus:border-secondary focus:ring-1 focus:ring-secondary/10"
            }`}
          />
          {errors.firstName && (
            <p className="text-[12px] text-red-500">{errors.firstName}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <p className="text-[13px]">Last Name</p>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
            onBlur={() =>
              setErrors((prev) => ({
                ...prev,
                lastName: validateField("lastName", formData.lastName),
              }))
            }
            placeholder="Doe"
            className={`rounded-md border bg-white px-3 py-3 text-sm text-black focus:outline-none transition-all ${
              errors.lastName
                ? "border-red-400 ring-1 ring-red-200"
                : "border-neutral-300 focus:border-secondary focus:ring-1 focus:ring-secondary/10"
            }`}
          />
          {errors.lastName && (
            <p className="text-[12px] text-red-500">{errors.lastName}</p>
          )}
        </div>
      </div>

      {/* Phone Number */}
      <div className="flex flex-col gap-1 w-full">
        <p className="text-[13px]">Phone Number</p>
        <div
          className={`flex items-center gap-2 rounded-md border bg-white px-3 py-3 transition-all ${
            errors.phone
              ? "border-red-400 ring-1 ring-red-200"
              : "border-neutral-300 focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary/10"
          }`}
        >
          <span className="text-sm text-neutral-500 border-r border-neutral-200 pr-2 mr-1 whitespace-nowrap">
            🇳🇬 +234
          </span>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            onBlur={() =>
              setErrors((prev) => ({
                ...prev,
                phone: validateField("phone", formData.phone),
              }))
            }
            placeholder="801 234 5678"
            className="w-full text-sm text-black focus:outline-none"
          />
        </div>
        {errors.phone && (
          <p className="text-[12px] text-red-500">{errors.phone}</p>
        )}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1 w-full">
        <p className="text-[13px]">Password</p>
        <div
          className={`flex items-center gap-2 rounded-md border bg-white px-3 py-3 transition-all ${
            errors.password
              ? "border-red-400 ring-1 ring-red-200"
              : "border-neutral-300 focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary/10"
          }`}
        >
          <input
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={(e) => handleChange("password", e.target.value)}
            onBlur={() =>
              setErrors((prev) => ({
                ...prev,
                password: validateField("password", formData.password),
              }))
            }
            placeholder="Min. 8 characters"
            className="w-full text-sm text-black focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            {showPassword ? <HiEyeOff size={18} /> : <HiEye size={18} />}
          </button>
        </div>

        {formData.password && (
          <div className="mt-1.5 flex flex-col gap-1">
            <div className="h-1 w-full rounded-full bg-neutral-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: strength.width,
                  backgroundColor: strength.color,
                }}
              />
            </div>
            <p className="text-[11px]" style={{ color: strength.color }}>
              {strength.label} password
            </p>
          </div>
        )}

        {errors.password && (
          <p className="text-[12px] text-red-500">{errors.password}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div className="flex flex-col gap-1 w-full">
        <p className="text-[13px]">Confirm Password</p>
        <div
          className={`flex items-center gap-2 rounded-md border bg-white px-3 py-3 transition-all ${
            errors.confirmPassword
              ? "border-red-400 ring-1 ring-red-200"
              : "border-neutral-300 focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary/10"
          }`}
        >
          <input
            type={showConfirm ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={(e) => handleChange("confirmPassword", e.target.value)}
            onBlur={() =>
              setErrors((prev) => ({
                ...prev,
                confirmPassword: validateField(
                  "confirmPassword",
                  formData.confirmPassword,
                ),
              }))
            }
            placeholder="Re-enter your password"
            className="w-full text-sm text-black focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((p) => !p)}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            {showConfirm ? <HiEyeOff size={18} /> : <HiEye size={18} />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-[12px] text-red-500">{errors.confirmPassword}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col mt-4 gap-4">
        <Button
          title="Create Account"
          action={handleSubmit}
          isLoading={isLoading}
          disabled={isLoading || success}
        />
        <button
          type="button"
          onClick={onBack}
          className="text-center text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
        >
          ← Back to previous step
        </button>
      </div>
    </div>
  );
}

// ─── Main Register Page ───────────────────────────────────────────────────────

export default function RegisterPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [otp, setOtp] = useState("");
  const [formData, setFormData] = useState<Step1Data>({
    country: "",
    email: "",
    accountType: "",
    referral: "",
    business_name: "",
    emailotp: "",
  });

  const [errors, setErrors] = useState<Step1Errors>({
    country: "",
    email: "",
    accountType: "",
    referral: "",
    business_name: "",
    emailotp: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (isOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [isOpen]);

  const filteredCountries = COUNTRIES.filter((c) =>
    c.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const validateEmail = (val: string) => {
    if (!val) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))
      return "Enter a valid email address.";
    return "";
  };

  const validateOtp = (val: string) => {
    if (!val) return "OTP is required.";
    if (!/^\d{6}$/.test(val)) return "OTP must be 6 digits.";
    return "";
  };

  const validateBusinessName = (val: string, accountType: AccountType) => {
    if (accountType === "business" && !val.trim())
      return "Business name is required for registered business accounts.";
    return "";
  };

  const validateField = (name: keyof Step1Data, value: string): string => {
    switch (name) {
      case "country":
        return value ? "" : "Please select a country.";
      case "email":
        return validateEmail(value);
      case "accountType":
        return value ? "" : "Please select an account type.";
      case "business_name":
        return validateBusinessName(value, formData.accountType);
      default:
        return "";
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, email: value }));
    setEmailVerified(false);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: validateEmail(value) }));
    }
  };

  const handleBusinessNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, business_name: value }));
    if (errors.business_name) {
      setErrors((prev) => ({
        ...prev,
        business_name: validateBusinessName(value, formData.accountType),
      }));
    }
  };

  const handleEmailBlur = () => {
    setErrors((prev) => ({ ...prev, email: validateEmail(formData.email) }));
  };

  const handleBusinessNameBlur = () => {
    setErrors((prev) => ({
      ...prev,
      business_name: validateBusinessName(
        formData.business_name,
        formData.accountType,
      ),
    }));
  };

  const handleVerifyEmail = async () => {
    const err = validateEmail(formData.email);
    if (err) {
      setErrors((prev) => ({ ...prev, email: err }));
      return;
    }
    setEmailVerifying(true);

    try {
      const response = await fetch("/api/verify/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: formData.email }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrors((prev) => ({
          ...prev,
          email:
            result.message || "Email verification failed. Please try again.",
        }));
        return;
      }

      setOtp("");
      setIsModalOpen(true);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        email: "Network error. Please check your connection and try again.",
      }));
    } finally {
      setEmailVerifying(false);
    }
  };

  const handleVerifyOtp = async () => {
    const err = validateEmail(formData.email);
    if (err) {
      setErrors((prev) => ({ ...prev, email: err }));
      return;
    }
    const otpErr = validateOtp(otp);
    if (otpErr) {
      setErrors((prev) => ({ ...prev, emailotp: otpErr }));
      return;
    }
    setOtpVerifying(true);

    try {
      const response = await fetch("/api/verify/email/otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: formData.email, otp }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrors((prev) => ({
          ...prev,
          emailotp:
            result.message || "OTP verification failed. Please try again.",
        }));
        return;
      }

      setOtp("");
      setEmailVerified(true);
      setIsModalOpen(false);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        emailotp: "Network error. Please check your connection and try again.",
      }));
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleCancelOtp = () => {
    setOtp("");
    setErrors((prev) => ({ ...prev, emailotp: "" }));
    setIsModalOpen(false);
    setOtpVerifying(false);
    setEmailVerified(false);
  };

  const handleSelectCountry = (country: string) => {
    setFormData((prev) => ({ ...prev, country }));
    setErrors((prev) => ({ ...prev, country: "" }));
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleSelectAccountType = (type: AccountType) => {
    setFormData((prev) => ({ ...prev, accountType: type }));
    setErrors((prev) => ({ ...prev, accountType: "" }));
    // Re-validate business_name when account type changes
    if (type === "individual") {
      setErrors((prev) => ({ ...prev, business_name: "" }));
    }
  };

  const handleStep1Submit = async () => {
    const newErrors: Step1Errors = {
      country: validateField("country", formData.country),
      email: validateField("email", formData.email),
      accountType: validateField("accountType", formData.accountType),
      referral: "",
      business_name: validateBusinessName(
        formData.business_name,
        formData.accountType,
      ),
      emailotp: "",
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    if (!emailVerified) {
      setErrors((prev) => ({
        ...prev,
        email: "Please verify your email before continuing.",
      }));
      return;
    }

    setIsLoading(true);
    await new Promise((res) => setTimeout(res, 600));
    setIsLoading(false);
    setStep(2);
  };

  const progressValue = step === 1 ? 50 : 100;

  return (
    <div className="px-5 md:px-20 h-full flex flex-col flex-1 py-5 md:py-7">
      {/* Progress Bar */}
      <div className="flex items-center gap-5 justify-between mb-4">
        <Link href={"/"} className="flex min-w-max items-center gap-2">
          <img src="./logo.png" width={37} alt="logo" />
          <div className="flex flex-col">
            <p className="text-[18px] uppercase hidden md:flex font-bold text-accent-deep whitespace-nowrap">
              Dura Payment
            </p>
          </div>
        </Link>
        <ProgressBar
          aria-label="Registration progress"
          size="lg"
          className="w-full"
          value={progressValue}
        >
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
        <Link href="/" className="">
          <IoMdClose size={28} />
        </Link>
      </div>

      <div className="flex flex-col items-center">
        {step === 1 ? (
          <div className="max-w-154 w-full flex flex-col gap-8 px-0 md:px-10 py-10">
            <div className="flex flex-col gap-1">
              <p className="text-[28px] leading-8 font-semibold">
                What type of account would you like to create?
              </p>
              <p className="text-[13px]">
                Choose the option that fits your organization.
              </p>
            </div>

            {/* Country Dropdown */}
            <div className="flex flex-col gap-1 w-full">
              <p className="text-[13px]">Country</p>
              <div className="relative" ref={dropdownRef}>
                <div
                  onClick={() => setIsOpen((prev) => !prev)}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-md border bg-white px-3 py-3 text-sm transition-all ${
                    errors.country
                      ? "border-red-400 ring-1 ring-red-200"
                      : isOpen
                        ? "border-secondary ring-1 ring-secondary/10"
                        : "border-neutral-300"
                  }`}
                >
                  <span
                    className={
                      formData.country
                        ? "text-gray-900 text-sm"
                        : "text-neutral-400 text-sm"
                    }
                  >
                    {formData.country || "Select country"}
                  </span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    fill="none"
                    className={`transition-transform duration-200 text-neutral-400 ${isOpen ? "rotate-180" : ""}`}
                  >
                    <path
                      d="M6 8L10 12L14 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {isOpen && (
                  <div className="absolute z-20 mt-1 w-full rounded-md border border-neutral-200 bg-white shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-neutral-100">
                      <input
                        ref={searchRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search country..."
                        className="w-full text-sm px-2 py-1.5 rounded border border-neutral-200 focus:outline-none focus:border-secondary"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredCountries.length > 0 ? (
                        filteredCountries.map((country) => (
                          <div
                            key={country}
                            onClick={() => handleSelectCountry(country)}
                            className={`cursor-pointer px-3 py-2.5 text-sm hover:bg-neutral-100 flex items-center justify-between ${
                              formData.country === country
                                ? "bg-secondary/5 text-secondary font-medium"
                                : "text-neutral-700"
                            }`}
                          >
                            {country}
                            {formData.country === country && (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="px-3 py-3 text-sm text-neutral-400">
                          No countries found.
                        </p>
                      )}
                    </div>
                  </div>
                )}
                <input type="hidden" name="country" value={formData.country} />
              </div>
              {errors.country && (
                <p className="text-[12px] text-red-500 mt-1">
                  {errors.country}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1 w-full">
              <p className="text-[13px]">Enter a valid email address</p>
              <div
                className={`flex items-center gap-2 rounded-md border bg-white px-3 py-3 transition-all ${
                  errors.email
                    ? "border-red-400 ring-1 ring-red-200"
                    : "border-neutral-300 focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary/10"
                }`}
              >
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  placeholder="business@xyz.com"
                  autoComplete="email"
                  className="w-full text-sm text-black focus:outline-none"
                />
                {emailVerified ? (
                  <span className="flex items-center gap-1 text-[13px] font-medium text-green-600 whitespace-nowrap">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Verified
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleVerifyEmail}
                    disabled={emailVerifying}
                    className="cursor-pointer text-[13px] font-medium text-secondary hover:text-tertiary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {emailVerifying ? (
                      <>
                        <svg
                          className="animate-spin"
                          width={13}
                          height={13}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path
                            d="M12 2a10 10 0 1 0 10 10"
                            strokeLinecap="round"
                            opacity={0.3}
                          />
                          <path
                            d="M12 2a10 10 0 0 1 10 10"
                            strokeLinecap="round"
                          />
                        </svg>
                        Verifying...
                      </>
                    ) : (
                      "VERIFY"
                    )}
                  </button>
                )}
              </div>
              {errors.email && (
                <p className="text-[12px] text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            {/* Business Name */}
            <div className="flex flex-col gap-1 w-full">
              <p className="text-[13px]">
                Business Name{" "}
                {formData.accountType !== "business" && (
                  <span className="text-neutral-400">(Optional)</span>
                )}
              </p>
              <div
                className={`flex items-center gap-2 rounded-md border bg-white px-3 py-3 transition-all ${
                  errors.business_name
                    ? "border-red-400 ring-1 ring-red-200"
                    : "border-neutral-300 focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary/10"
                }`}
              >
                <input
                  type="text"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleBusinessNameChange}
                  onBlur={handleBusinessNameBlur}
                  placeholder="eg, Sample Tech Ltd"
                  autoComplete="organization"
                  className="w-full text-sm text-black focus:outline-none"
                />
              </div>
              {errors.business_name && (
                <p className="text-[12px] text-red-500 mt-1">
                  {errors.business_name}
                </p>
              )}
            </div>

            {/* Account Type */}
            <div className="flex flex-col gap-1 w-full">
              <p className="text-[13px]">I'm creating an account for:</p>
              <div className="flex flex-col gap-3">
                <div
                  onClick={() => handleSelectAccountType("individual")}
                  className={`flex items-center cursor-pointer justify-between gap-3 rounded-md border px-3 py-3 transition-all ${
                    formData.accountType === "individual"
                      ? "border-secondary bg-secondary/5 ring-1 ring-secondary/10"
                      : errors.accountType
                        ? "border-red-300 bg-white"
                        : "border-neutral-300 bg-white hover:border-neutral-400"
                  }`}
                >
                  <BsFileEarmarkPerson
                    size={37}
                    className={
                      formData.accountType === "individual"
                        ? "text-secondary"
                        : "text-neutral-500"
                    }
                  />
                  <div className="flex-1">
                    <p className="text-[15px] font-semibold">
                      Individual Account
                    </p>
                    <p className="text-[13px] opacity-75">
                      Designed for unregistered businesses. Anyone selling,
                      building, or offering services without a formal CAC
                      registration.
                    </p>
                  </div>
                  {formData.accountType === "individual" ? (
                    <RiCheckboxCircleLine
                      size={28}
                      className="text-secondary shrink-0"
                    />
                  ) : (
                    <RiCheckboxBlankCircleLine
                      size={28}
                      className="text-neutral-400 shrink-0"
                    />
                  )}
                </div>

                <div
                  onClick={() => handleSelectAccountType("business")}
                  className={`flex items-center cursor-pointer justify-between gap-3 rounded-md border px-3 py-3 transition-all ${
                    formData.accountType === "business"
                      ? "border-secondary bg-secondary/5 ring-1 ring-secondary/10"
                      : errors.accountType
                        ? "border-red-300 bg-white"
                        : "border-neutral-300 bg-white hover:border-neutral-400"
                  }`}
                >
                  <MdOutlineBusiness
                    size={40}
                    className={
                      formData.accountType === "business"
                        ? "text-secondary"
                        : "text-neutral-500"
                    }
                  />
                  <div className="flex-1">
                    <p className="text-[15px] font-semibold">
                      Registered Business Account
                    </p>
                    <p className="text-[13px] opacity-75">
                      For CAC-registered businesses. Companies officially
                      registered with the Corporate Affairs Commission and
                      operating under formal structures.
                    </p>
                  </div>
                  {formData.accountType === "business" ? (
                    <RiCheckboxCircleLine
                      size={28}
                      className="text-secondary shrink-0"
                    />
                  ) : (
                    <RiCheckboxBlankCircleLine
                      size={28}
                      className="text-neutral-400 shrink-0"
                    />
                  )}
                </div>
              </div>
              {errors.accountType && (
                <p className="text-[12px] text-red-500 mt-1">
                  {errors.accountType}
                </p>
              )}
            </div>

            {/* Referral Code */}
            <div className="flex flex-col gap-1 w-full">
              <p className="text-[13px]">
                Referral Code{" "}
                <span className="text-neutral-400">(Optional)</span>
              </p>
              <div className="flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-3 focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary/10 transition-all">
                <input
                  type="text"
                  name="referral"
                  value={formData.referral}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      referral: e.target.value,
                    }))
                  }
                  placeholder="Enter a referral code"
                  className="w-full text-sm text-black focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex flex-col mt-4 gap-4">
                <Button
                  title="Let's get started"
                  action={handleStep1Submit}
                  isLoading={isLoading}
                  disabled={isLoading}
                />
                <p className="text-center text-sm">
                  Already have an account?{" "}
                  <a
                    href="/"
                    className="text-secondary hover:text-tertiary font-medium"
                  >
                    Login here
                  </a>
                </p>
              </div>
              <CBNBadge />
            </div>
          </div>
        ) : (
          <Step2
            accountType={formData.accountType}
            step1Data={formData} // ← pass full Step 1 data
            onBack={() => setStep(1)}
          />
        )}
      </div>

      <Modal isOpen={isModalOpen}>
        <Modal.Backdrop>
          <Modal.Container className={"w-full"} size="lg" placement="top">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Icon className="bg-accent-soft text-accent-soft-foreground">
                  <RiInformation2Line size={24} />
                </Modal.Icon>
                <Modal.Heading className="font-black mt-2 text-[18px]">
                  Enter OTP
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="flex flex-col mt-2 gap-3">
                  <p className="text-[16px] text-black opacity-80">
                    A confirmation code has been sent to your email address at{" "}
                    <strong>{formData.email}</strong>
                  </p>

                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-black opacity-80">
                      Enter confirmation code
                    </p>
                    <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-3 transition-all">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="\d*"
                        name="emailotp"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        autoComplete="one-time-code"
                        maxLength={6}
                        className="w-full text-sm text-black focus:outline-none"
                      />
                    </div>
                    {errors.emailotp && (
                      <p className="text-[12px] text-red-500 mt-1">
                        {errors.emailotp}
                      </p>
                    )}
                  </div>
                </div>
              </Modal.Body>
              <Modal.Footer className="mt-6">
                <HeroButton
                  className={"rounded-sm px-8 py-5"}
                  slot="close"
                  variant="outline"
                  onPress={() => handleCancelOtp()}
                >
                  Cancel
                </HeroButton>
                <HeroButton
                  isDisabled={otp.length !== 6}
                  className={"rounded-sm text-white px-8 py-5"}
                  slot="close"
                  isPending={otpVerifying}
                  onPress={() => handleVerifyOtp()}
                >
                  Verify
                </HeroButton>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
