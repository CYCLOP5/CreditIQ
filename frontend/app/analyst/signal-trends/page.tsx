"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/dib/authContext";
import { useRouter } from "next/navigation";
import { FEATURE_LABELS } from "@/dib/mockData";
import { adminApi } from "@/dib/api";
import { PageHeader, RiskBadge } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, AlertTriangle, RefreshCw } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const FEATURE_COLORS: Record<string, string> = {
  filing_compliance_rate: "#0c0861",
  gst_revenue_cv_90d: "#ef4444",
  upi_30d_inbound_count: "#22c55e",
  eway_bill_mom_growth: "#f59e0b",
  longest_gap_days: "#8b5cf6",
};

const AVAILABLE_FEATURES = [
  "filing_compliance_rate",
  "gst_revenue_cv_90d",
  "upi_30d_inbound_count",
  "eway_bill_mom_growth",
  "longest_gap_days",
];

export default function SignalTrendsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [gstin, setGstin] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[] | null>(null);
  const [error, setError] = useState("");
  const [activeFeatures, setActiveFeatures] = useState<Set<string>>(
    new Set(AVAILABLE_FEATURES),
  );

  useEffect(() => {


    if (!user || user.role !== "credit_analyst") {


      router.push("/unauthorized");


    }


  }, [user, router]);


  if (!user || user.role !== "credit_analyst") {


    return null;


  }

  const handleSearch = async () => {
    setError("");
    setHistory(null);
    if (!gstin.trim()) return;
    setLoading(true);
    try {
      const data = await adminApi.getScoreHistory(gstin.trim().toUpperCase());
      if (!data || (data as any[]).length === 0) {
        setError("No score history found for this GSTIN.");
      } else {
        setHistory(data as any[]);
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to load score history");
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = (f: string) => {
    setActiveFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  // Build chart data
  const chartData = history
    ? history.map((h) => ({
        date: new Date(h.score_freshness).toLocaleDateString("en-IN", {
          month: "short",
          year: "2-digit",
        }),
        score: h.credit_score,
        risk_band: h.risk_band,
        ...h.key_features,
      }))
    : [];

  return (
    <div className="p-6">
      <PageHeader
        title="Signal Trends"
        description="Visualise how key credit signals have changed over historical scoring runs for a given GSTIN"
      />

      {/* Search */}
      <Card className="border-border shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 font-mono text-sm"
                placeholder="Enter GSTIN (e.g. 33WMCXS5986T3Z1)"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button
              className="bg-primary hover:bg-primary/90 gap-2"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {loading ? "Loading..." : "Load History"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs text-muted-foreground">Try:</span>
            {["29GYWWJ1876Z9Z0", "33WMCXS5986T3Z1", "29RASVZ4103X2Z1"].map((g) => (
              <button
                key={g}
                className="text-xs font-mono text-primary underline underline-offset-2 hover:no-underline"
                onClick={() => setGstin(g)}
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

      {history && chartData.length > 0 && (
        <div className="space-y-6">
          {/* Score trend */}
          <Card className="border-border shadow-sm">
            <CardHeader className="py-3 px-5 border-b">
              <CardTitle className="text-sm font-semibold">
                Credit Score Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[300, 900]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any) => [value, "Credit Score"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#0c0861"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#0c0861" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-4">
                {history.map((h) => (
                  <div key={h.task_id} className="flex items-center gap-2">
                    <RiskBadge band={h.risk_band} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(h.score_freshness).toLocaleDateString("en-IN", {
                        month: "short",
                        year: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Feature trend */}
          <Card className="border-border shadow-sm">
            <CardHeader className="py-3 px-5 border-b flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Feature Signal Trends
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_FEATURES.map((f) => (
                  <button
                    key={f}
                    onClick={() => toggleFeature(f)}
                    className="text-xs px-2 py-0.5 rounded-full border transition-colors"
                    style={{
                      backgroundColor: activeFeatures.has(f)
                        ? FEATURE_COLORS[f] + "20"
                        : "transparent",
                      borderColor: FEATURE_COLORS[f],
                      color: FEATURE_COLORS[f],
                      opacity: activeFeatures.has(f) ? 1 : 0.4,
                    }}
                  >
                    {FEATURE_LABELS[f] || f}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {AVAILABLE_FEATURES.filter((f) => activeFeatures.has(f)).map(
                    (f) => (
                      <Line
                        key={f}
                        type="monotone"
                        dataKey={f}
                        name={FEATURE_LABELS[f] || f}
                        stroke={FEATURE_COLORS[f]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ),
                  )}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* History table */}
          <Card className="border-border shadow-sm">
            <CardHeader className="py-3 px-5 border-b">
              <CardTitle className="text-sm font-semibold">
                Raw History Data
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                      Score
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Band
                    </th>
                    {AVAILABLE_FEATURES.map((f) => (
                      <th
                        key={f}
                        className="text-right px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap"
                      >
                        {FEATURE_LABELS[f]?.split(" ").slice(0, 2).join(" ") ||
                          f}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((h) => (
                    <tr key={h.task_id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {new Date(h.score_freshness).toLocaleDateString(
                          "en-IN",
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-foreground">
                        {h.credit_score}
                      </td>
                      <td className="px-4 py-2.5">
                        <RiskBadge band={h.risk_band} />
                      </td>
                      {AVAILABLE_FEATURES.map((f) => (
                        <td
                          key={f}
                          className="px-3 py-2.5 text-right text-muted-foreground"
                        >
                          {h.key_features[f] !== undefined
                            ? typeof h.key_features[f] === "number"
                              ? h.key_features[f].toFixed(2)
                              : h.key_features[f]
                            : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
