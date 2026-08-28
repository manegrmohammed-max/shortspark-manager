import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Link2,
  MessageSquareQuote,
  Activity,
  Settings as SettingsIcon,
  Youtube,
  Menu,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { fetchSettings, isServerOnline } from "@/lib/api";
import { useRealtimeSync } from "@/hooks/useRealtime";

const nav = [
  { to: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/links", label: "إدارة الروابط", icon: Link2 },
  { to: "/comments", label: "بنك التعليقات", icon: MessageSquareQuote },
  { to: "/logs", label: "السجلات والتحليلات", icon: Activity },
  { to: "/settings", label: "إعدادات السيرفر", icon: SettingsIcon },
] as const;

export function ServerBadge() {
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    refetchInterval: 15000,
  });
  const online = isServerOnline(data);
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
        online
          ? "border-success/30 bg-success/10 text-success"
          : "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          online ? "animate-pulse bg-success" : "bg-destructive",
        )}
      />
      {online ? "السيرفر متصل" : "السيرفر منفصل"}
    </div>
  );
}

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  useRealtimeSync();
  const [open, setOpen] = useState(false);

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="grad-primary flex size-10 items-center justify-center rounded-xl text-primary-foreground shadow-soft">
          <Youtube className="size-5" />
        </div>
        <div>
          <p className="text-sm font-bold">محرك الأتمتة</p>
          <p className="text-xs text-muted-foreground">YouTube Shorts</p>
        </div>
      </div>
      {nav.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setOpen(false)}
          activeOptions={{ exact: item.to === "/" }}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          activeProps={{
            className: "bg-sidebar-accent text-sidebar-accent-foreground font-bold",
          }}
        >
          <item.icon className="size-4" />
          {item.label}
        </Link>
      ))}
      <div className="mt-auto rounded-lg border border-border bg-secondary/60 p-3 text-[11px] leading-5 text-muted-foreground">
        شغّل خادم الأتمتة من مجلد <span className="num">automation-server</span> ليبدأ تنفيذ الدورات
        فعلياً.
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 right-0 hidden w-64 border-l border-sidebar-border bg-sidebar lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-64 border-l border-sidebar-border bg-sidebar">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:mr-64">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-border bg-background/80 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg border border-border p-2 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="فتح القائمة"
            >
              <Menu className="size-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <ServerBadge />
        </header>
        <main className="p-5">{children}</main>
      </div>
    </div>
  );
}
