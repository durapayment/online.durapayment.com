"use client";

import {
  RiArrowDownSLine,
  RiArrowUpLongLine,
  RiCalendar2Line,
  RiRefreshLine,
  RiWallet3Line,
  RiTimeLine,
} from "react-icons/ri";
import SalesPerformance from "../components/chart";
import TrafficSource from "../components/dashboard/trafic-source";
import { ProgressCircle, Tabs } from "@heroui/react";
import { TransactionTable } from "../components/dashboard/transaction-table-comp";
import { CustomersTable } from "../components/dashboard/customer-table-comp";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { User, authService } from "../lib/auth";
import { BusinessVerificationStatus } from "../components/business_verification_status";

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
function fmt(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function DashboardPage() {
  const router = useRouter();
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

  // Refresh page
  const refreshPage = () => {
    setLoading(true);
    fetchUser();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center mt-10 flex flex-col items-center">
          <ProgressCircle isIndeterminate aria-label="Loading...">
            <ProgressCircle.Track>
              <ProgressCircle.TrackCircle />
              <ProgressCircle.FillCircle />
            </ProgressCircle.Track>
          </ProgressCircle>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex h-full flex-col items-center pt-5 sm:pt-10 pb-5 sm:pb-8">
      <div className="max-w-310 flex flex-col gap-4 flex-1 w-full">
        {business?.verification_status !== "verified" && (
          <BusinessVerificationStatus status={business?.verification_status} />
        )}

        <div className="mb-5">
          <h1 className="text-[26px] md:text-[30px] font-bold text-gray-900 tracking-tight">
            Payments Dashboard
          </h1>
          <p className="text-[14px] text-gray-500 mt-1">
            Monitor your transactions and access insights to grow your business.
          </p>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 lg:grid-cols-4 grid-rows-1 gap-3">
          {/* Wallet Balance */}
          <div className="bg-field-background h-21 rounded-lg p-2 xl:p-3 leading-5 text-[14px] shadow-sm flex flex-col justify-between">
            <p className="opacity-75 flex items-center gap-1.5">
              <RiWallet3Line size={13} />
              Wallet Balance
            </p>
            <div className="flex items-center justify-between">
              <p className="leading-8 text-[22px] lg:text-[22px] xl:text-[24px] font-semibold">
                ₦{fmt(business?.account_balance)}
              </p>
            </div>
          </div>

          {/* Ledger Balance */}
          <div className="bg-field-background h-21 rounded-lg p-2 xl:p-3 leading-5 text-[14px] shadow-sm flex flex-col justify-between">
            <p className="opacity-75 flex items-center gap-1.5">
              <RiTimeLine size={13} />
              Ledger Balance
            </p>
            <div className="flex items-center justify-between">
              <p className="leading-8 text-[22px] lg:text-[22px] xl:text-[24px] font-semibold">
                ₦{fmt(business?.ledger_balance)}
              </p>
            </div>
            <p className="text-[11px] text-gray-400">Awaiting settlement</p>
          </div>

          {/* Today's Collection */}
          <div className="bg-field-background h-21 rounded-lg p-2 xl:p-3 leading-5 text-[14px] shadow-sm flex flex-col justify-between">
            <p className="opacity-75">Today's Collection</p>
            <div className="flex items-center justify-between">
              <p className="leading-8 text-[22px] lg:text-[22px] xl:text-[24px] font-semibold">
                ₦{fmt(summary?.today_collected)}
              </p>
              <div className="flex items-center text-green-600 rounded-full px-2 py-0.5 gap-0 bg-green-50 ">
                <RiArrowUpLongLine size={12} />
                <p className="text-[13px]">3.3%</p>
              </div>
            </div>
          </div>

          {/* Total Customers */}
          <div className="bg-field-background h-21 rounded-lg p-2 xl:p-3 leading-5 text-[14px] shadow-sm flex flex-col justify-between">
            <p className="opacity-75">Total Customers</p>
            <div className="flex items-center justify-between">
              <p className="leading-8 text-[22px] lg:text-[22px] xl:text-[24px] font-semibold">
                {summary?.total_customers ?? 0}
              </p>
              <div className="flex items-center text-green-600 rounded-full px-2 py-0.5 gap-0 bg-green-50 ">
                <RiArrowUpLongLine size={12} />
                <p className="text-[13px]">3.3%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-field-background gap-4 rounded-lg p-2 xl:p-3 leading-5 text-[14px] shadow-sm flex flex-col">
            <div className="flex items-center justify-between">
              <p className="text-[16px]">Sales Performance</p>
              <div className=" py-1 px-4 gap-3 rounded-lg flex items-center justify-center bg-dashboard-hover">
                <p className="">Last 2 weeks</p>
                <RiArrowDownSLine className="" color="" />
              </div>
            </div>
            <SalesPerformance />
          </div>
          <div className="bg-field-background gap-4 rounded-lg p-2 xl:p-3 leading-5 text-[14px] shadow-sm flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-gray-800 font-semibold text-base">
                Traffic Source
              </span>
              <div className="flex items-center gap-4">
                {/* Legend */}
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1d4ed8] inline-block" />
                    Inflow
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] inline-block" />
                    Outflow
                  </span>
                </div>
                {/* Menu */}
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                  </svg>
                </button>
              </div>
            </div>
            <TrafficSource />
          </div>
        </div>

        {/* Transaction History */}
        <div className="flex flex-col gap-2">
          <p className="text-[16px] font-medium">Most Recent</p>
          {summary?.recent_transactions.length ||
          summary?.recent_customers.length > 0 ? (
            <Tabs className="w-full ">
              <Tabs.ListContainer>
                <Tabs.List className="max-w-md" aria-label="Options">
                  {summary?.recent_transactions.length > 0 && (
                    <Tabs.Tab id="transactions">
                      Transactions
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  )}
                  {summary?.recent_customers.length > 0 && (
                    <Tabs.Tab className="max-w-md" id="customers">
                      Customers
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  )}
                </Tabs.List>
              </Tabs.ListContainer>
              <Tabs.Panel className="pt-4" id="transactions">
                <TransactionTable transactions={summary?.recent_transactions} />
              </Tabs.Panel>
              <Tabs.Panel className="pt-4" id="customers">
                <CustomersTable customers={summary?.recent_customers} />
              </Tabs.Panel>
            </Tabs>
          ) : null}
        </div>

        <div className="h-5"></div>
      </div>
    </div>
  );
}
