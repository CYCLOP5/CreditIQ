"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/dib/authContext";
import { useRouter } from "next/navigation";
import { bankApi } from "@/dib/api";
import { PageHeader, StatusBadge } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Ban, CheckCircle2, Users, Key, Building2 } from "lucide-react";

export default function AdminBanksPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [banks, setBanks] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newBank, setNewBank] = useState({ name: "", registration_number: "" });

  useEffect(() => {
    bankApi.list().then((data) => setBanks(data as any[])).catch(() => {});
  }, []);

  useEffect(() => {


    if (!user || user.role !== "admin") {


      router.push("/unauthorized");


    }


  }, [user, router]);


  if (!user || user.role !== "admin") {


    return null;


  }

  const handleToggleStatus = async (id: string) => {
    const b = banks.find((b: any) => b.id === id);
    if (!b) return;
    const newStatus = b.status === "active" ? "suspended" : "active";
    try {
      await bankApi.update(id, { status: newStatus });
      setBanks((prev) =>
        prev.map((b: any) => (b.id === id ? { ...b, status: newStatus } : b)),
      );
    } catch {}
  };

  const handleCreate = async () => {
    if (!newBank.name || !newBank.registration_number) return;
    try {
      const created = await bankApi.create({
        name: newBank.name,
        registration_number: newBank.registration_number,
      });
      setBanks((prev) => [created as any, ...prev]);
      setNewBank({ name: "", registration_number: "" });
      setCreateOpen(false);
    } catch {}
  };

  const activeCount = banks.filter((b: any) => b.status === "active").length;
  const totalOfficers = banks.reduce((s: number, b: any) => s + (b.officer_count ?? 0), 0);
  const totalKeys = banks.reduce((s: number, b: any) => s + (b.api_key_count ?? 0), 0);

  return (
    <div className="p-6">
      <PageHeader
        title="Bank Registry"
        description="Manage financial institutions integrated with the platform"
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-primary hover:bg-primary/90 gap-1.5"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                Register Bank
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register New Bank</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Bank Name</Label>
                  <Input
                    placeholder="e.g. Punjab National Bank"
                    value={newBank.name}
                    onChange={(e) =>
                      setNewBank((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>RBI Registration Number</Label>
                  <Input
                    placeholder="e.g. RBI-SCB-0123"
                    value={newBank.registration_number}
                    onChange={(e) =>
                      setNewBank((p) => ({
                        ...p,
                        registration_number: e.target.value,
                      }))
                    }
                  />
                </div>
                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={handleCreate}
                  disabled={!newBank.name || !newBank.registration_number}
                >
                  Register
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total Banks",
            value: banks.length,
            icon: Building2,
            color: "text-foreground",
          },
          {
            label: "Active",
            value: activeCount,
            icon: CheckCircle2,
            color: "text-emerald-700",
          },
          {
            label: "Loan Officers",
            value: totalOfficers,
            icon: Users,
            color: "text-primary",
          },
          {
            label: "API Keys",
            value: totalKeys,
            icon: Key,
            color: "text-primary",
          },
        ].map((s) => (
          <Card key={s.label} className="border-border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <s.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  {s.label}
                </p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-border">
                <TableHead className="text-xs">Bank Name</TableHead>
                <TableHead className="text-xs">Registration No.</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Loan Officers</TableHead>
                <TableHead className="text-xs">API Keys</TableHead>
                <TableHead className="text-xs">Registered</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banks.map((b: any) => (
                <TableRow
                  key={b.id}
                  className="border-border hover:bg-muted/30"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {b.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {b.registration_number}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={b.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      {b.officer_count ?? 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Key className="w-3.5 h-3.5 text-muted-foreground" />
                      {b.api_key_count ?? 0}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {b.created_at
                      ? new Date(b.created_at).toLocaleDateString("en-IN")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-7 gap-1 text-xs ${
                        b.status === "active"
                          ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                          : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      }`}
                      onClick={() => handleToggleStatus(b.id)}
                    >
                      {b.status === "active" ? (
                        <>
                          <Ban className="w-3.5 h-3.5" />
                          Suspend
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Activate
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
