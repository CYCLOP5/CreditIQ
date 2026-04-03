"use client";
import { AuthProvider } from "@/dib/authContext";
import { AppShell } from "@/components/AppShell";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
