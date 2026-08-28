import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye, Link2, Heart, MessageSquare, Server, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  fetchUrls,
  fetchLogs,
  fetchSettings,
  isServerOnline,
  formatCountdown,
  type UrlRow,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم — محرك أتمتة مشاهدات YouTube Shorts" },
      {
        name: "description",
        content:
          "لوحة تحكم سحابية عربية لإدارة أتمتة مشاهدات وتفاعلات روابط YouTube Shorts مع إحصائيات حية وسجلات فورية.",
      },
      { property: "og:title", content: "لوحة التحكم — محرك أتمتة YouTube Shorts" },
      {
        property: "og:description",
        content: "إحصائيات حية للمشاهدات والتفاعلات وحالة السيرفر السحابي في الوقت الفعلي.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone: "primary" | "success" | "info" | "warning";
  hint?: string;
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    info: "bg-info/10 text-info",
    warning: "bg-warning/15 text-warning-foreground",
  } as const;
  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="num mt-2 text-3xl font-extrabold">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className={cn("flex size-11 items-center justify-center rounded-xl", tones[tone])}>
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}

function DashboardPage() {
  const urls = useQuery({ queryKey: ["urls"], queryFn: fetchUrls });
  const logs = useQuery({ queryKey: ["logs"], queryFn: () => fetchLogs(8) });
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const rows: UrlRow[] = urls.data ?? [];
  const totalViews = rows.reduce((s, r) => s + r.total_views_count, 0);
  const totalLikes = rows.reduce((s, r) => s + r.total_likes_count, 0);
  const totalComments = rows.reduce((s, r) => s + r.total_comments_count, 0);
  const active = rows.filter((r) => r.is_active).length;
  const online = isServerOnline(settings.data);
  const next = rows
    .filter((r) => r.is_active)
    .sort((a, b) => +new Date(a.next_run_at) - +new Date(b.next_run_at))[0];

  return (
    <AppShell title="لوحة التحكم" subtitle="نظرة حية على أداء محرك الأتمتة">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="إجمالي المشاهدات المكتملة"
          value={totalViews.toLocaleString("en-US")}
          icon={Eye}
          tone="primary"
        />
        <StatCard
          label="الروابط النشطة"
          value={`${active} / ${rows.length}`}
          icon={Link2}
          tone="info"
        />
        <StatCard
          label="إجمالي التفاعلات المكتملة"
          value={(totalLikes + totalComments).toLocaleString("en-US")}
          icon={Heart}
          tone="success"
          hint={`${totalLikes} إعجاب • ${totalComments} تعليق`}
        />
        <StatCard
          label="حالة السيرفر"
          value={online ? "متصل" : "منفصل"}
          icon={Server}
          tone={online ? "success" : "warning"}
          hint={
            settings.data?.heartbeat_at
              ? `آخر نبضة: ${new Date(settings.data.heartbeat_at).toLocaleTimeString("ar-EG")}`
              : "لم تصل أي نبضة بعد"
          }
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="surface-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">الروابط قيد التشغيل</h2>
            {next && (
              <span className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs">
                <Timer className="size-3.5" />
                الدورة القادمة خلال{" "}
                <span className="num font-bold">{formatCountdown(next.next_run_at)}</span>
              </span>
            )}
          </div>
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              لا توجد روابط بعد — أضف روابطك من صفحة «إدارة الروابط».
            </p>
          ) : (
            <div className="space-y-2">
              {rows.slice(0, 6).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="num truncate text-xs text-muted-foreground">{r.url}</p>
                    <p className="mt-1 text-xs">
                      مشاهدات: <span className="num font-bold">{r.total_views_count}</span> •
                      إعجابات: <span className="num font-bold">{r.total_likes_count}</span> •
                      تعليقات: <span className="num font-bold">{r.total_comments_count}</span>
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      r.is_active
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {r.is_active ? formatCountdown(r.next_run_at) : "متوقف"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="surface-card p-5">
          <h2 className="mb-4 text-base font-bold">آخر السجلات</h2>
          <div className="space-y-2">
            {(logs.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">لا توجد سجلات بعد.</p>
            )}
            {(logs.data ?? []).map((l) => (
              <div key={l.id} className="rounded-lg bg-secondary/70 p-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{l.log_type}</span>
                  <span className="num text-[10px] text-muted-foreground">
                    {new Date(l.created_at).toLocaleTimeString("ar-EG")}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">{l.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
