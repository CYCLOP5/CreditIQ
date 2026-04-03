"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/dib/authContext";
import { useRouter } from "next/navigation";
import { scoreApi, adminApi, bankApi } from "@/dib/api";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Database,
  Cpu,
  RefreshCw,
  Users,
  Building2,
  Activity,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [health, setHealth] = useState<any>({
    status: "ok",
    redis_connected: false,
    model_loaded: false,
    worker_queue_depth: 0,
    system_ram_used_gb: 0,
    system_ram_total_gb: 16,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [countdown, setCountdown] = useState(30);

  const fetchHealth = () => {
    scoreApi.health().then(setHealth).catch(() => {});
  };

  useEffect(() => {
    fetchHealth();
    adminApi.getUsers().then(setUsers).catch(() => {});
    adminApi.getAuditLog().then(setAuditLog).catch(() => {});
    bankApi.list().then(setBanks).catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          setLastRefresh(new Date());
          fetchHealth();
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!user || user.role !== "admin") {
    router.push("/unauthorized");
    return null;
  }

  const ramUsedGb = health.system_ram_used_gb ?? 0;
  const ramTotalGb = health.system_ram_total_gb ?? 16;
  const ramPct = Math.round((ramUsedGb / ramTotalGb) * 100);
  const queueDepth = health.worker_queue_depth ?? 0;
  const queueColor =
    queueDepth === 0 ? "text-emerald-700" : queueDepth <= 5 ? "text-amber-700" : "text-red-700";

  const activeUsers = users.filter((u: any) => u.status === "active").length;
  const activeBanks = banks.filter((b: any) => b.status === "active").length;
  const recentAudit = auditLog.slice(0, 5);

  return (
    <div className="p-6">
      <PageHeader
        title="System Overview"
        description="Real-time platform health and key metrics"
        actions={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw
              className="w-3.5 h-3.5 animate-spin"
              style={{ animationDuration: `${countdown}s` }}
            />
            Refreshes in {countdown}s
          </div>
        }
      />

      {/* Health cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Redis */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Redis</span>
            </div>
            <div className="flex items-center gap-2">
              {health.redis_connected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className={`text-sm font-semibold ${health.redis_connected ? "text-emerald-700" : "text-red-700"}`}>
                {health.redis_connected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Model */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Model</span>
            </div>
            <div className="flex items-center gap-2">
              {health.model_loaded ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600" />
              )}
              <span className={`text-sm font-semibold ${health.model_loaded ? "text-emerald-700" : "text-amber-700"}`}>
                {health.model_loaded ? "Loaded" : "Not loaded"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Queue depth */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Queue Depth</span>
            </div>
            <span className={`text-2xl font-bold ${queueColor}`}>{queueDepth}</span>
            <span className="text-xs text-muted-foreground ml-1">jobs</span>
          </CardContent>
        </Card>

        {/* Overall status */}
        <Card className={`shadow-sm ${health.status === "ok" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Status</span>
            </div>
            <div className="flex items-center gap-2">
              {health.status === "ok" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className={`text-xl font-bold uppercase ${health.status === "ok" ? "text-emerald-700" : "text-red-700"}`}>
                {health.status}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* RAM */}
        <Card className="border-border shadow-sm">
          <CardHeader className="py-3 px-5 border-b">
            <CardTitle className="text-sm font-semibold">Memory Usage</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-bold text-foreground">
                {ramUsedGb.toFixed(1)} GB
              </span>
              <span className="text-sm text-muted-foreground">
                of {ramTotalGb.toFixed(1)} GB
              </span>
            </div>
            <Progress value={ramPct} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">{ramPct}% used</p>
          </CardContent>
        </Card>

        {/* Queue trend (static visualization) */}
        <Card className="border-border shadow-sm">
          <CardHeader className="py-3 px-5 border-b">
            <CardTitle className="text-sm font-semibold">Queue Depth</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={100}>
              <BarChart
                data={[{ t: "now", depth: queueDepth }]}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v) => [v, "Queue depth"]} />
                <Bar dataKey="depth" fill="#0c0861" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        {[
          { label: "Active Users", value: activeUsers, icon: Users, sub: `of ${users.length} total` },
          { label: "Active Banks", value: activeBanks, icon: Building2, sub: `of ${banks.length} registered` },
          { label: "Last Check", value: lastRefresh.toLocaleTimeString("en-IN"), icon: Clock, sub: "Auto-refreshes every 30s" },
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
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent audit */}
      <Card className="border-border shadow-sm">
        <CardHeader className="py-3 px-5 border-b flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
          <button
            className="text-xs text-primary hover:underline"
            onClick={() => router.push("/admin/audit-log")}
          >
            View full log
          </button>
        </CardHeader>
        <CardContent className="p-0">
          {recentAudit.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No audit events yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {recentAudit.map((e: any) => (
                <div key={e.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {(e.user_name ?? "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {e.user_name}
                      <span className="text-muted-foreground font-normal">
                        {" · "}{(e.action ?? "").replace(/_/g, " ")}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {e.target_type} · {e.target_id}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(e.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
