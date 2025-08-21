import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useModuleDefinitions } from "./useModuleConfig";

interface DynamicStats {
  totalRecords: number;
  todaysEntries: number;
  activeModules: number;
  moduleStats: Record<string, any>;
}

export function useDynamicStats() {
  const [stats, setStats] = useState<DynamicStats>({
    totalRecords: 0,
    todaysEntries: 0,
    activeModules: 0,
    moduleStats: {},
  });
  const [loading, setLoading] = useState(true);
  const { data: modules } = useModuleDefinitions();

  const fetchStats = useCallback(async () => {
    if (!modules) return;

    setLoading(true);
    try {
      let totalRecords = 0;
      let todaysEntries = 0;
      const moduleStats: Record<string, any> = {};

      const today = new Date().toISOString().split("T")[0];

      // Fetch stats for each active module
      for (const module of modules.filter((m) => m.is_active)) {
        try {
          // Get total count
          const { count: totalCount, error: totalError } = await (
            supabase as any
          )
            .from(module.table_name)
            .select("*", { count: "exact", head: true });

          if (totalError) {
            console.error(
              `❌ Error getting total count for ${module.name}:`,
              totalError
            );
          }

          // Get today's count
          const { count: todayCount, error: todayError } = await (
            supabase as any
          )
            .from(module.table_name)
            .select("*", { count: "exact", head: true })
            .gte("created_at", `${today}T00:00:00.000Z`)
            .lt("created_at", `${today}T23:59:59.999Z`);

          if (todayError) {
            console.error(
              `❌ Error getting today count for ${module.name}:`,
              todayError
            );
          }

          // Get module-specific stats
          const moduleSpecificStats = await getModuleSpecificStats(
            module.name,
            module.table_name
          );

          totalRecords += totalCount || 0;
          todaysEntries += todayCount || 0;
          moduleStats[module.name] = {
            total: totalCount || 0,
            today: todayCount || 0,
            ...moduleSpecificStats,
          };
        } catch (error) {
          console.error(`Error processing module ${module.name}:`, error);
        }
      }

      setStats({
        totalRecords,
        todaysEntries,
        activeModules: modules.filter((m) => m.is_active).length,
        moduleStats,
      });
    } catch (error) {
      console.error("Error fetching dynamic stats:", error);
    } finally {
      setLoading(false);
    }
  }, [modules]);

  // Set up real-time refresh for all module tables
  useEffect(() => {
    if (!modules) return;

    const allTables = modules
      .filter((m) => m.is_active)
      .map((m) => m.table_name);
    const channels: any[] = [];

    // Create channels for all tables
    allTables.forEach((tableName) => {
      const channel = supabase
        .channel(`${tableName}-changes`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: tableName,
          },
          (payload) => {
            console.log(`Real-time change in ${tableName}:`, payload);
            fetchStats();
          }
        )
        .subscribe();

      channels.push(channel);
    });

    // Also listen to activity_logs
    const activityChannel = supabase
      .channel("activity-logs-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_logs",
        },
        (payload) => {
          console.log("Real-time change in activity_logs:", payload);
          fetchStats();
        }
      )
      .subscribe();

    channels.push(activityChannel);

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [modules, fetchStats]);

  useEffect(() => {
    if (modules) {
      fetchStats();
    }
  }, [fetchStats, modules]);

  return { stats, loading, refetch: fetchStats };
}

async function getModuleSpecificStats(tableName: string, moduleName: string) {
  try {
    const { data } = await (supabase as any).from(tableName).select("*");

    if (!data) return {};

    switch (moduleName) {
      case "courier_tracking":
        return {
          dispatched: data.filter((item: any) => item.status === "Dispatched")
            .length,
          delivered: data.filter((item: any) => item.status === "Delivered")
            .length,
          inTransit: data.filter((item: any) => item.status === "In Transit")
            .length,
          delayed: data.filter((item: any) => item.status === "Delayed").length,
          failed: data.filter((item: any) => item.status === "Failed").length,
        };

      case "daily_expenses": {
        const totalExpenses = data.reduce(
          (sum: number, item: any) => sum + (parseFloat(item.total) || 0),
          0
        );
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        const monthlyExpenses = data
          .filter((item: any) => {
            const itemDate = new Date(item.date);
            return (
              itemDate.getMonth() === thisMonth &&
              itemDate.getFullYear() === thisYear
            );
          })
          .reduce(
            (sum: number, item: any) => sum + (parseFloat(item.total) || 0),
            0
          );

        return {
          totalExpenses,
          monthlyExpenses,
          avgDaily: data.length > 0 ? totalExpenses / data.length : 0,
        };
      }

      case "blazer_inventory": {
        return {
          totalStock: data.reduce(
            (sum: number, item: any) => sum + (item.quantity || 0),
            0
          ),
          inOffice: data.reduce(
            (sum: number, item: any) => sum + (item.in_office_stock || 0),
            0
          ),
          maleStock: data
            .filter((item: any) => item.gender === "Male")
            .reduce((sum: number, item: any) => sum + (item.quantity || 0), 0),
          femaleStock: data
            .filter((item: any) => item.gender === "Female")
            .reduce((sum: number, item: any) => sum + (item.quantity || 0), 0),
        };
      }

      case "games_inventory": {
        return {
          totalGames: data.reduce(
            (sum: number, item: any) => sum + (item.in_stock || 0),
            0
          ),
          distributed: data.reduce(
            (sum: number, item: any) => sum + (item.sent || 0),
            0
          ),
          available: data.reduce(
            (sum: number, item: any) => sum + (item.in_stock || 0),
            0
          ),
        };
      }

      case "kits_inventory": {
        return {
          totalItems: data.reduce(
            (sum: number, item: any) => sum + (item.closing_balance || 0),
            0
          ),
          inStock: data.reduce(
            (sum: number, item: any) => sum + (item.closing_balance || 0),
            0
          ),
          monthlyMovement: data.filter((item: any) => {
            const itemDate = new Date(item.date);
            const thisMonth = new Date().getMonth();
            const thisYear = new Date().getFullYear();
            return (
              itemDate.getMonth() === thisMonth &&
              itemDate.getFullYear() === thisYear
            );
          }).length,
        };
      }

      case "books_distribution": {
        const totalBooks = data.reduce(
          (sum: number, item: any) => sum + (item.total_used_till_now || 0),
          0
        );
        const schools = new Set(data.map((item: any) => item.school_name)).size;
        const thisMonthBooks = data
          .filter((item: any) => {
            const itemDate = new Date(item.delivery_date);
            const thisMonth = new Date().getMonth();
            const thisYear = new Date().getFullYear();
            return (
              itemDate.getMonth() === thisMonth &&
              itemDate.getFullYear() === thisYear
            );
          })
          .reduce(
            (sum: number, item: any) => sum + (item.total_used_till_now || 0),
            0
          );

        return {
          totalBooks,
          schools,
          monthlyDistribution: thisMonthBooks,
        };
      }

      default:
        return {};
    }
  } catch (error) {
    console.error(`Error getting specific stats for ${moduleName}:`, error);
    return {};
  }
}
