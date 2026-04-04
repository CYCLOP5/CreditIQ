"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/dib/authContext";
import { useScore } from "@/hooks/useScore";
import { FEATURE_LABELS } from "@/dib/mockData";
import {
  ScoreGauge,
  RiskBadge,
  PageHeader,
  StatusBadge,
} from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  XCircle,
  Info,
  Download,
  RefreshCw,
  Loader2,
  AlertTriangle,
  MessageSquare,
  Send,
  User,
  Bot,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { scoreApi } from "@/dib/api";
import { Input } from "@/components/ui/input";

function fmtINR(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

const FIELD_TIPS: Record<string, string> = {
  credit_score:
    "A number between 300–900 summarising your creditworthiness. Higher is better.",
  risk_band: "Categorical label derived from your score range.",
  msme_category:
    "Classification based on turnover: Micro (<₹5Cr), Small (<₹50Cr), Medium (<₹250Cr).",
  data_maturity_months:
    "How many months of transaction data we have for you. More data = more accurate score.",
  recommended_wc_amount:
    "Maximum working capital loan you may be eligible for based on your score.",
  recommended_term_amount:
    "Maximum term loan amount. Only available for low and very-low risk bands.",
  cgtmse_eligible:
    "CGTMSE provides credit guarantee for collateral-free loans up to ₹2Cr.",
  mudra_eligible:
    "MUDRA scheme for micro enterprises needing loans up to ₹10L.",
};

export default function MsmeScoreReport() {
  const { user } = useAuth();
  const router = useRouter();
  const { score, status, refresh } = useScore(user?.gstin);
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      role: "assistant",
      content:
        "Hi! I am your score assistant. Do you have any questions about this report?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleChat = async () => {
    if (!chatInput.trim() || !score) return;
    const msg = chatInput;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    try {
            const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: msg }],
          context: { scoreData: score }
        })
      });

      if (!res.ok) throw new Error("Network error");
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let botMsg = "";
      setChatMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        botMsg += decoder.decode(value, { stream: true });
        
        setChatMessages(prev => {
          const newArray = [...prev];
          newArray[newArray.length - 1] = { ...newArray[newArray.length - 1], content: botMsg };
          return newArray;
        });
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error communicating." },
      ]);
    }
  };

  useEffect(() => {
    if (!user || user.role !== "msme") {
      router.push("/unauthorized");
    }
  }, [user, router]);

  if (!user || user.role !== "msme") {
    return null;
  }

  if (status === "idle" || status === "pending" || status === "processing") {
    return (
      <div className="p-6 w-full max-w-[1400px] mx-auto">
        <PageHeader
          title="Credit Score Report"
          description="Computing your score…"
        />
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm">
            {status === "processing"
              ? "Running ML pipeline…"
              : "Queuing score request…"}
          </p>
        </div>
      </div>
    );
  }

  if (status === "failed" || !score) {
    return (
      <div className="p-6 w-full max-w-[1400px] mx-auto">
        <PageHeader
          title="Credit Score Report"
          description="Score unavailable"
        />
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
          <p className="text-sm">
            Could not load score. Is the backend running?
          </p>
          <Button size="sm" onClick={refresh}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const shap = score.shap_waterfall ?? [];
  const maxShap =
    shap.length > 0 ? Math.max(...shap.map((s) => s.abs_magnitude)) : 1;

  return (
    <TooltipProvider>
      <div className="p-6 w-full max-w-[1400px] mx-auto">
        <PageHeader
          title="Credit Score Report"
          description={`Score as of ${new Date(score.score_freshness).toLocaleString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`}
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={refresh}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Score */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Credit Score
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-2">
              <ScoreGauge score={score.credit_score} size={180} />
              <RiskBadge band={score.risk_band} />
              <p className="text-xs text-muted-foreground text-center">
                Range: 300 (Poor) — 900 (Excellent)
              </p>
            </CardContent>
          </Card>

          {/* Key metrics */}
          <Card className="md:col-span-2 border-border shadow-sm">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-semibold">
                Score Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-3">
              {[
                {
                  label: "MSME Category",
                  value:
                    score.msme_category.charAt(0).toUpperCase() +
                    score.msme_category.slice(1),
                  tip: FIELD_TIPS.msme_category,
                },
                {
                  label: "Data Maturity",
                  value: `${score.data_maturity_months} months`,
                  tip: FIELD_TIPS.data_maturity_months,
                },
                {
                  label: "WC Eligible",
                  value:
                    score.recommended_wc_amount > 0
                      ? fmtINR(score.recommended_wc_amount)
                      : "Not eligible",
                  tip: FIELD_TIPS.recommended_wc_amount,
                },
                {
                  label: "Term Eligible",
                  value:
                    score.recommended_term_amount > 0
                      ? fmtINR(score.recommended_term_amount)
                      : "Not eligible",
                  tip: FIELD_TIPS.recommended_term_amount,
                },
              ].map((f) => (
                <div key={f.label} className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs text-muted-foreground">
                      {f.label}
                    </span>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        {f.tip}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {f.value}
                  </p>
                </div>
              ))}

              {/* Eligibility */}
              <div className="col-span-2 flex gap-3">
                {[
                  {
                    label: "CGTMSE Eligible",
                    eligible: score.cgtmse_eligible,
                    tip: FIELD_TIPS.cgtmse_eligible,
                  },
                  {
                    label: "MUDRA Eligible",
                    eligible: score.mudra_eligible,
                    tip: FIELD_TIPS.mudra_eligible,
                  },
                ].map((e) => (
                  <div
                    key={e.label}
                    className={`flex-1 flex items-center gap-2 p-3 rounded-lg border ${e.eligible ? "bg-emerald-50 border-emerald-200" : "bg-muted border-border"}`}
                  >
                    {e.eligible ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-sm font-medium ${e.eligible ? "text-emerald-700" : "text-muted-foreground"}`}
                      >
                        {e.label}
                      </span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">
                          {e.tip}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SHAP Waterfall */}
        {shap.length > 0 && (
          <Card className="border-border shadow-sm mb-6">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-semibold">
                Score Drivers (SHAP)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex gap-4 mb-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />{" "}
                  Lowers risk
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-500 inline-block" />{" "}
                  Raises risk
                </span>
              </div>
              <div className="space-y-2">
                {shap.map((item, i) => {
                  const pct = (item.abs_magnitude / maxShap) * 100;
                  const isGood = item.direction === "decreases_risk";
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-52 text-xs text-muted-foreground text-right truncate shrink-0">
                        {FEATURE_LABELS[item.feature_name] || item.feature_name}
                      </span>
                      <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                        <div
                          className={`h-full rounded transition-all ${isGood ? "bg-emerald-500" : "bg-red-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-mono font-semibold w-12 shrink-0 ${isGood ? "text-emerald-700" : "text-red-700"}`}
                      >
                        {isGood ? "+" : "-"}
                        {item.abs_magnitude?.toFixed(3)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Reasons */}
        <Card className="border-border shadow-sm">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm font-semibold">
              Plain Language Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ul className="space-y-3">
              {score.top_reasons.map((reason: string, i: number) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-foreground"
                >
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {reason}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Score Chat */}
        <Card className="border-border shadow-sm mt-6">
          <CardHeader className="py-3 px-4 border-b flex-row items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              Ask about your Score
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex flex-col gap-4">
            <div
              ref={chatRef}
              className="h-48 overflow-y-auto space-y-3 p-2 bg-muted/30 rounded-md border"
            >
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${m.role === "assistant" ? "bg-primary text-white" : "bg-muted text-foreground border"}`}
                  >
                    {m.role === "assistant" ? (
                      <Bot className="w-3 h-3" />
                    ) : (
                      <User className="w-3 h-3" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${m.role === "assistant" ? "bg-muted" : "bg-primary text-primary-foreground"}`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Ask about specific metrics..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChat()}
                className="text-sm border-border"
              />
              <Button
                size="icon"
                className="shrink-0 bg-primary hover:bg-primary/90"
                onClick={handleChat}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
