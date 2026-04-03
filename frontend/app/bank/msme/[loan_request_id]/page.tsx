"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/dib/authContext";
import { loanApi, permApi } from "@/dib/api";
import { FEATURE_LABELS } from "@/dib/mockData";
import {
  ScoreGauge,
  RiskBadge,
  PageHeader,
  StatusBadge,
} from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Lock, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";

function fmtINR(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function BankMsmePage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams<{ loan_request_id: string }>();
  const lrId = params?.loan_request_id;

  const [loan, setLoan] = useState<any>(null);
  const [perm, setPerm] = useState<any>(null);
  const [score, setScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [decision, setDecision] = useState<"approved" | "denied" | null>(null);
  const [decisionData, setDecisionData] = useState({ amount_offered: "", denial_reason: "" });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!lrId) return;
    setLoading(true);
    Promise.all([
      loanApi.get(lrId),
      permApi.list({ status: "granted" }),
    ])
      .then(async ([loanData, perms]) => {
        setLoan(loanData);
        const matchPerm = (perms as any[]).find(
          (p: any) => p.loan_request_id === lrId,
        );
        setPerm(matchPerm ?? null);
        if (matchPerm?.status === "granted") {
          const scoreData = await loanApi.getScore(lrId).catch(() => null);
          setScore(scoreData);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lrId]);

  useEffect(() => {


    if (!user || user.role !== "loan_officer") {


      router.push("/unauthorized");


    }


  }, [user, router]);


  if (!user || user.role !== "loan_officer") {


    return null;


  }

  const handleDecisionSubmit = async () => {
    if (!lrId || !decision) return;
    try {
      await loanApi.decide(lrId, {
        action: decision,
        denial_reason: decisionData.denial_reason || null,
        amount_offered: decisionData.amount_offered
          ? parseFloat(decisionData.amount_offered)
          : null,
      });
      setSubmitted(true);
    } catch {}
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="p-6 text-muted-foreground">Loan request not found.</div>
    );
  }

  if (!perm || perm.status !== "granted") {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <PageHeader title="MSME Profile" description="Full credit profile" />
        <Card className="border-border shadow-sm">
          <CardContent className="p-12 text-center">
            <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Permission Required
            </h2>
            <p className="text-muted-foreground text-sm">
              Data access permission has not been granted by the MSME owner.
              Request access from the Loan Queue.
            </p>
            <Button
              className="mt-4 bg-primary hover:bg-primary/90"
              onClick={() => router.push("/bank/loan-queue")}
            >
              Go to Loan Queue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const shap = score?.shap_waterfall ?? [];
  const maxShap = shap.length > 0 ? Math.max(...shap.map((s: any) => s.abs_magnitude)) : 1;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="MSME Credit Profile"
        description={`Loan Request: ${lrId} · ${loan.bank_name}`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/bank/loan-queue")}
          >
            Back to Queue
          </Button>
        }
      />

      {score && score.credit_score && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Credit Score
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-2">
              <ScoreGauge score={score.credit_score} size={160} />
              <RiskBadge band={score.risk_band} />
            </CardContent>
          </Card>

          <Card className="md:col-span-2 border-border shadow-sm">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-semibold">Key Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-3">
              {[
                { l: "GSTIN", v: loan.gstin },
                { l: "MSME Category", v: score.msme_category },
                { l: "WC Eligible", v: fmtINR(score.recommended_wc_amount) },
                {
                  l: "Term Eligible",
                  v: score.recommended_term_amount > 0
                    ? fmtINR(score.recommended_term_amount)
                    : "N/A",
                },
                { l: "CGTMSE", v: score.cgtmse_eligible ? "Eligible" : "Not eligible" },
                { l: "MUDRA", v: score.mudra_eligible ? "Eligible" : "Not eligible" },
              ].map((f) => (
                <div key={f.l} className="bg-muted rounded-lg p-2.5">
                  <p className="text-xs text-muted-foreground">{f.l}</p>
                  <p className="text-sm font-semibold text-foreground">{f.v}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {score?.fraud_flag && (
        <div className="mb-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Fraud Flag Active</p>
            {score.fraud_details && (
              <p className="text-sm">
                Confidence: {((score.fraud_details.confidence ?? 0) * 100).toFixed(0)}%
              </p>
            )}
          </div>
        </div>
      )}

      {shap.length > 0 && (
        <Card className="border-border shadow-sm mb-6">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm font-semibold">Score Drivers (SHAP)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {shap.map((item: any) => {
              const pct = (item.abs_magnitude / maxShap) * 100;
              const isGood = item.direction === "decreases_risk";
              return (
                <div key={item.feature_name} className="flex items-center gap-3">
                  <span className="w-44 text-xs text-muted-foreground text-right truncate shrink-0">
                    {FEATURE_LABELS[item.feature_name] || item.feature_name}
                  </span>
                  <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                    <div
                      className={`h-full rounded ${isGood ? "bg-emerald-500" : "bg-red-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-mono w-10 shrink-0 ${isGood ? "text-emerald-700" : "text-red-700"}`}>
                    {item.abs_magnitude.toFixed(3)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Decision panel */}
      <Card className={`border-border shadow-sm ${submitted ? "border-emerald-200 bg-emerald-50" : ""}`}>
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-semibold">Loan Decision</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {submitted ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <p className="font-semibold text-foreground">
                Decision submitted: {decision === "approved" ? "Approved" : "Denied"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                The MSME owner has been notified.
              </p>
            </div>
          ) : loan.status === "approved" || loan.status === "denied" ? (
            <div className="flex items-center gap-2">
              <StatusBadge status={loan.status} />
              <span className="text-sm text-muted-foreground">
                Decision already recorded for this request.
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-3">
                <Button
                  className={`flex-1 gap-2 ${decision === "approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-muted text-foreground hover:bg-accent"}`}
                  onClick={() => setDecision("approved")}
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </Button>
                <Button
                  className={`flex-1 gap-2 ${decision === "denied" ? "bg-red-600 text-white hover:bg-red-700" : "bg-muted text-foreground hover:bg-accent"}`}
                  onClick={() => setDecision("denied")}
                >
                  <XCircle className="w-4 h-4" /> Deny
                </Button>
              </div>
              {decision === "approved" && (
                <div className="space-y-1.5">
                  <Label>Amount Offered (₹)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 2000000"
                    value={decisionData.amount_offered}
                    onChange={(e) => setDecisionData((p) => ({ ...p, amount_offered: e.target.value }))}
                  />
                </div>
              )}
              {decision === "denied" && (
                <div className="space-y-1.5">
                  <Label>Denial Reason</Label>
                  <Textarea
                    placeholder="Explain the reason for denial..."
                    rows={3}
                    value={decisionData.denial_reason}
                    onChange={(e) => setDecisionData((p) => ({ ...p, denial_reason: e.target.value }))}
                  />
                </div>
              )}
              {decision && (
                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={handleDecisionSubmit}
                >
                  Submit Decision
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
