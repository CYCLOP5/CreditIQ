"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/dib/authContext";
import { reminderApi } from "@/dib/api";
import { PageHeader, StatusBadge } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  IndianRupee,
} from "lucide-react";
import { cn } from "@/dib/utils";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function MsmeRemindersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [reminders, setReminders] = useState<any[]>([]);
  const [view, setView] = useState<"all" | "gst_filing" | "installment_payment">("all");

  const gstin = user?.gstin;

  useEffect(() => {
    if (!gstin) return;
    reminderApi.list(gstin).then(setReminders).catch(() => {});
  }, [gstin]);

  if (!user || user.role !== "msme") {
    router.push("/unauthorized");
    return null;
  }

  const markComplete = async (id: string) => {
    try {
      await reminderApi.complete(id);
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "completed" } : r)),
      );
    } catch {}
  };

  const overdue = reminders.filter((r: any) => r.status === "overdue");
  const due = reminders.filter((r: any) => r.status === "due");
  const upcoming = reminders.filter((r: any) => r.status === "upcoming");
  const completed = reminders.filter((r: any) => r.status === "completed");
  const filtered = view === "all" ? reminders : reminders.filter((r: any) => r.type === view);

  const statusIcon = (s: string) => {
    if (s === "overdue") return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (s === "due") return <Clock className="w-4 h-4 text-amber-500" />;
    if (s === "completed") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    return <CalendarClock className="w-4 h-4 text-blue-500" />;
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title="Reminders"
        description="FY 2025–26 · GST filing deadlines and loan installments"
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: "Overdue", count: overdue.length, color: "text-red-700 bg-red-50 border-red-200" },
          { label: "Due", count: due.length, color: "text-amber-700 bg-amber-50 border-amber-200" },
          { label: "Upcoming", count: upcoming.length, color: "text-blue-700 bg-blue-50 border-blue-200" },
          { label: "Done", count: completed.length, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {(["all", "gst_filing", "installment_payment"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              view === v ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            {v === "all" ? "All" : v === "gst_filing" ? "GST Filing" : "Installments"}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No reminders found.
        </p>
      )}
      <div className="space-y-2">
        {filtered
          .sort((a: any, b: any) => {
            const order: Record<string, number> = { overdue: 0, due: 1, upcoming: 2, completed: 3 };
            return (order[a.status] ?? 4) - (order[b.status] ?? 4);
          })
          .map((r: any) => (
            <Card
              key={r.id}
              className={cn(
                "border shadow-sm",
                r.status === "overdue" && "border-red-200 bg-red-50/40",
                r.status === "completed" && "opacity-60",
              )}
            >
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-0.5 shrink-0">{statusIcon(r.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-foreground">{r.title}</span>
                      <StatusBadge status={r.status} />
                      <span className="text-xs text-muted-foreground capitalize">
                        {r.type?.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{r.description}</p>
                    <div className="flex items-center gap-4 mt-1.5">
                      <span className="text-xs text-foreground font-medium">Due: {fmtDate(r.due_date)}</span>
                      {r.amount && (
                        <span className="flex items-center gap-0.5 text-xs text-foreground font-medium">
                          <IndianRupee className="w-3 h-3" />
                          {r.amount.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {r.status !== "completed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-xs gap-1"
                    onClick={() => markComplete(r.id)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Mark Done
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
