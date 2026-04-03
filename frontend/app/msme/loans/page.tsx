"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/dib/authContext";
import { loanApi, permApi, bankApi } from "@/dib/api";
import { PageHeader, StatusBadge, formatINR } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  IndianRupee,
} from "lucide-react";

function fmtINR(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function MsmeLoans() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("my-requests");
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    bank_id: "",
    loan_type: "",
    amount: "",
    purpose: "",
  });
  const [loans, setLoans] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);

  const gstin = user?.gstin;

  useEffect(() => {
    if (!gstin) return;
    loanApi.list({ gstin }).then(setLoans).catch(() => {});
    permApi.list({ gstin }).then(setPermissions).catch(() => {});
    bankApi.list().then(setBanks).catch(() => {});
  }, [gstin]);

  if (!user || user.role !== "msme") {
    router.push("/unauthorized");
    return null;
  }

  const myLoans = loans;
  const myPerms = permissions.filter((p: any) => p.status === "pending");

  const handlePermAction = async (permId: string, action: "approve" | "deny") => {
    try {
      await permApi.update(permId, action);
      setPermissions((prev) =>
        prev.map((p: any) =>
          p.id === permId
            ? { ...p, status: action === "approve" ? "granted" : "denied" }
            : p,
        ),
      );
    } catch {}
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gstin) return;
    try {
      await loanApi.create({
        gstin,
        bank_id: formData.bank_id,
        loan_type: formData.loan_type,
        amount_requested: parseFloat(formData.amount),
        purpose: formData.purpose,
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setTab("my-requests");
        setFormData({ bank_id: "", loan_type: "", amount: "", purpose: "" });
        loanApi.list({ gstin }).then(setLoans).catch(() => {});
      }, 2000);
    } catch {}
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Loan Management"
        description="Request loans from banks and track your applications"
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          <TabsTrigger value="send-request">Send Request</TabsTrigger>
        </TabsList>

        <TabsContent value="my-requests">
          {myPerms.length > 0 && (
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-foreground mb-2">
                Data Sharing Requests Awaiting Your Approval
              </h2>
              <div className="space-y-2">
                {myPerms.map((perm: any) => (
                  <Card key={perm.id} className="border-amber-200 bg-amber-50 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-sm text-foreground">
                          {perm.bank_name} requested access to your credit data
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Requested:{" "}
                          {new Date(perm.requested_at).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handlePermAction(perm.id, "approve")}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => handlePermAction(perm.id, "deny")}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Deny
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {myLoans.length === 0 ? (
            <Card className="border-border shadow-sm">
              <CardContent className="p-12 text-center text-muted-foreground">
                No loan requests yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myLoans.map((loan: any) => (
                <Card key={loan.id} className="border-border shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">
                            {loan.bank_name}
                          </span>
                          <StatusBadge status={loan.status} />
                          <span className="text-xs text-muted-foreground capitalize">
                            {loan.loan_type?.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{loan.purpose}</p>
                        {loan.denial_reason && (
                          <p className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded mt-1">
                            {loan.denial_reason}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <IndianRupee className="w-3 h-3" />
                            Requested: {fmtINR(loan.amount_requested)}
                          </span>
                          {loan.amount_offered && (
                            <span className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
                              <IndianRupee className="w-3 h-3" />
                              Offered: {fmtINR(loan.amount_offered)}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {new Date(loan.created_at).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="send-request">
          <Card className="border-border shadow-sm max-w-lg">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold">New Loan Request</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {submitted ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
                  <p className="font-semibold text-foreground">Request Submitted!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The bank will review and may request data access.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSendRequest} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Bank</Label>
                    <Select
                      value={formData.bank_id}
                      onValueChange={(v) => setFormData((p) => ({ ...p, bank_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {banks
                          .filter((b: any) => b.status === "active")
                          .map((b: any) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Loan Type</Label>
                    <Select
                      value={formData.loan_type}
                      onValueChange={(v) => setFormData((p) => ({ ...p, loan_type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="working_capital">Working Capital</SelectItem>
                        <SelectItem value="term_loan">Term Loan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Amount (₹)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 500000"
                      value={formData.amount}
                      onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Purpose Note</Label>
                    <Textarea
                      placeholder="Brief description of loan purpose..."
                      value={formData.purpose}
                      onChange={(e) => setFormData((p) => ({ ...p, purpose: e.target.value }))}
                      rows={3}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={!formData.bank_id || !formData.loan_type || !formData.amount}
                  >
                    Submit Request
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
