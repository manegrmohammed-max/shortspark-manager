-- =====================================================================
-- مخطط قاعدة البيانات لنظام أتمتة مشاهدات YouTube Shorts
-- تم تطبيق هذا المخطط بالكامل على Lovable Cloud (Postgres/Supabase)
-- =====================================================================

CREATE TABLE public.urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  watch_time_sec integer NOT NULL DEFAULT 30,
  interval_min integer NOT NULL DEFAULT 5,
  enable_like boolean NOT NULL DEFAULT false,
  enable_comment boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  total_views_count integer NOT NULL DEFAULT 0,
  total_likes_count integer NOT NULL DEFAULT 0,
  total_comments_count integer NOT NULL DEFAULT 0,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  last_run_at timestamptz,
  status text NOT NULL DEFAULT 'idle',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.urls TO anon, authenticated;
GRANT ALL ON public.urls TO service_role;
ALTER TABLE public.urls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public manage urls" ON public.urls
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_text text NOT NULL,
  lang text NOT NULL DEFAULT 'ar',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO anon, authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public manage comments" ON public.comments
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url_id uuid REFERENCES public.urls(id) ON DELETE CASCADE,
  message text NOT NULL,
  log_type text NOT NULL DEFAULT 'info',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX logs_created_at_idx ON public.logs (created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.logs TO anon, authenticated;
GRANT ALL ON public.logs TO service_role;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public manage logs" ON public.logs
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proxy_url text,
  server_status text NOT NULL DEFAULT 'stopped',
  heartbeat_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public manage settings" ON public.settings
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.settings (proxy_url, server_status) VALUES (NULL, 'stopped');

INSERT INTO public.comments (comment_text, lang) VALUES
  ('محتوى رائع، استمر 🔥', 'ar'),
  ('فيديو ممتع جدًا 👏', 'ar'),
  ('أحسنت، جودة عالية 👌', 'ar'),
  ('ما شاء الله، إبداع', 'ar'),
  ('Great video! 🔥', 'en'),
  ('This is awesome 👏', 'en'),
  ('Love this content!', 'en'),
  ('Keep it up 👌', 'en');

-- تفعيل البث الفوري (Realtime)
ALTER TABLE public.urls REPLICA IDENTITY FULL;
ALTER TABLE public.logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.urls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.logs;
