"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/dib/authContext";
import { useRouter } from "next/navigation";
import { disputeApi, adminApi } from "@/dib/api";
import { FEATURE_LABELS } from "@/dib/mockData";
import { PageHeader, StatusBadge, RiskBadge } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CytoscapeGraph } from "@/components/CytoscapeGraph";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

export default function DisputeQueuePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resNote, setResNote] = useState("");
  const [unflag, setUnflag] = useState(false);
  const [graphData, setGraphData] = useState<any>({ nodes: [], edges: [] });

  useEffect(() => {
    disputeApi.list().then(setDisputes).catch(() => {});
  }, []);

  const selected = disputes.find((d: any) => d.id === selectedId);

  useEffect(() => {
    if (!selected?.gstin) return;
    adminApi.getGstinGraph(selected.gstin)
      .then(setGraphData)
      .catch(() => setGraphData({ nodes: [], edges: [] }));
  }, [selected?.gstin]);

  if (!user || user.role !== "credit_analyst") {
    router.push("/unauthorized");
    return null;
  }

  const handleResolve = async () => {
    if (!selectedId || !resNote.trim()) return;
    try {
      await disputeApi.resolve(selectedId, { unflag, resolution_note: resNote });
      setDisputes((prev) =>
        prev.map((d: any) =>
          d.id === selectedId
            ? { ...d, status: "resolved", resolution_note: resNote, analyst_id: user.id, analyst_name: user.name }
            : d,
        ),
      );
      setSelectedId(null);
      setResNote("");
      setUnflag(false);
    } catch {}
  };

  const openDisputes = disputes.filter(
    (d: any) => d.status === "under_review" || d.status === "open",
  );
  const resolvedDisputes = disputes.filter((d: any) => d.status === "resolved");

  return (
    <div className="p-6">
      <PageHeader
        title="Dispute Queue"
        description="Review and resolve fraud-flag disputes raised by MSME owners"
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Open / Under Review", value: openDisputes.length, color: "text-amber-700" },
          { label: "Resolved", value: resolvedDisputes.length, color: "text-emerald-700" },
          {
            label: "Assigned to Me",
            value: disputes.filter((d: any) => d.analyst_id === user.id).length,
            color: "text-primary",
          },
        ].map((s) => (
          <Card key={s.label} className="border-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                {s.label}
              </p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Disputes list */}
      {disputes.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No disputes found.
        </p>
      )}
      <div className="space-y-3">
        {disputes.map((d: any) => {
          const daysOpen = Math.ceil(
            (Date.now() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24),
          );
          return (
            <Card
              key={d.id}
              className="border-border shadow-sm hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => setSelectedId(d.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <StatusBadge status={d.status} />
                      <span className="text-xs text-muted-foreground font-mono">
                        {d.gstin}
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed line-clamp-2">
                      {d.description}
                    </p>
                    {d.resolution_note && (
                      <p className="text-xs text-emerald-700 mt-1.5 line-clamp-1">
                        Resolution: {d.resolution_note}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {daysOpen}d open
                    </div>
                    {d.analyst_name && (
                      <span className="text-xs text-muted-foreground">
                        Analyst: {d.analyst_name}
                      </span>
                    )}
                    <Button size="sm" variant="outline" className="text-xs h-7">
                      Review
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dispute detail slide-over */}
      <Sheet open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent side="right" className="w-full sm:w-[680px] max-w-full p-0">
          <SheetHeader className="px-5 py-4 border-b">
            <SheetTitle className="text-sm font-semibold">Dispute Detail</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-64px)]">
            {selected && (
              <div className="p-5 space-y-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">{selected.gstin}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Raised {new Date(selected.created_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <StatusBadge status={selected.status} className="ml-auto" />
                </div>

                <Card className="border-border">
                  <CardHeader className="py-2.5 px-4 border-b">
                    <CardTitle className="text-xs font-semibold">Dispute Description</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-sm text-foreground leading-relaxed">
                      {selected.description}
                    </p>
                  </CardContent>
                </Card>

                {graphData.nodes.length > 0 && (
                  <Card className="border-border">
                    <CardHeader className="py-2.5 px-4 border-b flex-row items-center gap-4">
                      <CardTitle className="text-xs font-semibold">Transaction Graph</CardTitle>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Flagged
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> Clean
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3">
                      <CytoscapeGraph data={graphData} height={300} highlightId={selected.gstin} />
                    </CardContent>
                  </Card>
                )}

                {selected.status !== "resolved" ? (
                  <Card className="border-border">
                    <CardHeader className="py-2.5 px-4 border-b">
                      <CardTitle className="text-xs font-semibold">Resolve Dispute</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <Label className="text-xs">Resolution Note</Label>
                        <Textarea
                          className="mt-1.5"
                          placeholder="Describe your findings and resolution..."
                          rows={3}
                          value={resNote}
                          onChange={(e) => setResNote(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="unflag"
                          checked={unflag}
                          onChange={(e) => setUnflag(e.target.checked)}
                          className="rounded"
                        />
                        <label htmlFor="unflag" className="text-sm text-foreground">
                          Unflag this GSTIN and trigger re-score
                        </label>
                      </div>
                      <Button
                        className="w-full bg-primary hover:bg-primary/90 gap-2"
                        disabled={!resNote.trim()}
                        onClick={handleResolve}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Submit Resolution
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-emerald-200 bg-emerald-50">
                    <CardContent className="p-4 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">Dispute Resolved</p>
                        <p className="text-sm text-emerald-700 mt-0.5 leading-relaxed">
                          {selected.resolution_note}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
