import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseRealtimeRefreshProps {
  table: string;
  onRefresh: () => void;
  enabled?: boolean;
}

export function useRealtimeRefresh({ table, onRefresh, enabled = true }: UseRealtimeRefreshProps) {
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table
        },
        (payload) => {
          console.log(`Real-time change in ${table}:`, payload);
          onRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, onRefresh, enabled]);
}