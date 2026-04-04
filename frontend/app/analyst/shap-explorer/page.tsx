"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/dib/authContext";
import { useRouter } from "next/navigation";
import { FEATURE_LABELS } from "@/dib/mockData";

// Known demo GSTINs — mirrors mock_db.py user list. Used only as UI quick-links.
const DEMO_GSTINS = ["19HLPRM4249Z3Z1", "36ITDJE8781O1Z6", "33QEFVT7885F2Z4"];
import { scoreApi, analyticsApi, adminApi } from "@/dib/api";
import { PageHeader, RiskBadge, ScoreGauge } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, AlertTriangle, Info } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  Tooltip as ShadTooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

export default function ShapExplorerPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [gstin, setGstin] = useState("");
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<any>(null);
  const [error, setError] = useState("");
  const [medians, setMedians] = useState<any>(null);
  const [ewbData, setEwbData] = useState<any>(null);
  const [gapData, setGapData] = useState<any>(null);

  useEffect(() => {
    analyticsApi.getCohortMedian().then(setMedians).catch(() => {});
  }, []);

  useEffect(() => {


    if (!user || user.role !== "credit_analyst") {


      router.push("/unauthorized");


    }


  }, [user, router]);


  if (!user || user.role !== "credit_analyst") {


    return null;


  }

  const handleLookup = async () => {
    setError("");
    setScore(null);
    if (!gstin.trim()) return;
    setLoading(true);
    try {
      const { task_id } = await scoreApi.submit(gstin.trim().toUpperCase());
      // Poll until complete
      let result: any;
      while (true) {
        result = await scoreApi.get(task_id);
        if (result.status === "complete" || result.status === "failed") break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (result.status === "complete") {
        setScore(result);
        const g = gstin.trim().toUpperCase();
        adminApi.getEwbDistribution(g).then(setEwbData).catch(() => {});
        adminApi.getReceivablesGap(g).then(setGapData).catch(() => {});
      } else {
        setError("Scoring failed: " + (result.error ?? "unknown error"));
      }
    } catch (e: any) {
      setError(e.message ?? "Backend unavailable");
    } finally {
      setLoading(false);
    }
  };

  const shapData = score?.shap_waterfall
    ? [...score.shap_waterfall]
        .sort((a: any, b: any) => b.abs_magnitude - a.abs_magnitude)
        .map((s: any) => ({
          ...s,
          label: FEATURE_LABELS[s.feature_name] || s.feature_name,
          displayValue: s.direction === "decreases_risk" ? s.abs_magnitude : -s.abs_magnitude,
          absValue: s.abs_magnitude,
        }))
    : [];

  return (
    <TooltipProvider>
      <div className="p-6">
        <PageHeader
          title="SHAP Explorer"
          description="Look up any GSTIN to inspect the full SHAP waterfall and understand what drives its credit score"
        />

        {/* Search */}
        <Card className="border-border shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9 font-mono text-sm"
                  placeholder="Enter GSTIN (e.g. 19HLPRM4249Z3Z1)"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                />
              </div>
              <Button
                className="bg-primary hover:bg-primary/90 gap-2"
                onClick={handleLookup}
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {loading ? "Scoring..." : "Look Up"}
              </Button>
            </div>
            {/* Quick sample GSTINs */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs text-muted-foreground">Try:</span>
              {DEMO_GSTINS.map((g) => (
                <button
                  key={g}
                  className="text-xs font-mono text-primary underline underline-offset-2 hover:no-underline"
                  onClick={() => {
                    setGstin(g);
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 mb-6">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {medians && !score && (
          <Card className="border-border shadow-sm mb-6">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Global Cohort Medians
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Object.entries(medians).map(([k, v]) => {
                if (typeof v !== 'object') {
                   return (
                    <div key={k} className="bg-muted/50 rounded-lg p-3 border border-border/50">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{k.replace(/_/g, " ")}</p>
                      <p className="text-sm font-semibold text-foreground">{typeof v === "number" && v % 1 !== 0 ? v.toFixed(2) : String(v)}</p>
                    </div>
                  );
                }
                return null;
              })}
            </CardContent>
          </Card>
        )}

        {score && (
          <div className="space-y-6">
            {/* Score header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-border shadow-sm flex flex-col items-center justify-center p-4">
                <ScoreGauge score={score.credit_score} size={140} />
                <RiskBadge band={score.risk_band} className="mt-2" />
              </Card>
              <Card className="md:col-span-3 border-border shadow-sm">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold">
                    Score Metadata
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { l: "GSTIN", v: score.gstin },
                    { l: "Task ID", v: score.task_id },
                    { l: "MSME Category", v: score.msme_category },
                    {
                      l: "Data Maturity",
                      v: `${score.data_maturity_months} months`,
                    },
                    {
                      l: "Fraud Flagged",
                      v: score.fraud_flag ? "Yes" : "No",
                      warn: score.fraud_flag,
                    },
                    {
                      l: "Score Freshness",
                      v: new Date(score.score_freshness).toLocaleDateString(
                        "en-IN",
                      ),
                    },
                  ].map((f) => (
                    <div key={f.l} className="bg-muted rounded-lg p-2.5">
                      <p className="text-xs text-muted-foreground">{f.l}</p>
                      <p
                        className={`text-sm font-semibold ${f.warn ? "text-red-600" : "text-foreground"}`}
                      >
                        {f.v}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* SHAP Waterfall */}
            <Card className="border-border shadow-sm">
              <CardHeader className="py-3 px-5 border-b flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  SHAP Waterfall — Feature Importance
                </CardTitle>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
                    Decreases risk
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />
                    Increases risk
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <ResponsiveContainer
                  width="100%"
                  height={shapData.length * 38 + 20}
                >
                  <BarChart
                    data={shapData}
                    layout="vertical"
                    margin={{ top: 0, right: 40, left: 200, bottom: 0 }}
                    barSize={14}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#f0f0f5"
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      tickFormatter={(v) => v.toFixed(2)}
                      domain={[-0.4, 0.4]}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#374151" }}
                      width={195}
                    />
                    <Tooltip
                      formatter={(value: any, name: any, props: any) => {
                        const item = props.payload;
                        return [
                          `${item.absValue.toFixed(4)} (${item.direction === "decreases_risk" ? "reduces risk" : "increases risk"})`,
                          "SHAP magnitude",
                        ];
                      }}
                    />
                    <Bar dataKey="displayValue" radius={[0, 2, 2, 0]}>
                      {shapData.map((entry: any, idx: number) => (
                        <Cell
                          key={idx}
                          fill={
                            entry.direction === "decreases_risk"
                              ? "#22c55e"
                              : "#ef4444"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Reasons */}
            <Card className="border-border shadow-sm">
              <CardHeader className="py-3 px-5 border-b">
                <CardTitle className="text-sm font-semibold">
                  Top Score Reasons
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ol className="divide-y divide-border">
                  {score.top_reasons.map((r: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 px-5 py-3">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-foreground leading-relaxed">
                        {r}
                      </span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {/* EWB Smurfing Histogram */}
            {ewbData && (
              <Card className="border-border shadow-sm">
                <CardHeader className="py-3 px-5 border-b flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">
                      E-Way Bill Value Distribution — Smurfing Detection
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Structuring index: <span className={`font-semibold ${(ewbData as any).smurfing_index > 0.3 ? "text-red-600" : "text-emerald-600"}`}>{((ewbData as any).smurfing_index * 100).toFixed(1)}%</span>
                      {" "}— bills clustered in ₹45K–₹49,999 "smurf band" indicate structuring below the mandatory ₹50K threshold
                    </p>
                  </div>
                  {(ewbData as any).smurfing_index > 0.3 && (
                    <Badge variant="destructive" className="text-xs shrink-0">High Smurfing Risk</Badge>
                  )}
                </CardHeader>
                <CardContent className="p-5">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={(ewbData as any).buckets}
                      margin={{ top: 5, right: 20, left: 10, bottom: 40 }}
                      barSize={32}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" />
                      <XAxis
                        dataKey="range"
                        tick={{ fontSize: 10, fill: "#374151" }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
                      <Tooltip
                        formatter={(v: any, _: any, props: any) => [
                          `${v} bills${props.payload.smurf_band ? " ⚠ SMURF BAND" : ""}`,
                          "Count",
                        ]}
                        contentStyle={{ fontSize: 11 }}
                      />
                      <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                        {(ewbData as any).buckets.map((b: any, idx: number) => (
                          <Cell
                            key={idx}
                            fill={b.smurf_band ? "#ef4444" : "#0d9488"}
                            opacity={b.smurf_band ? 1 : 0.75}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 text-[11px] text-muted-foreground mt-1">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Smurf band (₹45K–₹49,999)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-teal-600 inline-block" /> Normal range</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* GST vs UPI Receivables Gap */}
            {gapData && (
              <Card className="border-border shadow-sm">
                <CardHeader className="py-3 px-5 border-b">
                  <CardTitle className="text-sm font-semibold">
                    GST Invoiced vs UPI Inbound — Receivables Gap Analysis
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Large gap (GST high, UPI low) signals an Accounts Receivable bottleneck or unaccounted cash flows
                  </p>
                </CardHeader>
                <CardContent className="p-5">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={(gapData as any).monthly}
                      margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                      barGap={3}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" />
                      <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#374151" }} />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#6b7280" }}
                        tickFormatter={(v) =>
                          v >= 1000000
                            ? `₹${(v / 100000).toFixed(0)}L`
                            : v >= 1000
                            ? `₹${(v / 1000).toFixed(0)}K`
                            : `₹${v}`
                        }
                      />
                      <Tooltip
                        formatter={(v: any, name: string) => [
                          `₹${(Number(v) / 100000).toFixed(1)}L`,
                          name === "gst_invoiced" ? "GST Invoiced" : "UPI Inbound",
                        ]}
                        contentStyle={{ fontSize: 11 }}
                      />
                      <Legend
                        formatter={(v) => v === "gst_invoiced" ? "GST Invoiced" : "UPI Inbound"}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                      <Bar dataKey="gst_invoiced" fill="#6366f1" radius={[2, 2, 0, 0]} opacity={0.85} />
                      <Bar dataKey="upi_inbound" fill="#0d9488" radius={[2, 2, 0, 0]} opacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {(gapData as any).monthly.slice(-1).map((m: any) => {
                      const gapPct = m.gst_invoiced > 0 ? ((m.gap / m.gst_invoiced) * 100).toFixed(0) : "0";
                      const isHigh = Number(gapPct) > 50;
                      return (
                        <div key={m.period} className={`col-span-3 p-3 rounded-lg border text-xs ${isHigh ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
                          Latest period gap: <strong>₹{(m.gap / 100000).toFixed(1)}L</strong> ({gapPct}% of GST invoiced)
                          {isHigh ? " — Significant AR bottleneck detected" : " — Within normal range"}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
