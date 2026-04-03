"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/dib/authContext";
import { loanApi } from "@/dib/api";
import { PageHeader, StatusBadge, formatINR } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, CheckCircle2, XCircle } from "lucide-react";

export default function BankDecisionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | "approved" | "denied">("all");
  const [loans, setLoans] = useState<any[]>([]);

  const bankId = user?.bank_id;

  useEffect(() => {
    if (!bankId) return;
    loanApi.list({ bank_id: bankId }).then(setLoans).catch(() => {});
  }, [bankId]);

  if (!user || user.role !== "loan_officer") {
    router.push("/unauthorized");
    return null;
  }

  const decided = loans.filter(
    (lr: any) => lr.status === "approved" || lr.status === "denied",
  );

  const filtered = decided.filter((lr: any) => {
    const matchOutcome = outcomeFilter === "all" || lr.status === outcomeFilter;
    const matchSearch =
      !search ||
      (lr.gstin_masked ?? lr.gstin ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (lr.purpose ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (lr.loan_type ?? "").toLowerCase().includes(search.toLowerCase());
    return matchOutcome && matchSearch;
  });

  const approvedCount = decided.filter((d: any) => d.status === "approved").length;
  const deniedCount = decided.filter((d: any) => d.status === "denied").length;

  return (
    <div className="p-6">
      <PageHeader
        title="Decision History"
        description="All approved and denied loan decisions made by your bank"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Decisions", value: decided.length },
          { label: "Approved", value: approvedCount, color: "text-emerald-700" },
          { label: "Denied", value: deniedCount, color: "text-red-700" },
        ].map((s) => (
          <Card key={s.label} className="border-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                {s.label}
              </p>
              <p className={`text-2xl font-bold mt-1 ${s.color || "text-foreground"}`}>
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by GSTIN, purpose..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {(["all", "approved", "denied"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={outcomeFilter === f ? "default" : "outline"}
              className={outcomeFilter === f ? "bg-primary text-white" : ""}
              onClick={() => setOutcomeFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/50">
                <TableHead className="text-xs">GSTIN</TableHead>
                <TableHead className="text-xs">Loan Type</TableHead>
                <TableHead className="text-xs">Amount Requested</TableHead>
                <TableHead className="text-xs">Amount Offered</TableHead>
                <TableHead className="text-xs">Outcome</TableHead>
                <TableHead className="text-xs">Decided At</TableHead>
                <TableHead className="text-xs">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    No decisions match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((lr: any) => (
                  <TableRow key={lr.id} className="border-border hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">
                      {lr.gstin_masked ?? lr.gstin}
                    </TableCell>
                    <TableCell className="text-xs capitalize">
                      {lr.loan_type?.replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {formatINR(lr.amount_requested)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {lr.amount_offered ? (
                        <span className="text-emerald-700">{formatINR(lr.amount_offered)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {lr.status === "approved" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <StatusBadge status={lr.status} />
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(lr.updated_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs">
                      {lr.denial_reason ? (
                        <span className="text-red-600 line-clamp-2">{lr.denial_reason}</span>
                      ) : (
                        <span>—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
