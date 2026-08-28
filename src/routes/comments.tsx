import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  deleteComment,
  fetchComments,
  insertComment,
  updateComment,
  type CommentRow,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/comments")({
  head: () => ({
    meta: [
      { title: "بنك التعليقات — محرك أتمتة YouTube Shorts" },
      {
        name: "description",
        content: "إدارة قائمة التعليقات العربية والإنجليزية المستخدمة في التفاعل العشوائي الحقيقي.",
      },
      { property: "og:title", content: "بنك التعليقات" },
      {
        property: "og:description",
        content: "أضف وعدّل التعليقات العربية والإنجليزية التي ينشرها محرك الأتمتة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommentsPage,
});

function CommentsPage() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({ queryKey: ["comments"], queryFn: fetchComments });
  const [text, setText] = useState("");
  const [lang, setLang] = useState<"ar" | "en">("ar");

  const add = useMutation({
    mutationFn: () => insertComment(text.trim(), lang),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["comments"] });
      toast.success("تمت إضافة التعليق");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patch = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CommentRow> }) => updateComment(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments"] });
      toast.success("تم الحذف");
    },
  });

  const ar = rows.filter((r) => r.lang === "ar");
  const en = rows.filter((r) => r.lang !== "ar");

  const List = ({ items, title }: { items: CommentRow[]; title: string }) => (
    <div className="surface-card p-5">
      <h2 className="mb-4 text-base font-bold">
        {title} <span className="num text-muted-foreground">({items.length})</span>
      </h2>
      <div className="space-y-2">
        {items.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 rounded-lg border border-border p-2.5"
          >
            <Input
              defaultValue={c.comment_text}
              dir={c.lang === "ar" ? "rtl" : "ltr"}
              onBlur={(e) => {
                if (e.target.value !== c.comment_text)
                  patch.mutate({ id: c.id, data: { comment_text: e.target.value } });
              }}
              className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Switch
              checked={c.is_active}
              onCheckedChange={(v) => patch.mutate({ id: c.id, data: { is_active: v } })}
            />
            <Button size="icon" variant="ghost" onClick={() => remove.mutate(c.id)} aria-label="حذف">
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">لا توجد تعليقات.</p>
        )}
      </div>
    </div>
  );

  return (
    <AppShell title="بنك التعليقات" subtitle="التعليقات التي ينشرها المحرك عشوائياً عند التفاعل">
      <div className="surface-card p-5">
        <h2 className="mb-4 text-base font-bold">إضافة تعليق جديد</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="اكتب نص التعليق..."
            dir={lang === "ar" ? "rtl" : "ltr"}
            className="min-w-[240px] flex-1"
          />
          <div className="flex rounded-lg border border-border p-1">
            {(["ar", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-semibold transition-colors",
                  lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {l === "ar" ? "عربي" : "English"}
              </button>
            ))}
          </div>
          <Button onClick={() => add.mutate()} disabled={!text.trim()} className="gap-2">
            <Plus className="size-4" /> إضافة
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <List items={ar} title="التعليقات العربية" />
        <List items={en} title="English Comments" />
      </div>
    </AppShell>
  );
}
