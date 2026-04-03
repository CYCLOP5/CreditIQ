"use client";
import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 mb-4">
          <ShieldOff className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
          You do not have permission to view this page. Please contact your administrator if you believe this is a mistake.
        </p>
        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link href="/login">Return to Login</Link>
        </Button>
      </div>
    </div>
  );
}
