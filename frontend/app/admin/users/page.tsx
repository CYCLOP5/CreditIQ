"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/dib/authContext";
import { useRouter } from "next/navigation";
import { adminApi, bankApi } from "@/dib/api";
import { PageHeader, StatusBadge } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, UserCheck, UserX, Key } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  msme: "MSME Owner",
  loan_officer: "Loan Officer",
  credit_analyst: "Credit Analyst",
  risk_manager: "Risk Manager",
  admin: "Admin",
};

const ROLE_COLORS: Record<string, string> = {
  msme: "bg-blue-50 text-blue-700 border border-blue-200",
  loan_officer: "bg-violet-50 text-violet-700 border border-violet-200",
  credit_analyst: "bg-teal-50 text-teal-700 border border-teal-200",
  risk_manager: "bg-amber-50 text-amber-700 border border-amber-200",
  admin: "bg-primary/10 text-primary border border-primary/20",
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  useEffect(() => {
    adminApi.getUsers().then((data) => setUsers(data as any[])).catch(() => {});
    bankApi.list().then((data) => setBanks(data as any[])).catch(() => {});
  }, []);

  if (!user || user.role !== "admin") {
    router.push("/unauthorized");
    return null;
  }

  const handleToggleStatus = async (id: string) => {
    const u = users.find((u: any) => u.id === id);
    if (!u) return;
    const newStatus = u.status === "active" ? "suspended" : "active";
    try {
      await adminApi.updateUser(id, { status: newStatus });
      setUsers((prev) =>
        prev.map((u: any) => (u.id === id ? { ...u, status: newStatus } : u)),
      );
    } catch {}
  };

  const filtered = users.filter((u: any) => {
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchSearch =
      !search ||
      (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const roleCounts = Object.entries(ROLE_LABELS).map(([role, label]) => ({
    role,
    label,
    count: users.filter((u: any) => u.role === role).length,
  }));

  return (
    <div className="p-6">
      <PageHeader
        title="User Management"
        description="Manage all user accounts across roles"
      />

      {/* Role breakdown */}
      <div className="flex flex-wrap gap-2 mb-5">
        {roleCounts.map((r) => (
          <button
            key={r.role}
            onClick={() =>
              setRoleFilter(roleFilter === r.role ? "all" : r.role)
            }
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
              roleFilter === r.role
                ? ROLE_COLORS[r.role]
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {r.label}
            <span className="bg-white/70 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
              {r.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-border">
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs">Bank / GSTIN</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Created</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u: any) => {
                const bank = u.bank_id
                  ? banks.find((b: any) => b.id === u.bank_id)
                  : null;
                return (
                  <TableRow
                    key={u.id}
                    className="border-border hover:bg-muted/30"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {(u.name ?? "?").charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {u.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {bank ? (
                        bank.name
                      ) : u.gstin ? (
                        <span className="font-mono">{u.gstin}</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={u.status ?? "active"} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString("en-IN")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-7 w-7 p-0 ${
                            u.status === "active"
                              ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                              : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          }`}
                          title={
                            u.status === "active"
                              ? "Suspend user"
                              : "Reactivate user"
                          }
                          onClick={() => handleToggleStatus(u.id)}
                          disabled={u.id === user.id}
                        >
                          {u.status === "active" ? (
                            <UserX className="w-3.5 h-3.5" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          title="Reset password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
