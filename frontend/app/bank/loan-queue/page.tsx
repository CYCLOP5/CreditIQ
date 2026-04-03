"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/dib/authContext";
import { loanApi, permApi } from "@/dib/api";
import { PageHeader, StatusBadge, RiskBadge } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Eye,
  Send,
  IndianRupee,
  Calendar,
  Building2,
} from "lucide-react";
import { cn } from "@/dib/utils";

function fmtINR(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function BankLoanQueue() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [loans, setLoans] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);

  const bankId = user?.bank_id;

  useEffect(() => {
    if (!bankId) return;
    loanApi.list({ bank_id: bankId }).then(setLoans).catch(() => {});
    permApi.list().then(setPermissions).catch(() => {});
  }, [bankId]);

  useEffect(() => {


    if (!user || user.role !== "loan_officer") {


      router.push("/unauthorized");


    }


  }, [user, router]);


  if (!user || user.role !== "loan_officer") {


    return null;


  }

  const bankLoans = loans;

  const getPermission = (lrId: string) =>
    permissions.find((p: any) => p.loan_request_id === lrId);

  const requestAccess = async (lrId: string) => {
    if (!user.bank_id) return;
    try {
      const perm = await permApi.create({
        loan_request_id: lrId,
        bank_id: user.bank_id,
      });
      setPermissions((prev) => [...prev, perm]);
    } catch {}
  };

  const tabFiltered = bankLoans.filter((lr: any) => {
    if (tab === "pending")
      return ["submitted", "bank_reviewing"].includes(lr.status);
    if (tab === "awaiting")
      return ["permission_requested", "data_permission_requested"].includes(lr.status);
    if (tab === "decided") return ["approved", "denied"].includes(lr.status);
    return true;
  });

  const displayed = tabFiltered.filter(
    (lr: any) =>
      (lr.gstin_masked ?? lr.gstin ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (lr.bank_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (lr.purpose ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Loan Queue"
        description="Review and process loan requests submitted to your bank"
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total", count: bankLoans.length, color: "bg-card border-border" },
          {
            label: "Pending",
            count: bankLoans.filter((l: any) =>
              ["submitted", "bank_reviewing"].includes(l.status),
            ).length,
            color: "bg-blue-50 border-blue-200 text-blue-700",
          },
          {
            label: "Awaiting",
            count: bankLoans.filter((l: any) =>
              ["permission_requested", "data_permission_requested"].includes(l.status),
            ).length,
            color: "bg-amber-50 border-amber-200 text-amber-700",
          },
          {
            label: "Decided",
            count: bankLoans.filter((l: any) =>
              ["approved", "denied"].includes(l.status),
            ).length,
            color: "bg-emerald-50 border-emerald-200 text-emerald-700",
          },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by GSTIN, purpose..."
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
          <TabsTrigger value="awaiting">Awaiting Permission</TabsTrigger>
          <TabsTrigger value="decided">Decision Made</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          <div className="space-y-3">
            {displayed.length === 0 && (
              <Card className="border-border shadow-sm">
                <CardContent className="p-10 text-center text-muted-foreground text-sm">
                  No requests in this category.
                </CardContent>
              </Card>
            )}
            {displayed.map((loan: any) => {
              const perm = getPermission(loan.id);
              const permStatus = perm?.status ?? "not_requested";
              const permGranted = permStatus === "granted";

              return (
                <Card
                  key={loan.id}
                  className="border-border shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-sm font-semibold text-foreground">
                            {permGranted ? loan.gstin : (loan.gstin_masked ?? loan.gstin)}
                          </span>
                          <StatusBadge status={loan.status} />
                          <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded">
                            {loan.loan_type?.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {loan.purpose}
                        </p>
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1 text-xs text-foreground font-medium">
                            <IndianRupee className="w-3 h-3" />
                            {fmtINR(loan.amount_requested)}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {new Date(loan.created_at).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0 items-end">
                        {permStatus === "not_requested" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1"
                            onClick={() => requestAccess(loan.id)}
                          >
                            <Send className="w-3 h-3" />
                            Request Data Access
                          </Button>
                        )}
                        {permStatus === "pending" && (
                          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            Pending Owner Approval
                          </span>
                        )}
                        {permGranted && (
                          <Button
                            size="sm"
                            className="text-xs gap-1 bg-primary hover:bg-primary/90"
                            onClick={() => router.push(`/bank/msme/${loan.id}`)}
                          >
                            <Eye className="w-3 h-3" />
                            View Profile
                          </Button>
                        )}
                        {permStatus === "denied" && (
                          <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                            Permission Denied
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
