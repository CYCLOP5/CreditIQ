"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/dib/authContext";
import { useRouter } from "next/navigation";
import { adminApi } from "@/dib/api";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { CytoscapeGraph } from "@/components/CytoscapeGraph";
import { Network, Filter } from "lucide-react";

export default function FraudTopologyPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [minConfidence, setMinConfidence] = useState(0);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [globalGraph, setGlobalGraph] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [fraudAlerts, setFraudAlerts] = useState<any[]>([]);

  useEffect(() => {
    adminApi.getGlobalGraph()
      .then((data: any) => setGlobalGraph(data ?? { nodes: [], edges: [] }))
      .catch(() => {});
    adminApi.getFraudAlerts()
      .then((data) => setFraudAlerts(data as any[]))
      .catch(() => {});
  }, []);

  useEffect(() => {


    if (!user || user.role !== "risk_manager") {


      router.push("/unauthorized");


    }


  }, [user, router]);


  if (!user || user.role !== "risk_manager") {


    return null;


  }

  const filteredAlerts = fraudAlerts.filter(
    (a: any) => (a.fraud_details?.confidence ?? 0) >= minConfidence / 100,
  );

  const filteredNodes = flaggedOnly
    ? globalGraph.nodes.filter((n: any) => n.flagged)
    : globalGraph.nodes;

  const filteredEdges = flaggedOnly
    ? globalGraph.edges.filter(
        (e: any) =>
          filteredNodes.some((n: any) => n.id === e.source) &&
          filteredNodes.some((n: any) => n.id === e.target),
      )
    : globalGraph.edges;

  const graphData = { nodes: filteredNodes, edges: filteredEdges };

  const selectedAlert = selectedNode
    ? fraudAlerts.find((a: any) =>
        (a.fraud_details?.cycle_members ?? []).includes(selectedNode),
      )
    : null;

  const flaggedCount = globalGraph.nodes.filter((n: any) => n.flagged).length;
  const cleanCount = globalGraph.nodes.filter((n: any) => !n.flagged).length;

  return (
    <div className="p-6">
      <PageHeader
        title="Fraud Topology"
        description="System-wide UPI transaction network with all fraud rings highlighted"
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Filters sidebar */}
        <div className="xl:col-span-1 space-y-4">
          <Card className="border-border shadow-sm">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                <Filter className="w-3.5 h-3.5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-5">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Flagged nodes only</Label>
                <Switch
                  checked={flaggedOnly}
                  onCheckedChange={setFlaggedOnly}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">
                  Min. Confidence:{" "}
                  <span className="font-semibold text-primary">
                    {minConfidence}%
                  </span>
                </Label>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[minConfidence]}
                  onValueChange={([v]) => setMinConfidence(v)}
                  className="w-full"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setFlaggedOnly(false);
                  setMinConfidence(0);
                  setSelectedNode(null);
                }}
              >
                Reset Filters
              </Button>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card className="border-border shadow-sm">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-xs font-semibold">Legend</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {[
                { color: "bg-red-600", label: "In fraud ring" },
                { color: "bg-slate-400", label: "Clean node" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-2.5">
                  <span className={`w-3 h-3 rounded-full ${l.color} shrink-0`} />
                  <span className="text-xs text-muted-foreground">{l.label}</span>
                </div>
              ))}
              <div className="pt-1 border-t border-border space-y-1.5 text-xs text-muted-foreground">
                <p>Node size — UPI volume</p>
                <p>Edge thickness — transaction count</p>
                <p>Click node to highlight connections</p>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card className="border-border shadow-sm">
            <CardContent className="p-4 space-y-3">
              {[
                { label: "Fraud Rings", value: filteredAlerts.length, color: "text-red-700" },
                { label: "Flagged Nodes", value: flaggedCount, color: "text-amber-700" },
                { label: "Clean Nodes", value: cleanCount, color: "text-emerald-700" },
                { label: "Total Nodes", value: globalGraph.nodes.length, color: "text-foreground" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Graph */}
        <div className="xl:col-span-3 space-y-4">
          <Card className="border-border shadow-sm">
            <CardHeader className="py-3 px-4 border-b flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Network className="w-4 h-4 text-primary" />
                Transaction Network
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {graphData.nodes.length} nodes · {graphData.edges.length} edges
              </span>
            </CardHeader>
            <CardContent className="p-3">
              <CytoscapeGraph
                data={graphData}
                height={500}
                onNodeClick={(id) => setSelectedNode(id)}
              />
            </CardContent>
          </Card>

          {/* Selected node info */}
          {selectedNode && (
            <Card className="border-border shadow-sm">
              <CardHeader className="py-3 px-4 border-b">
                <CardTitle className="text-xs font-semibold">
                  Selected Node: {selectedNode}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {selectedAlert ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Fraud Ring Confidence:
                      </span>
                      <span className="text-sm font-semibold text-red-700">
                        {((selectedAlert.fraud_details?.confidence ?? 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Ring members:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {(selectedAlert.fraud_details?.cycle_members ?? []).map((m: string) => (
                          <span
                            key={m}
                            className="font-mono text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-100"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">
                        Flagged:{" "}
                        {selectedAlert.flagged_at
                          ? new Date(selectedAlert.flagged_at).toLocaleDateString("en-IN")
                          : "—"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This node is not in any detected fraud ring.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
