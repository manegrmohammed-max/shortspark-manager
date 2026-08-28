import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Play, Pause, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  deleteUrl,
  fetchUrls,
  formatCountdown,
  insertUrls,
  setAllUrlsActive,
  updateUrl,
  writeLog,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/links")({
  head: () => ({
    meta: [
      { title: "إدارة الروابط — محرك أتمتة YouTube Shorts" },
      {
        name: "description",
        content:
          "إضافة عدة روابط YouTube Shorts دفعة واحدة مع ضبط وقت المشاهدة والفارق الزمني والتفاعلات.",
      },
      { property: "og:title", content: "إدارة الروابط دفعة واحدة" },
      {
        property: "og:description",
        content: "أضف روابط متعددة وتحكم في وقت المشاهدة والإعجاب والتعليق لكل رابط.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LinksPage,
});

function LinksPage() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({ queryKey: ["urls"], queryFn: fetchUrls });
  const [bulk, setBulk] = useState("");
  const [watch, setWatch] = useState(30);
  const [interval, setIntervalMin] = useState(5);
  const [like, setLike] = useState(true);
  const [comment, setComment] = useState(false);
  const [, force] = useState(0);

  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const addMutation = useMutation({
    mutationFn: async () => {
      const urls = bulk
        .split(/[\n,\s]+/)
        .map((u) => u.trim())
        .filter((u) => u.startsWith("http"));
      if (urls.length === 0) throw new Error("لم يتم العثور على روابط صالحة");
      await insertUrls(
        urls.map((url) => ({
          url,
          watch_time_sec: watch,
          interval_min: interval,
          enable_like: like,
          enable_comment: comment,
          is_active: true,
        })),
      );
      await writeLog(`تمت إضافة ${urls.length} رابط جديد من اللوحة`, "info");
      return urls.length;
    },
    onSuccess: (n) => {
      setBulk("");
      qc.invalidateQueries({ queryKey: ["urls"] });
      toast.success(`تمت إضافة ${n} رابط وتفعيلها`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patch = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateUrl(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["urls"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteUrl(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["urls"] });
      toast.success("تم حذف الرابط");
    },
  });

  const startAll = useMutation({
    mutationFn: async () => {
      await setAllUrlsActive(true);
      await writeLog("تم تفعيل جميع الروابط من اللوحة", "success");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["urls"] });
      toast.success("تم حفظ وتفعيل جميع الروابط");
    },
  });

  return (
    <AppShell title="إدارة الروابط" subtitle="إضافة دفعات من الروابط وضبط سلوك كل رابط">
      <div className="surface-card p-5">
        <h2 className="mb-4 text-base font-bold">إضافة عدة روابط دفعة واحدة</h2>
        <Label className="mb-2 block text-sm">الروابط (رابط في كل سطر)</Label>
        <Textarea
          dir="ltr"
          rows={5}
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          placeholder={"https://www.youtube.com/shorts/xxxxxxxxxxx\nhttps://youtube.com/shorts/yyyyyyyyyyy"}
          className="num"
        />

        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <Label>وقت المشاهدة الفعلية</Label>
              <span className="num font-bold text-primary">{watch} ثانية</span>
            </div>
            <Slider
              min={15}
              max={60}
              step={1}
              value={[watch]}
              onValueChange={(v) => setWatch(v[0] ?? 30)}
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <Label>الفارق الزمني بين الدورات</Label>
              <span className="num font-bold text-primary">{interval} دقيقة</span>
            </div>
            <Slider
              min={1}
              max={30}
              step={1}
              value={[interval]}
              onValueChange={(v) => setIntervalMin(v[0] ?? 5)}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={like} onCheckedChange={setLike} />
            تفعيل الإعجاب الحقيقي (Like)
          </label>
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={comment} onCheckedChange={setComment} />
            تفعيل التعليق العشوائي
          </label>
          <Button
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isPending}
            className="mr-auto gap-2"
          >
            <Plus className="size-4" /> إضافة الروابط
          </Button>
        </div>
      </div>

      <div className="surface-card mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <h2 className="text-base font-bold">الروابط المسجلة ({rows.length})</h2>
          <Button
            onClick={() => startAll.mutate()}
            className="gap-2 bg-success text-success-foreground hover:bg-success/90"
          >
            <Save className="size-4" /> حفظ وتفعيل الكل
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/70 text-xs text-muted-foreground">
              <tr>
                <th className="p-3 text-right font-semibold">الرابط</th>
                <th className="p-3 text-right font-semibold">المشاهدة/الفاصل</th>
                <th className="p-3 text-right font-semibold">تفاعلات</th>
                <th className="p-3 text-right font-semibold">المشاهدات المكتملة</th>
                <th className="p-3 text-right font-semibold">الدورة القادمة</th>
                <th className="p-3 text-right font-semibold">الحالة</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border align-middle">
                  <td className="max-w-[240px] p-3">
                    <p className="num truncate text-xs" dir="ltr">
                      {r.url}
                    </p>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={15}
                        max={60}
                        value={r.watch_time_sec}
                        onChange={(e) =>
                          patch.mutate({
                            id: r.id,
                            data: { watch_time_sec: Number(e.target.value) },
                          })
                        }
                        className="num h-8 w-16"
                      />
                      <span className="text-xs text-muted-foreground">ث /</span>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={r.interval_min}
                        onChange={(e) =>
                          patch.mutate({ id: r.id, data: { interval_min: Number(e.target.value) } })
                        }
                        className="num h-8 w-16"
                      />
                      <span className="text-xs text-muted-foreground">د</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3 text-xs">
                      <label className="flex items-center gap-1.5">
                        <Switch
                          checked={r.enable_like}
                          onCheckedChange={(v) =>
                            patch.mutate({ id: r.id, data: { enable_like: v } })
                          }
                        />
                        إعجاب
                      </label>
                      <label className="flex items-center gap-1.5">
                        <Switch
                          checked={r.enable_comment}
                          onCheckedChange={(v) =>
                            patch.mutate({ id: r.id, data: { enable_comment: v } })
                          }
                        />
                        تعليق
                      </label>
                    </div>
                  </td>
                  <td className="num p-3 font-bold">{r.total_views_count}</td>
                  <td className="num p-3">
                    {r.is_active ? formatCountdown(r.next_run_at) : "—"}
                  </td>
                  <td className="p-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        r.is_active
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {r.is_active ? r.status || "نشط" : "متوقف"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          patch.mutate({ id: r.id, data: { is_active: !r.is_active } })
                        }
                        aria-label="تبديل التشغيل"
                      >
                        {r.is_active ? (
                          <Pause className="size-4" />
                        ) : (
                          <Play className="size-4 text-success" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remove.mutate(r.id)}
                        aria-label="حذف"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-sm text-muted-foreground">
                    لا توجد روابط بعد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
