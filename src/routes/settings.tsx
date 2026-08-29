import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Power, Shield, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { DeployPanel } from "@/components/DeployPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchSettings, isServerOnline, saveSettings, writeLog } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "إعدادات السيرفر والبروكسي — محرك أتمتة YouTube Shorts" },
      {
        name: "description",
        content: "ضبط رابط تدوير البروكسي والتحكم المباشر في تشغيل أو إيقاف محرك الأتمتة السحابي.",
      },
      { property: "og:title", content: "إعدادات السيرفر والبروكسي" },
      {
        property: "og:description",
        content: "تدوير عناوين IP والتحكم بمحرك الأتمتة من مكان واحد.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const [proxy, setProxy] = useState("");

  useEffect(() => {
    if (data) setProxy(data.proxy_url ?? "");
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error("لم يتم تحميل الإعدادات بعد");
      await saveSettings(data.id, { proxy_url: proxy || null });
      await writeLog("تم تحديث إعدادات البروكسي", "info");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("تم حفظ الإعدادات");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error("لم يتم تحميل الإعدادات بعد");
      const next = data.server_status === "running" ? "stopped" : "running";
      await saveSettings(data.id, { server_status: next });
      await writeLog(
        next === "running" ? "تم إرسال أمر تشغيل المحرك" : "تم إرسال أمر إيقاف المحرك",
        next === "running" ? "success" : "warning",
      );
      return next;
    },
    onSuccess: (next) => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success(next === "running" ? "تم تشغيل المحرك" : "تم إيقاف المحرك");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const running = data?.server_status === "running";
  const online = isServerOnline(data);

  return (
    <AppShell title="إعدادات السيرفر والبروكسي" subtitle="التحكم في محرك الأتمتة وتدوير عناوين IP">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-bold">بروكسي تدوير الـ IP</h2>
              <p className="text-xs text-muted-foreground">
                يستخدمه المحرك لتغيير عنوان الخروج في كل دورة ومنع الحظر.
              </p>
            </div>
          </div>
          <Label className="mb-2 block text-sm">Proxy Rotation / IP Changer URL</Label>
          <Input
            dir="ltr"
            className="num"
            value={proxy}
            onChange={(e) => setProxy(e.target.value)}
            placeholder="http://user:pass@rotating-proxy.example.com:8000"
          />
          <Button onClick={() => save.mutate()} className="mt-4 gap-2">
            <Save className="size-4" /> حفظ الإعدادات
          </Button>
        </div>

        <div className="surface-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-xl",
                running ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
              )}
            >
              <Power className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-bold">محرك السيرفر السحابي</h2>
              <p className="text-xs text-muted-foreground">
                الأمر: {running ? "تشغيل" : "إيقاف"} • الاتصال:{" "}
                {online ? "متصل الآن" : "لا توجد نبضة حديثة"}
              </p>
            </div>
          </div>
          <Button
            onClick={() => toggle.mutate()}
            className={cn(
              "w-full gap-2",
              running
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-success text-success-foreground hover:bg-success/90",
            )}
          >
            <Power className="size-4" />
            {running ? "إيقاف المحرك" : "تشغيل المحرك"}
          </Button>
          <div className="mt-4 rounded-lg border border-border bg-secondary/60 p-3 text-xs leading-6 text-muted-foreground">
            يقرأ خادم <span className="num">automation-server</span> هذه الحالة كل بضع ثوانٍ ويبدأ أو
            يوقف الدورات فوراً، ويرسل نبضة حياة تظهر في شارة الحالة أعلى الصفحة.
          </div>
        </div>

        <DeployPanel settings={data ?? null} />
      </div>
    </AppShell>
  );
}
