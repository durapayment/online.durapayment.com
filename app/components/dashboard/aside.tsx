"use client";

import { User, authService } from "@/app/lib/auth";
import { Avatar } from "@heroui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { IoClose } from "react-icons/io5";
import {
  RiCustomerServiceLine,
  RiFileHistoryLine,
  RiHome6Line,
  RiLinksLine,
  RiLogoutBoxLine,
  RiNotificationBadgeLine,
  RiRecordCircleLine,
  RiSendPlaneLine,
  // RiSendPlaneLine,
  RiSettings3Line,
  RiShieldKeyholeLine,
  RiShoppingBag3Line,
  RiWallet3Line,
} from "react-icons/ri";

export const AsideBar = ({ onClose }: { onClose?: () => void }) => {
  const pathName = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const fetchUser = async () => {
    try {
      const { isAuthenticated, user, business, summary } =
        await authService.checkAuth();

      if (isAuthenticated && user) {
        setUser(user);
        setBusiness(business);
        setSummary(summary);
        // console.log("Business fetched:", business);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchUser();
  }, []);
  const listObject = {
    Dashboard: [
      {
        title: "Dashboard",
        icon: <RiHome6Line size={20} />,
        path: "/dashboard",
      },
      {
        title: "Accounts",
        icon: <RiWallet3Line size={20} />,
        path: "/dashboard/accounts",
      },
      {
        title: "Transfer",
        icon: <RiSendPlaneLine size={20} />,
        path: "/dashboard/transfer",
      },
      {
        title: "History",
        icon: <RiFileHistoryLine size={20} />,
        path: "/dashboard/history",
      },
      {
        title: "Customers",
        icon: <RiShoppingBag3Line size={20} />,
        path: "/dashboard/customers",
      },
      {
        title: "Payment Links",
        icon: <RiLinksLine size={20} />,
        path: "/dashboard/payment-links",
      },
    ],
    Integration: [
      {
        title: "Webhooks",
        icon: <RiNotificationBadgeLine size={20} />,
        path: "/dashboard/webhooks",
      },
      {
        title: "Credentials",
        icon: <RiShieldKeyholeLine size={20} />,
        path: "/dashboard/credentials",
      },
      {
        title: "Logs",
        icon: <RiRecordCircleLine size={20} />,
        path: "/dashboard/logs",
      },
    ],
    General: [
      {
        title: "Settings",
        icon: <RiSettings3Line size={20} />,
        path: "/dashboard/settings",
      },
      {
        title: "Help",
        icon: <RiCustomerServiceLine size={20} />,
        path: "/dashboard/help",
      },
      {
        title: "Logout",
        icon: <RiLogoutBoxLine size={20} />,
        path: "/dashboard/logout",
      },
    ],
  };

  return (
    <aside className="h-full flex flex-col w-full px-5 py-5">
      {/* Close button - visible only on mobile */}

      {/* Profile Details */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar>
            <Avatar.Image
              alt="John Doe"
              src="https://img.heroui.chat/image/avatar?w=400&h=400&u=8"
            />
            <Avatar.Fallback>DP</Avatar.Fallback>
          </Avatar>
          <div className="flex flex-col leading-4">
            <div className="flex items-center gap-1 flex-wrap">
              <p className="text-[14px] font-semibold capitalize">
                {user?.first_name}
              </p>
              <p className="text-[14px] font-semibold capitalize">
                {user?.last_name}
              </p>
            </div>
            <p className="text-[12px] opacity-75 uppercase">
              {business?.business_id}
            </p>
          </div>
        </div>
        {onClose && (
          <div className="flex justify-end md:hidden mb-4">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-dashboard-hover"
            >
              <IoClose size={22} />
            </button>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <div className="mt-8 overflow-y-auto scrollbar-hide flex-1 flex flex-col gap-6">
        {Object.entries(listObject).map(([section, items]) => (
          <div key={section}>
            <p className="text-xs text-gray-500 uppercase mb-2">{section}</p>
            <ul className="flex flex-col gap-1">
              {items?.map((item) => (
                <Link
                  href={item.path}
                  key={item.title}
                  onClick={onClose} // Close drawer when link is clicked on mobile
                  className={`flex px-4 py-2 rounded-full hover:bg-dashboard-hover items-center gap-3 text-[15px] cursor-pointer ${
                    pathName === item.path ? "bg-dashboard-hover" : ""
                  }`}
                >
                  {item.icon}
                  {item.title}
                </Link>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
};
