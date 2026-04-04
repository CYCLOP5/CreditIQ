"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/dib/authContext";
import { useRouter } from "next/navigation";
import { adminApi } from "@/dib/api";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, RotateCcw, CheckCircle2, Shield, Settings, Scale } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function fmtINR(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n === 0) return "Not eligible";
  return `₹${n.toLocaleString("en-IN")}`;
}

const BAND_COLORS: Record<string, string> = {
  very_low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  low: "bg-teal-50 text-teal-700 border-teal-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-red-50 text-red-700 border-red-200",
  // legacy aliases
  very_low_risk: "bg-emerald-50 text-emerald-700 border-emerald-200",
  low_risk: "bg-teal-50 text-teal-700 border-teal-200",
  medium_risk: "bg-amber-50 text-amber-700 border-amber-200",
  high_risk: "bg-red-50 text-red-700 border-red-200",
};

const BAND_LABELS: Record<string, string> = {
  very_low: "Very Low Risk",
  low: "Low Risk",
  medium: "Medium Risk",
  high: "High Risk",
  very_low_risk: "Very Low Risk",
  low_risk: "Low Risk",
  medium_risk: "Medium Risk",
  high_risk: "High Risk",
};

const DEFAULT_AMNESTY = {
  active: false,
  quarter: 1,
  year: 2025,
  filing_penalty_multiplier: 0.0,
  description: "GST amnesty: late filings in selected quarter will not be penalised in credit scoring",
};

const DEFAULT_THRESHOLDS = {
  bands: [
    { band: "very_low", min_score: 800, max_score: 900 },
    { band: "low", min_score: 700, max_score: 799 },
    { band: "medium", min_score: 550, max_score: 699 },
    { band: "high", min_score: 300, max_score: 549 },
  ],
  recommendation_rules: [] as any[],
  system_config: {
    fraud_confidence_threshold: 0.7,
    data_maturity_min_months: 3,
  },
  amnesty_config: DEFAULT_AMNESTY,
};

