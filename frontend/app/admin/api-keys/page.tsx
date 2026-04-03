"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/dib/authContext";
import { useRouter } from "next/navigation";
import { adminApi, bankApi } from "@/dib/api";
import { PageHeader, StatusBadge } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Ban, Copy, RefreshCw, Activity } from "lucide-react";

export default function ApiKeysPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [keys, setKeys] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState({ bank_id: "", quota_per_day: "500" });
  const [createdKeyValue, setCreatedKeyValue] = useState<string | null>(null);
  const [showCreated, setShowCreated] = useState(false);
  const [usageDetails, setUsageDetails] = useState<any | null>(null);

  useEffect(() => {
    adminApi.getApiKeys().then((data) => setKeys(data as any[])).catch(() => {});
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

  const handleRevoke = async (id: string) => {
    try {
      await adminApi.revokeApiKey(id);
      setKeys((prev) =>
        prev.map((k: any) =>
          k.id === id
            ? { ...k, status: "revoked", revoked_at: new Date().toISOString() }
            : k,
        ),
      );
    } catch {}
  };

  const handleRotate = async (id: string) => {
    try {
      const result = await adminApi.rotateApiKey(id) as any;
      setCreatedKeyValue(result.key ?? null);
      setShowCreated(true);
      adminApi.getApiKeys().then((data) => setKeys(data as any[])).catch(() => {});
    } catch {}
  };

  const handleUsage = async (id: string) => {
    try {
      const result = await adminApi.getApiKeyUsage(id);
      setUsageDetails(result);
    } catch {}
  };

  const handleCreate = async () => {
    if (!newKey.bank_id) return;
    try {
      const result = await adminApi.createApiKey({
        bank_id: newKey.bank_id,
        quota_per_day: parseInt(newKey.quota_per_day, 10),
      }) as any;
      setCreatedKeyValue(result.key ?? null);
      setShowCreated(true);
      setCreateOpen(false);
      setNewKey({ bank_id: "", quota_per_day: "500" });
      adminApi.getApiKeys().then((data) => setKeys(data as any[])).catch(() => {});
    } catch {}
  };

  return (
    <div className="p-6">
      <PageHeader
        title="API Keys"
        description="Manage API keys issued to banks for direct scoring API integration"
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-primary hover:bg-primary/90 gap-1.5"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                Create Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Bank</Label>
                  <Select
                    onValueChange={(v) =>
                      setNewKey((p) => ({ ...p, bank_id: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a bank..." />
                    </SelectTrigger>
                    <SelectContent>
                      {banks
                        .filter((b: any) => b.status === "active")
                        .map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Daily Request Quota</Label>
                  <Input
                    type="number"
                    value={newKey.quota_per_day}
                    onChange={(e) =>
                      setNewKey((p) => ({
                        ...p,
                        quota_per_day: e.target.value,
                      }))
                    }
                  />
                </div>
                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={handleCreate}
                  disabled={!newKey.bank_id}
                >
                  Generate Key
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Usage Modal */}
      <Dialog open={!!usageDetails} onOpenChange={(o) => (!o ? setUsageDetails(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Usage Details</DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <pre className="p-4 bg-muted text-xs rounded-md overflow-x-auto border">
              {JSON.stringify(usageDetails, null, 2)}
            </pre>
          </div>
          <Button onClick={() => setUsageDetails(null)}>Close</Button>
        </DialogContent>
      </Dialog>

      {/* One-time key reveal */}
      {showCreated && createdKeyValue && (
        <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <p className="text-sm font-semibold text-emerald-800 mb-2">
            Key generated — copy it now. It will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-white border border-emerald-200 rounded px-3 py-2 text-emerald-900">
              {createdKeyValue}
            </code>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-emerald-300"
              onClick={() => {
                navigator.clipboard.writeText(createdKeyValue);
              }}
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowCreated(false)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Keys table */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-border">
                <TableHead className="text-xs">Bank</TableHead>
                <TableHead className="text-xs">Key Prefix</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Quota / Day</TableHead>
                <TableHead className="text-xs">Usage Today</TableHead>
                <TableHead className="text-xs">Created</TableHead>
                <TableHead className="text-xs">Last Used</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    No API keys yet.
                  </TableCell>
                </TableRow>
              ) : (
                keys.map((k: any) => (
                  <TableRow
                    key={k.id}
                    className="border-border hover:bg-muted/30"
                  >
                    <TableCell className="text-sm font-medium">
                      {k.bank_name}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {k.key_prefix}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={k.status} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {(k.quota_per_day ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{
                              width: `${Math.min(100, ((k.usage_today ?? 0) / Math.max(k.quota_per_day ?? 1, 1)) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {k.usage_today ?? 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {k.created_at
                        ? new Date(k.created_at).toLocaleDateString("en-IN")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {k.last_used_at
                        ? new Date(k.last_used_at).toLocaleDateString("en-IN")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="View Usage"
                          onClick={() => handleUsage(k.id)}
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </Button>
                        {k.status === "active" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              title="Rotate key"
                              onClick={() => handleRotate(k.id)}
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Revoke key"
                              onClick={() => handleRevoke(k.id)}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
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
