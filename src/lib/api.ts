import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type UrlRow = Database["public"]["Tables"]["urls"]["Row"];
export type CommentRow = Database["public"]["Tables"]["comments"]["Row"];
export type LogRow = Database["public"]["Tables"]["logs"]["Row"];
export type SettingsRow = Database["public"]["Tables"]["settings"]["Row"];

export async function fetchUrls(): Promise<UrlRow[]> {
  const { data, error } = await supabase
    .from("urls")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchComments(): Promise<CommentRow[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchLogs(limit = 200): Promise<LogRow[]> {
  const { data, error } = await supabase
    .from("logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchSettings(): Promise<SettingsRow | null> {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type NewUrlInput = {
  url: string;
  watch_time_sec: number;
  interval_min: number;
  enable_like: boolean;
  enable_comment: boolean;
  is_active: boolean;
};

export async function insertUrls(rows: NewUrlInput[]) {
  const { error } = await supabase.from("urls").insert(rows);
  if (error) throw error;
}

export async function updateUrl(id: string, patch: Partial<UrlRow>) {
  const { error } = await supabase.from("urls").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteUrl(id: string) {
  const { error } = await supabase.from("urls").delete().eq("id", id);
  if (error) throw error;
}

export async function setAllUrlsActive(active: boolean) {
  const { error } = await supabase
    .from("urls")
    .update({ is_active: active, next_run_at: new Date().toISOString() })
    .not("id", "is", null);
  if (error) throw error;
}

export async function insertComment(comment_text: string, lang: string) {
  const { error } = await supabase.from("comments").insert({ comment_text, lang });
  if (error) throw error;
}

export async function updateComment(id: string, patch: Partial<CommentRow>) {
  const { error } = await supabase.from("comments").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteComment(id: string) {
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) throw error;
}

export async function saveSettings(id: string, patch: Partial<SettingsRow>) {
  const { error } = await supabase
    .from("settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function writeLog(message: string, log_type = "info", url_id: string | null = null) {
  await supabase.from("logs").insert({ message, log_type, url_id });
}

/** السيرفر يعتبر متصلاً إذا كانت آخر نبضة خلال دقيقتين */
export function isServerOnline(settings: SettingsRow | null | undefined): boolean {
  if (!settings?.heartbeat_at) return false;
  return Date.now() - new Date(settings.heartbeat_at).getTime() < 2 * 60 * 1000;
}

export function formatCountdown(target: string | null | undefined): string {
  if (!target) return "--:--";
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return "جاهز الآن";
  const total = Math.floor(diff / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
