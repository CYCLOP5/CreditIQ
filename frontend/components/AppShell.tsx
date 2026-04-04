"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
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
  const [notifVisible, setNotifVisible] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const mainRef = useRef<HTMLElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);

  // When opening: set visible first so panel mounts, then animate in
  useEffect(() => {
    if (notifOpen) setNotifVisible(true);
  }, [notifOpen]);

  // Animate IN — fires after panel mounts (notifVisible → true → DOM renders)
  useEffect(() => {
    if (notifVisible && notifPanelRef.current) {
      gsap.fromTo(
        notifPanelRef.current,
        { opacity: 0, scale: 0.04, transformOrigin: "top right" },
        {
          opacity: 1,
          scale: 1,
          transformOrigin: "top right",
          duration: 0.5,
          ease: "back.out(1.5)",
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifVisible]);

  // Animate OUT — fires when notifOpen flips false while panel is visible
  useEffect(() => {
    if (!notifOpen && notifVisible && notifPanelRef.current) {
      gsap.to(notifPanelRef.current, {
        opacity: 0,
        scale: 0.05,
        transformOrigin: "top right",
        duration: 0.35,
        ease: "back.in(1.4)",
        onComplete: () => setNotifVisible(false),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifOpen]);

  const closeNotif = () => setNotifOpen(false);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      if (current > 50 && current > lastScrollY.current) {
        setIsScrolled(true); // scrolling down below threshold
      } else if (current < lastScrollY.current - 10 || current <= 50) {
        setIsScrolled(false); // scrolling up or at very top
      }
      lastScrollY.current = current;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useGSAP(
    () => {
      if (!mainRef.current) return;
      gsap.fromTo(
        mainRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", delay: 0.1 },
      );
    },
    { scope: mainRef, dependencies: [pathname] },
  );

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
        <p className="text-xs text-muted-foreground">
          {ROLE_LABELS[user.role]}
        </p>
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
    <div className="min-h-screen flex flex-col relative w-full items-center">
      <div
        className={cn(
          "fixed left-0 right-0 z-50 transition-all duration-500 ease-out flex justify-center w-full px-4",
          isScrolled ? "top-4" : "top-6",
        )}
      >
        <header
          className={cn(
            "h-14 lg:h-16 flex items-center shrink-0 shadow-xl rounded-full relative mx-auto",
            "transition-all duration-500 ease-out",
            isScrolled ? "px-2 sm:px-3" : "px-4 sm:px-6 md:px-8",
          )}
          style={{
            width: "max-content",
            background: "rgba(255, 255, 255, 0.35)",
            backdropFilter: "blur(5px) saturate(80%)",
            WebkitBackdropFilter: "blur(5px) saturate(80%)",
            border: "1px solid rgba(255, 255, 255, 0.45)",
            boxShadow:
              "0 8px 32px rgba(13, 148, 136, 0.15), 0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
          }}
        >
          <div className="h-full flex items-center gap-3 md:gap-5 left-0">
            <div className="flex items-center gap-2">
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden shrink-0 transition-all duration-500"
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="p-0 w-64 glass-popover border-none"
                >
                  <SheetHeader className="sr-only">
                    <SheetTitle>Navigation</SheetTitle>
                  </SheetHeader>
                  <MobileMenuContent />
                </SheetContent>
              </Sheet>

              {/* <div className="hidden sm:flex items-center px-1">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 shadow-sm border border-primary/20">
                <GitBranch className="w-4 h-4 text-primary" />
              </div>
              <div 
                 className={cn(
                   "overflow-hidden transition-all duration-500 ease-out flex items-center", 
                   isScrolled ? "max-w-0 opacity-0 ml-0 mr-0" : "max-w-[200px] opacity-100 ml-2"
                 )}
              >
                <span className="font-bold tracking-tight whitespace-nowrap text-sm mt-[1px]">
                  MSME Credit
                </span>
              </div>
            </div> */}
            </div>

            <nav className="hidden md:flex items-center justify-center gap-1.5 h-full">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={cn(
                      "flex items-center justify-center rounded-full transition-all duration-500",
                      isScrolled ? "p-2.5 sm:p-3" : "px-4 py-2",
                      active
                        ? "bg-primary text-white shadow-md shadow-primary/25 border-t border-white/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    )}
                  >
                    <Icon
                      className={cn(
                        "shrink-0 transition-all duration-500",
                        isScrolled ? "w-4.5 h-4.5" : "w-4 h-4",
                      )}
                    />
                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-500 ease-out flex items-center",
                        isScrolled
                          ? "max-w-0 opacity-0 ml-0"
                          : "max-w-[150px] opacity-100 ml-2",
                      )}
                    >
                      <span className="font-semibold whitespace-nowrap text-[13px] tracking-wide mt-[1px]">
                        {item.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 justify-self-end">
              {/* Notifications — glass popover panel */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => setNotifOpen((v) => !v)}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>

                {notifVisible && (
                  <>
                    {/* Backdrop dismiss */}
                    <div className="fixed inset-0 z-40" onClick={closeNotif} />
                    {/* Panel — fixed to escape header overflow-hidden */}
                    <div
                      ref={notifPanelRef}
                      className="fixed right-4 top-20 z-[100] w-80 rounded-2xl overflow-hidden"
                      style={{
                        background: "rgba(255,255,255,0.18)",
                        backdropFilter: "blur(24px)",
                        WebkitBackdropFilter: "blur(24px)",
                        border: "1px solid rgba(255,255,255,0.35)",
                        boxShadow:
                          "0 16px 48px rgba(13,148,136,0.2), 0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6)",
                      }}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/20">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-primary" />
                          <span className="text-sm font-semibold">
                            Notifications
                          </span>
                          {unreadCount > 0 && (
                            <span className="text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-xs text-primary hover:text-primary/70 font-medium transition-colors"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      {/* Items */}
                      <div className="max-h-[360px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                            <Bell className="w-8 h-8 opacity-30" />
                            <p className="text-sm">No notifications</p>
                          </div>
                        ) : (
                          <div>
                            {notifications.map((n) => (
                              <div
                                key={n.id}
                                onClick={() => {
                                  markRead(n.id);
                                  closeNotif();
                                  router.push(n.action_url);
                                }}
                                className={cn(
                                  "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-white/10 last:border-0",
                                  !n.read
                                    ? "bg-primary/5 hover:bg-primary/10"
                                    : "hover:bg-white/20",
                                )}
                              >
                                {/* Read indicator dot */}
                                <div className="mt-1.5 shrink-0">
                                  {!n.read ? (
                                    <span className="block w-2 h-2 rounded-full bg-primary shadow-sm shadow-primary/50" />
                                  ) : (
                                    <span className="block w-2 h-2 rounded-full bg-transparent" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={cn(
                                      "text-sm leading-tight",
                                      !n.read
                                        ? "font-semibold text-foreground"
                                        : "font-medium text-foreground/80",
                                    )}
                                  >
                                    {n.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                                    {n.body}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground/60 mt-1 font-medium">
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
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "transition-all duration-500 ease-out rounded-full flex flex-row items-center",
                      isScrolled ? "gap-0 px-2" : "gap-2 px-3",
                    )}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex flex-row items-center justify-center shrink-0 shadow-sm border border-primary/20">
                      {user.name.charAt(0)}
                    </div>
                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-500 ease-out flex items-center shrink-0",
                        isScrolled
                          ? "max-w-0 opacity-0 mx-0"
                          : "max-w-[100px] opacity-100 mx-1",
                      )}
                    >
                      <span className="hidden sm:block text-sm font-medium tracking-tight">
                        {user.name.split(" ")[0]}
                      </span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "w-3 h-3 shrink-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] opacity-70",
                        isScrolled ? "w-0 h-0 opacity-0 ml-0" : "w-3 h-3 ml-1",
                      )}
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-52 p-0 overflow-hidden rounded-2xl border-0"
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    border: "1px solid rgba(255,255,255,0.35)",
                    boxShadow:
                      "0 16px 48px rgba(13,148,136,0.2), 0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6)",
                  }}
                >
                  <div className="px-3 py-2.5 border-b border-white/20">
                    <p className="text-sm font-semibold text-foreground">
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ROLE_LABELS[user.role]}
                    </p>
                  </div>
                  <div className="p-1">
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm font-medium">Sign out</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
      </div>

      <main
        ref={mainRef}
        className="flex-1 w-full max-w-7xl mx-auto pt-28 px-4 sm:px-6 pb-12 overflow-visible"
      >
        {children}
      </main>
    </div>
  );
}
