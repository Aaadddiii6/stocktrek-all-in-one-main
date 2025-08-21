import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "./useRealtimeRefresh";

interface DashboardStats {
  totalRecords: number;
  todaysEntries: number;
  activeModules: number;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRecords: 0,
    todaysEntries: 0,
    activeModules: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Get total records from all modules
      const [
        { count: kitsCount },
        { count: expensesCount },
        { count: blazerCount },
        { count: gamesCount },
        { count: booksCount },
        { count: courierCount },
      ] = await Promise.all([
        supabase
          .from("kits_inventory")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("daily_expenses")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("blazer_inventory")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("games_inventory")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("books_distribution")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("courier_tracking")
          .select("*", { count: "exact", head: true }),
      ]);

      const totalRecords =
        (kitsCount || 0) +
        (expensesCount || 0) +
        (blazerCount || 0) +
        (gamesCount || 0) +
        (booksCount || 0) +
        (courierCount || 0);

      // Get today's entries from all modules
      const [
        { count: kitsTodayCount },
        { count: expensesTodayCount },
        { count: blazerTodayCount },
        { count: gamesTodayCount },
        { count: booksTodayCount },
        { count: courierTodayCount },
      ] = await Promise.all([
        supabase
          .from("kits_inventory")
          .select("*", { count: "exact", head: true })
          .gte("created_at", `${today}T00:00:00.000Z`)
          .lt("created_at", `${today}T23:59:59.999Z`),
        supabase
          .from("daily_expenses")
          .select("*", { count: "exact", head: true })
          .gte("created_at", `${today}T00:00:00.000Z`)
          .lt("created_at", `${today}T23:59:59.999Z`),
        supabase
          .from("blazer_inventory")
          .select("*", { count: "exact", head: true })
          .gte("created_at", `${today}T00:00:00.000Z`)
          .lt("created_at", `${today}T23:59:59.999Z`),
        supabase
          .from("games_inventory")
          .select("*", { count: "exact", head: true })
          .gte("created_at", `${today}T00:00:00.000Z`)
          .lt("created_at", `${today}T23:59:59.999Z`),
        supabase
          .from("books_distribution")
          .select("*", { count: "exact", head: true })
          .gte("created_at", `${today}T00:00:00.000Z`)
          .lt("created_at", `${today}T23:59:59.999Z`),
        supabase
          .from("courier_tracking")
          .select("*", { count: "exact", head: true })
          .gte("created_at", `${today}T00:00:00.000Z`)
          .lt("created_at", `${today}T23:59:59.999Z`),
      ]);

      const todaysEntries =
        (kitsTodayCount || 0) +
        (expensesTodayCount || 0) +
        (blazerTodayCount || 0) +
        (gamesTodayCount || 0) +
        (booksTodayCount || 0) +
        (courierTodayCount || 0);

      setStats({
        totalRecords,
        todaysEntries,
        activeModules: 6, // Count of active modules
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time refresh for all tables
  useRealtimeRefresh({ table: "kits_inventory", onRefresh: fetchStats });
  useRealtimeRefresh({ table: "daily_expenses", onRefresh: fetchStats });
  useRealtimeRefresh({ table: "blazer_inventory", onRefresh: fetchStats });
  useRealtimeRefresh({ table: "games_inventory", onRefresh: fetchStats });
  useRealtimeRefresh({ table: "books_distribution", onRefresh: fetchStats });
  useRealtimeRefresh({ table: "courier_tracking", onRefresh: fetchStats });

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, refetch: fetchStats };
}
