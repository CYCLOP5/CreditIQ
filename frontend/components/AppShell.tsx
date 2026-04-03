"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/dib/authContext";
import { cn } from "@/dib/utils";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  LayoutDashboard,
  FileText,
  Briefcase,
  AlertTriangle,
  Calendar,
  HelpCircle,
  ListChecks,
  Shield,
  Network,
  Settings,
  Users,
  Building2,
  Key,
  ClipboardList,
  TrendingUp,
  Search,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

// ---- Nav items per role ----
const NAV_ITEMS: Record<
  string,
  { label: string; href: string; icon: React.ElementType }[]
> = {
  msme: [
    { label: "Dashboard", href: "/msme/dashboard", icon: LayoutDashboard },
    { label: "Score Report", href: "/msme/score-report", icon: FileText },
    { label: "Loans", href: "/msme/loans", icon: Briefcase },
    { label: "Disputes", href: "/msme/disputes", icon: AlertTriangle },
    { label: "Reminders", href: "/msme/reminders", icon: Calendar },
    { label: "Guide", href: "/msme/guide", icon: HelpCircle },
  ],
  loan_officer: [
    { label: "Loan Queue", href: "/bank/loan-queue", icon: ListChecks },
    { label: "Decisions", href: "/bank/decisions", icon: FileText },
  ],
  credit_analyst: [
    { label: "SHAP Explorer", href: "/analyst/shap-explorer", icon: Search },
    {
      label: "Signal Trends",
      href: "/analyst/signal-trends",
      icon: TrendingUp,
    },
    {
      label: "Dispute Queue",
      href: "/analyst/dispute-queue",
      icon: AlertTriangle,
    },
  ],
  risk_manager: [
    { label: "Fraud Queue", href: "/risk/fraud-queue", icon: Shield },
    { label: "Fraud Topology", href: "/risk/fraud-topology", icon: Network },
    { label: "Thresholds", href: "/risk/thresholds", icon: Settings },
  ],
  admin: [
    { label: "Overview", href: "/admin/overview", icon: LayoutDashboard },
    { label: "API Keys", href: "/admin/api-keys", icon: Key },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Banks", href: "/admin/banks", icon: Building2 },
    { label: "Audit Log", href: "/admin/audit-log", icon: ClipboardList },
  ],
};

const ROLE_LABELS: Record<string, string> = {
  msme: "MSME Owner",
  loan_officer: "Loan Officer",
  credit_analyst: "Credit Analyst",
  risk_manager: "Risk Manager",
  admin: "Admin",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, notifications, markRead, markAllRead, unreadCount } =
    useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  if (!user) return <>{children}</>;

  const navItems = NAV_ITEMS[user.role] || [];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const MobileMenuContent = () => (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b">
        <p className="text-sm font-semibold">Menu</p>
        <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
      </div>
      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <header className="h-16 bg-card border-b border-border shrink-0">
        <div className="h-full max-w-7xl mx-auto px-4 grid grid-cols-[auto_1fr_auto] items-center gap-3">
          <div className="flex items-center gap-2">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <MobileMenuContent />
              </SheetContent>
            </Sheet>

            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <GitBranch className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-semibold">MSME Credit Platform</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center justify-center gap-1">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 justify-self-end">
            {/* Notifications */}
            <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <SheetHeader className="px-4 py-3 border-b flex-row items-center justify-between">
                  <SheetTitle className="text-sm font-semibold">
                    Notifications
                  </SheetTitle>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-primary hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </SheetHeader>
                <ScrollArea className="h-full">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      No notifications
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={cn(
                            "px-4 py-3 cursor-pointer hover:bg-muted transition-colors",
                            !n.read && "bg-accent/30",
                          )}
                          onClick={() => {
                            markRead(n.id);
                            setNotifOpen(false);
                            router.push(n.action_url);
                          }}
                        >
                          <div className="flex items-start gap-2">
                            {!n.read && (
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            )}
                            {n.read && (
                              <span className="mt-1.5 w-1.5 h-1.5 shrink-0" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-foreground leading-tight">
                                {n.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                {n.body}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(n.created_at).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </SheetContent>
            </Sheet>

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {user.name.charAt(0)}
                  </div>
                  <span className="hidden sm:block text-sm">
                    {user.name.split(" ")[0]}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[user.role]}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
