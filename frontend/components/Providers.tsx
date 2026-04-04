"use client";
import { AuthProvider } from "@/dib/authContext";
import { AppShell } from "@/components/AppShell";
import { ReactLenis } from "@studio-freight/react-lenis";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis root options={{ lerp: 0.08, duration: 1.2, smoothWheel: true }}>
      <AuthProvider>
        <AppShell>{children}</AppShell>
      </AuthProvider>
    </ReactLenis>
  );
}
