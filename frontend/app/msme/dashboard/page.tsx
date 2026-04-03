"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/dib/authContext";
import { loanApi } from "@/dib/api";
import { useScore } from "@/hooks/useScore";
import {
  ScoreGauge,
  RiskBadge,
  PageHeader,
  StatCard,
  formatINR,
} from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Briefcase,
  FileText,
  Flag,
  RefreshCw,
  TrendingUp,
  Shield,
  Loader2,
} from "lucide-react";

export default function MsmeDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { score, status, refresh } = useScore(user?.gstin);
  const [loans, setLoans] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.gstin) return;
    loanApi.list({ gstin: user.gstin }).then(setLoans).catch(() => {});
  }, [user?.gstin]);

  if (!user || user.role !== "msme") {
    router.push("/login");
    return null;
  }

  const pendingLoans = loans.filter((lr: any) =>
    ["submitted", "permission_requested", "data_shared", "bank_reviewing"].includes(lr.status),
  );

  if (status === "idle" || status === "pending" || status === "processing") {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <PageHeader
          title={`Welcome back, ${user.name.split(" ")[0]}`}
          description={`GSTIN: ${user.gstin} · Computing score…`}
        />
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm">
            {status === "processing" ? "Running ML pipeline…" : "Queuing score request…"}
          </p>
        </div>
      </div>
    );
  }

  if (status === "failed" || !score) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <PageHeader
          title={`Welcome back, ${user.name.split(" ")[0]}`}
          description={`GSTIN: ${user.gstin}`}
          actions={
            <Button variant="outline" size="sm" className="gap-2" onClick={refresh}>
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
          <p className="text-sm">Could not load score. Is the backend running?</p>
          <Button size="sm" onClick={refresh}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description={`GSTIN: ${user.gstin} · Last scored: ${new Date(score.score_freshness).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
        actions={
          <Button variant="outline" size="sm" className="gap-2" onClick={refresh}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Score
          </Button>
        }
      />

      {/* Banners */}
      {score.data_maturity_months < 3 && (
        <div className="mb-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Low Data Quality Warning</p>
            <p className="text-sm">
              Your data maturity is only {score.data_maturity_months} months.
              Scores improve with more history.
            </p>
          </div>
        </div>
      )}
      {score.fraud_flag && (
        <div className="mb-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
          <Flag className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Fraud Alert</p>
            <p className="text-sm">
              Your GSTIN has been flagged as part of a suspicious transaction
              pattern. You can raise a dispute to review this.
            </p>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => router.push("/msme/disputes")}
          >
            Raise Dispute
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Score card */}
        <Card className="md:col-span-1 border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Credit Score
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <ScoreGauge score={score.credit_score} size={180} />
            <RiskBadge band={score.risk_band} />
            <div className="w-full grid grid-cols-2 gap-2 mt-2">
              <div className="text-center p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">WC Eligible</p>
                <p className="text-sm font-bold text-foreground">
                  {formatINR(score.recommended_wc_amount)}
                </p>
              </div>
              <div className="text-center p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Term Eligible</p>
                <p className="text-sm font-bold text-foreground">
                  {score.recommended_term_amount > 0
                    ? formatINR(score.recommended_term_amount)
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="md:col-span-2 flex flex-col gap-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Category"
              value={
                score.msme_category.charAt(0).toUpperCase() +
                score.msme_category.slice(1)
              }
              icon={TrendingUp}
            />
            <StatCard
              label="Data Maturity"
              value={`${score.data_maturity_months}mo`}
              icon={FileText}
            />
            <StatCard
              label="Pending Loans"
              value={pendingLoans.length}
              icon={Briefcase}
            />
          </div>

          {/* Eligibility */}
          <Card className="border-border shadow-sm">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-semibold">
                Scheme Eligibility
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex gap-4">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${score.cgtmse_eligible ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}
              >
                {score.cgtmse_eligible ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">CGTMSE</span>
              </div>
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${score.mudra_eligible ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}
              >
                {score.mudra_eligible ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">MUDRA</span>
              </div>
            </CardContent>
          </Card>

          {/* Top reasons */}
          <Card className="border-border shadow-sm flex-1">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-semibold">
                Top Score Drivers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ul className="space-y-2">
                {score.top_reasons.map((reason: string, i: number) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <span className="w-5 h-5 rounded-full bg-accent text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {reason}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Request a Loan",
            desc: "Apply to a bank with your credit profile",
            href: "/msme/loans",
            icon: Briefcase,
            primary: true,
          },
          {
            label: "View Full Report",
            desc: "See detailed SHAP breakdown",
            href: "/msme/score-report",
            icon: FileText,
            primary: false,
          },
          {
            label: "Raise a Dispute",
            desc: "Contest a fraud flag on your GSTIN",
            href: "/msme/disputes",
            icon: AlertTriangle,
            primary: false,
          },
        ].map((action) => (
          <button
            key={action.href}
            onClick={() => router.push(action.href)}
            className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
              action.primary
                ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                : "border-border bg-card hover:border-primary/50 hover:bg-accent/30"
            }`}
          >
            <div>
              <p className="font-semibold text-sm">{action.label}</p>
              <p
                className={`text-xs mt-0.5 ${action.primary ? "text-primary-foreground/75" : "text-muted-foreground"}`}
              >
                {action.desc}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 shrink-0 opacity-70" />
          </button>
        ))}
      </div>
    </div>
  );
}
