import {
  RiShieldCrossLine,
  RiShieldLine,
  RiShieldStarLine,
  RiShieldCheckLine,
  RiForbid2Line,
} from "react-icons/ri";

const statusConfig = {
  unverified: {
    Icon: <RiShieldCrossLine size={20} />,
    title: "Verification required",
    pill: "Not verified",
    desc: "Your business is unverified. Complete the verification process to unlock all features.",
    cta: true,
    iconClass: "bg-yellow-50 text-yellow-500",
    titleClass: "text-yellow-800",
    pillClass: "bg-yellow-50 text-yellow-800 border border-yellow-200",
    btnClass: "text-yellow-800 border-yellow-200 hover:bg-yellow-50",
  },
  incomplete: {
    Icon: <RiShieldLine size={20} />,
    title: "Verification incomplete",
    pill: "Incomplete",
    desc: "Your verification request is missing information. Please provide the required details.",
    cta: true,
    iconClass: "bg-amber-50 text-amber-500",
    titleClass: "text-amber-800",
    pillClass: "bg-amber-50 text-amber-800 border border-amber-200",
    btnClass: "text-amber-800 border-amber-200 hover:bg-amber-50",
  },
  under_review: {
    Icon: <RiShieldStarLine size={20} />,
    title: "Verification under review",
    pill: "Under review",
    desc: "Your submission is being reviewed. We'll notify you once it is complete.",
    cta: false,
    iconClass: "bg-blue-50 text-blue-500",
    titleClass: "text-blue-800",
    pillClass: "bg-blue-50 text-blue-800 border border-blue-200",
    btnClass: "",
  },
  verified: {
    Icon: <RiShieldCheckLine size={20} />,
    title: "Verification complete",
    pill: "Verified",
    desc: "Your business is verified. You have full access to all features.",
    cta: false,
    iconClass: "bg-green-50 text-green-600",
    titleClass: "text-green-800",
    pillClass: "bg-green-50 text-green-800 border border-green-200",
    btnClass: "",
  },
  rejected: {
    Icon: <RiShieldCrossLine size={20} />,
    title: "Verification rejected",
    pill: "Rejected",
    desc: "Your verification submission was rejected. Review the reason and resubmit your details.",
    cta: true,
    iconClass: "bg-red-50 text-red-500",
    titleClass: "text-red-800",
    pillClass: "bg-red-50 text-red-800 border border-red-200",
    btnClass: "text-red-800 border-red-200 hover:bg-red-50",
  },
  suspended: {
    Icon: <RiForbid2Line size={20} />,
    title: "Business suspended",
    pill: "Suspended",
    desc: "Your business has been suspended. Contact support for more information.",
    cta: false,
    iconClass: "bg-gray-100 text-gray-500",
    titleClass: "text-gray-800",
    pillClass: "bg-gray-100 text-gray-700 border border-gray-200",
    btnClass: "",
  },
} as const;

type Status = keyof typeof statusConfig;

export const BusinessVerificationStatus = ({ status }: { status: Status }) => {
  const {
    Icon,
    title,
    pill,
    desc,
    cta,
    iconClass,
    titleClass,
    pillClass,
    btnClass,
  } = statusConfig[status];

  return (
    <div
      role="alert"
      onClick={() =>
        cta && (location.href = "/dashboard/settings?completeVerification=true")
      }
      className={`rounded-xl border border-border p-4 mb-4 flex flex-col gap-2.5 bg-background ${
        cta ? "cursor-pointer hover:border-border-secondary" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}
        >
          {Icon}
        </div>
        <div>
          <p className={`text-md font-medium ${titleClass}`}>{title}</p>
          <p className="text-md text-muted-foreground">{desc}</p>
        </div>
      </div>

      <span
        className={`self-start ml-12 text-xs font-medium my-1 px-2.5 py-0.5 rounded-full ${pillClass}`}
      >
        {pill}
      </span>

      {cta && (
        <button
          className={`ml-12 self-start text-sm font-medium border rounded-lg px-3.5 py-1.5 ${btnClass}`}
        >
          Complete verification →
        </button>
      )}
    </div>
  );
};
