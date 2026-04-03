"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/dib/authContext";
import { disputeApi } from "@/dib/api";
import { useScore } from "@/hooks/useScore";
import { PageHeader, StatusBadge } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Flag,
  User as UserIcon,
  CheckCircle2,
} from "lucide-react";

export default function MsmeDisputesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { score } = useScore(user?.gstin);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [desc, setDesc] = useState("");

  const gstin = user?.gstin;

  useEffect(() => {
    if (!gstin) return;
    disputeApi.list({ gstin }).then(setDisputes).catch(() => {});
  }, [gstin]);

  useEffect(() => {


    if (!user || user.role !== "msme") {


      router.push("/unauthorized");


    }


  }, [user, router]);


  if (!user || user.role !== "msme") {


    return null;


  }

  const openDispute = disputes.find(
    (d: any) => d.status === "open" || d.status === "under_review",
  );

  if (!score?.fraud_flag && disputes.length === 0) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <PageHeader title="Disputes" description="Manage fraud flag disputes" />
        <Card className="border-border shadow-sm">
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="font-semibold text-foreground">No Active Fraud Flag</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your GSTIN has no fraud flags. Disputes are only available when a flag is raised.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gstin || !desc.trim()) return;
    try {
      await disputeApi.create({ gstin, description: desc });
      setSubmitted(true);
      disputeApi.list({ gstin }).then(setDisputes).catch(() => {});
    } catch {}
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader title="Disputes" description="Contest fraud flags on your GSTIN" />

      {score?.fraud_flag && (
        <div className="mb-5 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
          <Flag className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Active Fraud Flag</p>
            {score.fraud_details && (
              <p className="text-sm">
                Confidence: {((score.fraud_details.confidence ?? 0) * 100).toFixed(0)}%
              </p>
            )}
          </div>
        </div>
      )}

      {disputes.length > 0 && (
        <div className="mb-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Your Disputes</h2>
          {disputes.map((d: any) => (
            <Card key={d.id} className="border-border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <StatusBadge status={d.status} />
                      <span className="text-xs text-muted-foreground">
                        Filed {new Date(d.created_at).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{d.description}</p>
                    {d.analyst_name && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                        <UserIcon className="w-3 h-3" />
                        Assigned to {d.analyst_name}
                      </div>
                    )}
                    {d.resolution_note && (
                      <div className="mt-2 p-2 bg-emerald-50 rounded text-xs text-emerald-800 border border-emerald-200">
                        <span className="font-semibold">Resolution: </span>
                        {d.resolution_note}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!openDispute && (
        <Card className="border-border shadow-sm">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm font-semibold">Raise a New Dispute</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {submitted ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
                <p className="font-semibold text-foreground">Dispute Submitted</p>
                <p className="text-sm text-muted-foreground mt-1">
                  A credit analyst will review your case shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="desc">Describe the issue</Label>
                  <Textarea
                    id="desc"
                    placeholder="Explain why you believe the fraud flag is incorrect."
                    rows={5}
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90"
                  disabled={!desc.trim()}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Submit Dispute
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {openDispute && (
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="p-4 text-sm text-amber-800">
            You already have an open or under-review dispute. You cannot raise another until it is resolved.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
