"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/dib/authContext";
import { useRouter } from "next/navigation";
import { adminApi } from "@/dib/api";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Search, ShieldAlert, Cpu } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  dispute_assigned: "bg-blue-50 text-blue-700 border border-blue-200",
  permission_requested: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  permission_granted: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  loan_denied: "bg-red-50 text-red-700 border border-red-200",
  loan_approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  threshold_updated: "bg-violet-50 text-violet-700 border border-violet-200",
  api_key_revoked: "bg-orange-50 text-orange-700 border border-orange-200",
  score_submitted: "bg-teal-50 text-teal-700 border border-teal-200",
  dispute_resolved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  user_created: "bg-blue-50 text-blue-700 border border-blue-200",
};

const ROLE_LABELS: Record<string, string> = {
  msme: "MSME",
  loan_officer: "Loan Officer",
  credit_analyst: "Credit Analyst",
  risk_manager: "Risk Manager",
  admin: "Admin",
};

export default function AuditLogPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    adminApi.getAuditLog().then((data) => setAuditLog(data as any[])).catch(() => {});
    adminApi.getUsers().then((data) => setUsers(data as any[])).catch(() => {});
  }, []);

  useEffect(() => {


    if (!user || user.role !== "admin") {


      router.push("/unauthorized");


    }


  }, [user, router]);


  if (!user || user.role !== "admin") {


    return null;


  }

  const handleReplay = async (e: any) => {
    try {
      await adminApi.replayAudit(e);
      alert("Replay triggered successfully.");
    } catch {
      alert("Failed to replay event.");
    }
  };

  const allActions = [...new Set(auditLog.map((e: any) => e.action).filter(Boolean))];

  const filtered = auditLog.filter((e: any) => {
    const matchAction = actionFilter === "all" || e.action === actionFilter;
    const matchUser = userFilter === "all" || e.user_id === userFilter;
    const matchSearch =
      !search ||
      (e.user_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (e.action ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (e.target_id ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (e.target_type ?? "").toLowerCase().includes(search.toLowerCase());
    return matchAction && matchUser && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const groupedEvents = paged.reduce((acc: Record<string, any[]>, event: any) => {
    const d = new Date(event.timestamp);
    const dateStr = d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(event);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Audit Log"
        description="Immutable chronological flow of state-changing transactions."
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8 bg-muted/30 p-4 rounded-xl border border-border/50">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9 bg-background/50"
            placeholder="Search payload, user, target..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48 h-9 bg-background/50 border-border/50">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {allActions.map((a) => (
              <SelectItem key={a} value={a}>
                {a.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={userFilter} onValueChange={(v) => { setUserFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48 h-9 bg-background/50 border-border/50">
            <SelectValue placeholder="Filter by user" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {users.map((u: any) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || actionFilter !== "all" || userFilter !== "all") && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearch(""); setActionFilter("all"); setUserFilter("all"); setPage(1); }}>
            Clear filters
          </Button>
        )}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-6">
        Showing {paged.length} of {filtered.length} events
      </p>

      {paged.length === 0 ? (
        <div className="text-center text-muted-foreground py-20 bg-muted/10 rounded-2xl border border-dashed border-border">
          <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>No audit events match the current timeline constraints.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-primary/20 ml-2 md:ml-4 pl-6 pb-6 space-y-10 group">
          {Object.entries(groupedEvents).map(([dateStr, events]: [string, any]) => (
            <div key={dateStr} className="relative">
              {/* Node Date */}
              <div className="absolute -left-[31px] md:-left-[39px] top-0 w-3 h-3 rounded-full bg-primary ring-4 ring-background shadow-sm" />
              <h3 className="text-sm font-bold text-foreground mb-4 -mt-1 tracking-tight">{dateStr}</h3>
              
              <div className="space-y-4">
                {events.map((e: any) => (
                  <Card key={e.id} className="relative shadow-none transition-all hover:shadow-md border-border/50 overflow-hidden bg-card/60 backdrop-blur-sm">
                    {/* Time indicator pill on edge */}
                    <div className="absolute top-0 right-0 rounded-bl-xl bg-muted/80 px-3 py-1 font-mono text-[10px] text-muted-foreground border-l border-b border-border/50">
                      {new Date(e.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </div>

                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
                        <div className="space-y-3 flex-1 min-w-0">
                          {/* Header Line */}
                          <div className="flex items-center gap-2 flex-wrap max-w-full pr-16">
                            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider whitespace-nowrap ${ACTION_COLORS[e.action] || "bg-muted text-muted-foreground"}`}>
                              {(e.action ?? "").replace(/_/g, " ")}
                            </span>
                            <span className="text-muted-foreground text-sm flex items-center gap-1.5 whitespace-nowrap">
                              by <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-[9px] font-bold text-primary">{(e.user_name ?? "?").charAt(0)}</div> <span className="font-medium text-foreground">{e.user_name}</span>
                            </span>
                            <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted/50 border border-border/50 whitespace-nowrap">
                              {ROLE_LABELS[e.role] || e.role}
                            </span>
                          </div>

                          {/* Target */}
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                             <Cpu className="w-3.5 h-3.5" />
                             Targeting <span className="font-medium text-foreground capitalize truncate max-w-[120px]">{e.target_type?.replace(/_/g, " ")}</span>
                             <span className="font-mono text-xs px-1.5 py-0.5 bg-muted rounded border truncate">{e.target_id}</span>
                          </div>

                          {/* Metadata */}
                          {e.metadata && Object.keys(e.metadata).length > 0 && (
                            <div className="mt-3 bg-muted/30 rounded-lg p-3 border border-border/50 overflow-x-auto">
                              <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-all leading-tight">
                                {JSON.stringify(e.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>

                        {/* Replay Action */}
                        <div className="shrink-0 mt-2 sm:mt-0 sm:self-center">
                          <Button size="sm" variant="outline" className="gap-2 h-9 text-xs transition-colors hover:bg-primary hover:text-primary-foreground border-primary/20" onClick={() => handleReplay(e)}>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Replay Event
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
