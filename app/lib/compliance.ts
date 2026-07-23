// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export type BusinessType = "individual" | "business_name" | "limited_liability";

export type VerificationStatus =
  | "unverified"
  | "incomplete"
  | "under_review"
  | "verified"
  | "rejected"
  | "suspended";

export type DocumentStatus =
  | "pending"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | null;

export type DirectorRole =
  | "director"
  | "shareholder"
  | "beneficial_owner"
  | "secretary";

export interface ComplianceDocument {
  type: string;
  label: string;
  hint: string;
  required: boolean;
  uploaded: boolean;
  status: DocumentStatus;
  url: string | null;
  file_name: string | null;
  rejection_reason: string | null;
  uploaded_at: string | null;
}

export interface DirectorDocument {
  label: string;
  hint: string;
  uploaded: boolean;
  url: string | null;
  file_name: string | null;
  status: DocumentStatus;
  rejection_reason: string | null;
}

export interface Director {
  id: string;
  full_name: string;
  initials: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  nationality: string;
  bvn: string | null;
  nin: string | null;
  role: DirectorRole;
  role_label: string;
  ownership_percentage: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  is_pep: boolean;
  is_primary: boolean;
  is_fully_documented: boolean;
  verification_status: string;
  documents: {
    government_id: DirectorDocument;
    proof_of_address: DirectorDocument;
  };
}

export interface ComplianceProgress {
  total: number;
  completed: number;
  percent: number;
}

export interface ComplianceData {
  business_type: BusinessType | null;
  business_industry: string | null;
  registration_number: string | null;
  bvn: string | null;
  website: string | null;
  business_address: string | null;
  business_city: string | null;
  business_state: string | null;
  business_country: string | null;
  verification_status: VerificationStatus;
  compliance_step: number;
  submitted_at: string | null;
  rejection_reason: string | null;
  progress: ComplianceProgress;
  documents: Record<string, ComplianceDocument>;
  directors: Director[];
  required_document_types: string[];
}

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────

export const BUSINESS_TYPES: {
  value: BusinessType;
  label: string;
  description: string;
}[] = [
  {
    value: "individual",
    label: "Individual",
    description: "You operate as a personal/freelance business",
  },
  {
    value: "business_name",
    label: "Business Name (BN)",
    description: "Registered sole proprietorship or partnership",
  },
  {
    value: "limited_liability",
    label: "Limited Liability Company (RC)",
    description: "Incorporated company registered with CAC",
  },
];

export const BUSINESS_INDUSTRIES = [
  "Fintech",
  "E-commerce",
  "Logistics",
  "Healthcare",
  "Education",
  "Agriculture",
  "Real Estate",
  "Media & Entertainment",
  "Travel & Hospitality",
  "Manufacturing",
  "Other",
];

export const DIRECTOR_ROLES: { value: DirectorRole; label: string }[] = [
  { value: "director", label: "Director" },
  { value: "shareholder", label: "Shareholder" },
  { value: "beneficial_owner", label: "Beneficial Owner" },
  { value: "secretary", label: "Company Secretary" },
];

export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

// Which steps exist per business type
export const STEPS_BY_TYPE: Record<BusinessType, string[]> = {
  individual: [
    "Business Type",
    "Personal Info",
    "Address",
    "Documents",
    "Review",
  ],
  business_name: [
    "Business Type",
    "Business Info",
    "Address",
    "Documents",
    "Review",
  ],
  limited_liability: [
    "Business Type",
    "Business Info",
    "Address",
    "Documents",
    "Directors",
    "Director Documents",
    "Review",
  ],
};

// API base
export const API_BASE = "/api/business";