export default function ThresholdsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [config, setConfig] = useState(DEFAULT_THRESHOLDS.system_config);
  const [bands, setBands] = useState(DEFAULT_THRESHOLDS.bands);
  const [amnesty, setAmnesty] = useState(DEFAULT_AMNESTY);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminApi.getRiskThresholds().then((data: any) => {
      if (!data) return;
      setThresholds(data);
      if (data.system_config) setConfig(data.system_config);
      if (data.bands) setBands(data.bands);
      if (data.amnesty_config) setAmnesty(data.amnesty_config);
    }).catch(() => {});
  }, []);

  useEffect(() => {


    if (!user || user.role !== "risk_manager") {


      router.push("/unauthorized");


    }


  }, [user, router]);


  if (!user || user.role !== "risk_manager") {


    return null;


  }

  const handleSave = async () => {
    try {
      await adminApi.updateRiskThresholds({
        ...thresholds,
        bands,
        system_config: config,
        amnesty_config: amnesty,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
  };

  const handleReset = () => {
    setConfig(DEFAULT_THRESHOLDS.system_config);
    setBands(DEFAULT_THRESHOLDS.bands);
    setAmnesty(DEFAULT_AMNESTY);
  };

  const updateBand = (index: number, field: "min_score" | "max_score", value: string) => {
    setBands((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: Number(value) } : b)),
    );
  };

  const recRules = thresholds.recommendation_rules ?? [];

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader
        title="Risk Thresholds"
        description="Configure risk band score boundaries, recommendation rules, and fraud detection parameters"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleReset}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
            <Button
              size="sm"
              className={`gap-1.5 ${saved ? "bg-emerald-600 hover:bg-emerald-700" : "bg-primary hover:bg-primary/90"}`}
              onClick={handleSave}
            >
              {saved ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saved ? "Saved!" : "Save Changes"}
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* System Config */}
        <Card className="border-border shadow-sm">
          <CardHeader className="py-3 px-5 border-b flex-row items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              System Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label className="text-sm">Fraud Confidence Threshold</Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Minimum model confidence required to raise a fraud flag (0.0 – 1.0)
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={config.fraud_confidence_threshold}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      fraud_confidence_threshold: Number(e.target.value),
                    }))
                  }
                  className="w-28 font-mono text-sm"
                />
                <span className="text-sm font-semibold text-primary">
                  {(config.fraud_confidence_threshold * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Data Maturity Minimum (months)</Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Minimum months of data required before a score is considered high-confidence
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={config.data_maturity_min_months}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      data_maturity_min_months: Number(e.target.value),
                    }))
                  }
                  className="w-20 font-mono text-sm"
                />
                <span className="text-sm text-muted-foreground">months</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GST Amnesty Configuration */}
        <Card className={`border-border shadow-sm ${amnesty.active ? "ring-2 ring-amber-400 ring-offset-1" : ""}`}>
          <CardHeader className="py-3 px-5 border-b flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-sm font-semibold">GST Amnesty Scheme</CardTitle>
              {amnesty.active && (
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-300 px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Active
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{amnesty.active ? "Amnesty ON" : "Amnesty OFF"}</span>
              <Switch
                checked={amnesty.active}
                onCheckedChange={(v) => setAmnesty((p) => ({ ...p, active: v }))}
              />
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              When active, late GST filings within the selected quarter are <strong>not penalised</strong> during
              credit scoring. The <code className="font-mono bg-muted px-1 rounded">filing_compliance_rate</code> and{" "}
              <code className="font-mono bg-muted px-1 rounded">gst_filing_delay_trend</code> features are
              multiplied by the penalty multiplier for transactions in that window.
            </p>

            <div className={`grid grid-cols-1 md:grid-cols-3 gap-5 transition-opacity ${amnesty.active ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
              <div className="space-y-1.5">
                <Label className="text-sm">Amnesty Quarter</Label>
                <Select
                  value={String(amnesty.quarter)}
                  onValueChange={(v) => setAmnesty((p) => ({ ...p, quarter: Number(v) }))}
                >
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Q1 (Apr – Jun)</SelectItem>
                    <SelectItem value="2">Q2 (Jul – Sep)</SelectItem>
                    <SelectItem value="3">Q3 (Oct – Dec)</SelectItem>
                    <SelectItem value="4">Q4 (Jan – Mar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Fiscal Year</Label>
                <Select
                  value={String(amnesty.year)}
                  onValueChange={(v) => setAmnesty((p) => ({ ...p, year: Number(v) }))}
                >
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2023, 2024, 2025, 2026].map((y) => (
                      <SelectItem key={y} value={String(y)}>FY {y}–{y + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Filing Penalty Multiplier</Label>
                <p className="text-xs text-muted-foreground">0.0 = full waiver · 1.0 = no change</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={amnesty.filing_penalty_multiplier}
                    onChange={(e) =>
                      setAmnesty((p) => ({ ...p, filing_penalty_multiplier: Number(e.target.value) }))
                    }
                    className="w-24 font-mono text-sm"
                  />
                  <span className="text-sm font-semibold text-amber-600">
                    {amnesty.filing_penalty_multiplier === 0
                      ? "Full waiver"
                      : `${(amnesty.filing_penalty_multiplier * 100).toFixed(0)}% applied`}
                  </span>
                </div>
              </div>
            </div>

            {amnesty.active && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Amnesty is <strong>active</strong> for Q{amnesty.quarter} FY{amnesty.year}–{amnesty.year + 1}.
                  Late filings in this period will use a <strong>{(amnesty.filing_penalty_multiplier * 100).toFixed(0)}%</strong> penalty
                  multiplier. Remember to save changes.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Band Score Boundaries */}
        <Card className="border-border shadow-sm">
          <CardHeader className="py-3 px-5 border-b flex-row items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              Risk Band Score Boundaries (300–900)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="space-y-3">
              {bands.map((band, idx) => (
                <div
                  key={band.band}
                  className="flex items-center gap-4 p-3 rounded-lg border border-border bg-muted/30"
                >
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${BAND_COLORS[band.band] ?? "bg-muted text-muted-foreground"} w-28 text-center`}
                  >
                    {BAND_LABELS[band.band] ?? band.band}
                  </span>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Min</Label>
                    <Input
                      type="number"
                      min="300"
                      max="900"
                      value={band.min_score}
                      onChange={(e) => updateBand(idx, "min_score", e.target.value)}
                      className="w-20 font-mono text-sm h-8"
                    />
                  </div>
                  <span className="text-muted-foreground text-sm">—</span>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Max</Label>
                    <Input
                      type="number"
                      min="300"
                      max="900"
                      value={band.max_score}
                      onChange={(e) => updateBand(idx, "max_score", e.target.value)}
                      className="w-20 font-mono text-sm h-8"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recommendation Rules (read-only summary) */}
        {recRules.length > 0 && (
          <Card className="border-border shadow-sm">
            <CardHeader className="py-3 px-5 border-b">
              <CardTitle className="text-sm font-semibold">
                Recommendation Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">MSME Category</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Risk Band</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Max WC Amount</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Max Term Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recRules.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-medium capitalize text-foreground">
                        {r.msme_category}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border ${BAND_COLORS[r.risk_band] ?? "bg-muted text-muted-foreground"}`}
                        >
                          {BAND_LABELS[r.risk_band] ?? r.risk_band}
                        </span>
                      </td>
                      <td className={`px-4 py-2.5 text-right font-medium ${r.max_wc_amount === 0 ? "text-red-600" : "text-foreground"}`}>
                        {fmtINR(r.max_wc_amount)}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-medium ${r.max_term_amount === 0 ? "text-red-600" : "text-foreground"}`}>
                        {fmtINR(r.max_term_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
