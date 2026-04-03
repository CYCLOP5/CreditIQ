"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/dib/authContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { MOCK_USERS } from "@/dib/mockData";
import image from "@/img/image.jpg";
import type { Role } from "@/dib/authContext";

const ROLE_LABELS: Record<string, string> = {
  msme: "MSME Owner",
  loan_officer: "Loan Officer",
  credit_analyst: "Credit Analyst",
  risk_manager: "Risk Manager",
  admin: "Admin",
};

const REDIRECT_MAP: Record<string, string> = {
  msme: "/msme/dashboard",
  loan_officer: "/bank/loan-queue",
  credit_analyst: "/analyst/shap-explorer",
  risk_manager: "/risk/fraud-queue",
  admin: "/admin/overview",
};

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error || "Login failed");
      return;
    }
    const role = result.user?.role as Role;
    router.push(REDIRECT_MAP[role] ?? "/");
  };

  const quickLogin = (email: string) => {
    setEmail(email);
    setPassword("demo");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/30 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] lg:h-[700px]">
        <div className="p-6 sm:p-10 lg:p-12 flex items-center">
          <div className="w-full max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground text-balance">
                MSME Credit Platform
              </h1>
            </div>

            <Card className="shadow-lg border-border">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPw ? "text" : "password"}
                        placeholder="Enter any password (demo)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPw ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-md">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Sign in
                  </Button>
                </form>

                <div className="mt-6">
                  {/* <p className="text-xs text-muted-foreground text-center mb-3 uppercase tracking-wide font-medium">
                    Quick demo access
                  </p> */}
                  <div className="grid grid-cols-1 gap-1.5">
                    {MOCK_USERS.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => quickLogin(u.email)}
                        className="flex items-center justify-between px-3 py-2 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/30 transition-colors text-left group"
                      >
                        <div>
                          <span className="text-sm font-medium text-foreground">
                            {u.name}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {u.email}
                          </span>
                        </div>
                        <span className="text-xs text-primary font-medium bg-accent px-2 py-0.5 rounded">
                          {ROLE_LABELS[u.role]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="relative hidden lg:block h-full">
          <Image
            src={image}
            alt="Login background"
            fill
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-primary/35 via-primary/15 to-transparent" />
        </div>
      </div>
    </div>
  );
}
