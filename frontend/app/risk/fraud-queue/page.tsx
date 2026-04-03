"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/dib/authContext";
import { useRouter } from "next/navigation";
import { adminApi } from "@/dib/api";
import { PageHeader, StatusBadge } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Shield, AlertTriangle, Users, TrendingUp } from "lucide-react";

export default function FraudQueuePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    adminApi.getFraudAlerts().then((data) => setAlerts(data as any[])).catch(() => {});
  }, []);

  if (!user || user.role !== "risk_manager") {
    router.push("/unauthorized");
    return null;
  }

  const highConf = alerts.filter(
    (a: any) => (a.fraud_details?.confidence ?? 0) >= 0.85,
  ).length;
  const withDisputes = alerts.filter((a: any) => (a.dispute_count ?? 0) > 0).length;

  return (
    <div className="p-6">
      <PageHeader
        title="Fraud Queue"
        description="System-wide view of all currently fraud-flagged GSTINs and their ring detection details"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/risk/fraud-topology")}
          >
            View Topology
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            label: "Active Fraud Flags",
            value: alerts.length,
            icon: Shield,
            color: "text-red-700",
          },
          {
            label: "High Confidence (≥85%)",
            value: highConf,
            icon: TrendingUp,
            color: "text-amber-700",
          },
          {
            label: "With Active Disputes",
            value: withDisputes,
            icon: AlertTriangle,
            color: "text-blue-700",
          },
        ].map((s) => (
          <Card key={s.label} className="border-border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  {s.label}
                </p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Fraud alerts table */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-border">
                <TableHead className="text-xs">GSTIN</TableHead>
                <TableHead className="text-xs">Business Name</TableHead>
                <TableHead className="text-xs">Confidence</TableHead>
                <TableHead className="text-xs">Cycle Size</TableHead>
                <TableHead className="text-xs">Cycle Members</TableHead>
                <TableHead className="text-xs">Flagged At</TableHead>
                <TableHead className="text-xs">Dispute Status</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    No fraud flags active.
                  </TableCell>
                </TableRow>
              ) : (
                alerts.map((alert: any) => {
                  const confidence = alert.fraud_details?.confidence ?? 0;
                  const confPct = (confidence * 100).toFixed(0);
                  const confColor =
                    confidence >= 0.85
                      ? "text-red-700 bg-red-50 border-red-200"
                      : "text-amber-700 bg-amber-50 border-amber-200";
                  const cycleMembers: string[] = alert.fraud_details?.cycle_members ?? [];
                  return (
                    <TableRow
                      key={alert.gstin}
                      className="border-border hover:bg-muted/30"
                    >
                      <TableCell className="font-mono text-xs">
                        {alert.gstin}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground">
                        {alert.msme_name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${confColor}`}
                        >
                          {confPct}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {cycleMembers.length}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {cycleMembers.map((m: string) => (
                            <span
                              key={m}
                              className="font-mono text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {alert.flagged_at
                          ? new Date(alert.flagged_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {alert.dispute_status ? (
                          <StatusBadge status={alert.dispute_status} />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No dispute
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => router.push("/risk/fraud-topology")}
                        >
                          View Graph
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
