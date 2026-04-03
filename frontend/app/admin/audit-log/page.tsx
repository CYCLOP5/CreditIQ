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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";

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

  if (!user || user.role !== "admin") {
    router.push("/unauthorized");
    return null;
  }

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

  return (
    <div className="p-6">
      <PageHeader
        title="Audit Log"
        description="Immutable event log of all state-changing actions in the system"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search user, action, target..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={actionFilter}
          onValueChange={(v) => {
            setActionFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
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
        <Select
          value={userFilter}
          onValueChange={(v) => {
            setUserFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setActionFilter("all");
              setUserFilter("all");
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Showing {paged.length} of {filtered.length} events
      </p>

      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-border">
                <TableHead className="text-xs">Timestamp</TableHead>
                <TableHead className="text-xs">User</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs">Action</TableHead>
                <TableHead className="text-xs">Target</TableHead>
                <TableHead className="text-xs">Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-10"
                  >
                    No audit events match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((e: any) => (
                  <TableRow
                    key={e.id}
                    className="border-border hover:bg-muted/30 align-top"
                  >
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(e.timestamp).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      <br />
                      <span className="text-[10px]">
                        {new Date(e.timestamp).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                          {(e.user_name ?? "?").charAt(0)}
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {e.user_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {ROLE_LABELS[e.role] || e.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-medium whitespace-nowrap ${ACTION_COLORS[e.action] || "bg-muted text-muted-foreground"}`}
                      >
                        {(e.action ?? "").replace(/_/g, " ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <span className="capitalize">
                        {(e.target_type ?? "").replace(/_/g, " ")}
                      </span>
                      <br />
                      <span className="font-mono text-[10px]">
                        {e.target_id}
                      </span>
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground font-mono max-w-xs">
                      <pre className="whitespace-pre-wrap break-all">
                        {JSON.stringify(e.metadata, null, 2)}
                      </pre>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
