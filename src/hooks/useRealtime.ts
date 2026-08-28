import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** يشترك في البث الفوري لجداول urls و logs ويحدّث الكاش تلقائياً */
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("automation-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "logs" }, () => {
        queryClient.invalidateQueries({ queryKey: ["logs"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "urls" }, () => {
        queryClient.invalidateQueries({ queryKey: ["urls"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => {
        queryClient.invalidateQueries({ queryKey: ["settings"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/** مؤقّت يعيد الرسم كل ثانية لتحديث العدّادات التنازلية */
export function useTicker(onTick: () => void, ms = 1000) {
  useEffect(() => {
    const t = setInterval(onTick, ms);
    return () => clearInterval(t);
  }, [onTick, ms]);
}
