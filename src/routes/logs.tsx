import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { fetchLogs, fetchUrls } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/logs")({
  head: () => ({
    meta: [
      { title: "السجلات الحية والتحليلات — محرك أتمتة YouTube Shorts" },
      {
        name: "description",
        content: "بث حي للسجلات من قاعدة البيانات مع رسوم بيانية لتوزيع المشاهدات والتفاعلات.",
      },
      { property: "og:title", content: "السجلات الحية والتحليلات" },
      {
        property: "og:description",
        content: "تابع كل عملية مشاهدة وإعجاب وتعليق لحظة حدوثها مع طابع زمني دقيق.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LogsPage,
});

const typeStyles: Record<string, string> = {
  success: "bg-success/10 text-success",
  error: "bg-destructive/10 text-destructive",
  warning: "bg-warning/15 text-warning-foreground",
  info: "bg-info/10 text-info",
};

function LogsPage() {
  const { data: logs = [] } = useQuery({ queryKey: ["logs"], queryFn: () => fetchLogs(200) });
  const { data: urls = [] } = useQuery({ queryKey: ["urls"], queryFn: fetchUrls });

  const barData = urls.slice(0, 8).map((u) => ({
    name: u.url.split("/").pop()?.slice(0, 10) ?? "—",
    مشاهدات: u.total_views_count,
    إعجابات: u.total_likes_count,
    تعليقات: u.total_comments_count,
  }));

  const completed = urls.reduce(
    (s, u) => s + u.total_views_count + u.total_likes_count + u.total_comments_count,
    0,
  );
  const pending = urls.filter((u) => u.is_active && new Date(u.next_run_at) <= new Date()).length;
  const scheduled = urls.filter((u) => u.is_active && new Date(u.next_run_at) > new Date()).length;

  const pieData = [
    { name: "مكتملة", value: completed, color: "var(--color-chart-2)" },
    { name: "قيد الانتظار", value: pending, color: "var(--color-chart-3)" },
    { name: "دورات قادمة", value: scheduled, color: "var(--color-chart-1)" },
  ];

  return (
    <AppShell title="السجلات الحية والتحليلات" subtitle="بث فوري لكل عملية ينفذها المحرك">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface-card p-5 lg:col-span-2">
          <h2 className="mb-4 text-base font-bold">توزيع المشاهدات والتفاعلات لكل رابط</h2>
          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="مشاهدات" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="إعجابات" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="تعليقات" fill="var(--color-chart-4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card p-5">
          <h2 className="mb-4 text-base font-bold">حالة العمليات</h2>
          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="surface-card mt-5 p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="size-2 animate-pulse rounded-full bg-success" />
          <h2 className="text-base font-bold">بث السجلات الحي</h2>
          <span className="num text-xs text-muted-foreground">({logs.length} سجل)</span>
        </div>
        <div className="max-h-[420px] space-y-1.5 overflow-y-auto rounded-lg bg-secondary/50 p-3">
          {logs.map((l) => (
            <div
              key={l.id}
              className="flex items-start gap-3 rounded-md bg-card p-2.5 text-xs shadow-soft"
            >
              <span className="num shrink-0 text-[10px] text-muted-foreground">
                {new Date(l.created_at).toLocaleString("ar-EG", { hour12: false })}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold",
                  typeStyles[l.log_type] ?? typeStyles["info"],
                )}
              >
                {l.log_type}
              </span>
              <span className="flex-1">{l.message}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              لا توجد سجلات بعد — ستظهر هنا فور تشغيل خادم الأتمتة.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
