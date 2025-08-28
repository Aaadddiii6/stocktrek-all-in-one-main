import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModuleActivityLogs } from "@/components/ModuleActivityLogs";
import { AddRecordModal } from "@/components/AddRecordModal";
import { UniversalTable } from "@/components/UniversalTable";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { useModuleDefinition, useModuleFields } from "@/hooks/useModuleConfig";
import * as LucideIcons from "lucide-react";

// Helper function to map module names to AddRecordModal types
const getModuleType = (moduleName: string): string => {
  const moduleTypeMap: Record<string, string> = {
    games_inventory: "games",
    kits_inventory: "kits",
    daily_expenses: "expenses",
    courier_tracking: "courier",
    books_distribution: "books",
    blazer_inventory: "blazer",
  };

  return moduleTypeMap[moduleName] || "kits"; // Default fallback
};

interface UniversalModulePageProps {
  moduleName: string;
}

export function UniversalModulePage({ moduleName }: UniversalModulePageProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [stats, setStats] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const { data: moduleDefinition, isLoading: moduleLoading } =
    useModuleDefinition(moduleName);
  const { data: fields = [], isLoading: fieldsLoading } =
    useModuleFields(moduleName);

  // Type guard to check if data is valid
  const isValidModule =
    moduleDefinition &&
    !("error" in moduleDefinition) &&
    typeof moduleDefinition === "object" &&
    "id" in moduleDefinition;
  const isValidFields =
    fields &&
    Array.isArray(fields) &&
    fields.every((field) => typeof field === "object" && "field_name" in field);

  const fetchStats = useCallback(async () => {
    if (!isValidModule) return;

    try {
      setLoading(true);
      let query;
      const tableName = moduleDefinition.table_name;

      if (tableName === "blazer_inventory") {
        query = supabase
          .from("blazer_inventory")
          .select("*")
          .order("created_at", { ascending: false });
      } else if (tableName === "kits_inventory") {
        query = supabase
          .from("kits_inventory")
          .select("*")
          .order("created_at", { ascending: false });
      } else if (tableName === "games_inventory") {
        query = supabase
          .from("games_inventory")
          .select("*")
          .order("created_at", { ascending: false });
      } else if (tableName === "daily_expenses") {
        query = supabase
          .from("daily_expenses")
          .select("*")
          .order("created_at", { ascending: false });
      } else if (tableName === "courier_tracking") {
        query = supabase
          .from("courier_tracking")
          .select("*")
          .order("created_at", { ascending: false });
      } else {
        query = supabase
          .from(tableName as any)
          .select("*")
          .order("created_at", { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate basic stats
      const totalRecords = data?.length || 0;
      const todayRecords =
        data?.filter((item) => {
          const createdDate = new Date(item.created_at).toDateString();
          const today = new Date().toDateString();
          return createdDate === today;
        }).length || 0;

      // Module-specific calculations
      let moduleSpecificStats = {};

      if (moduleName === "blazer_inventory") {
        const totalBlazer =
          data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        const maleBlazer =
          data
            ?.filter((item) => item.gender === "Male")
            .reduce((sum, item) => sum + item.quantity, 0) || 0;
        const femaleBlazer =
          data
            ?.filter((item) => item.gender === "Female")
            .reduce((sum, item) => sum + item.quantity, 0) || 0;
        moduleSpecificStats = { totalBlazer, maleBlazer, femaleBlazer };
      } else if (moduleName === "kits_inventory") {
        const inStock =
          data?.reduce(
            (sum, item) =>
              sum +
              (item.closing_balance ??
                item.opening_balance + item.addins - item.takeouts),
            0
          ) || 0;
        moduleSpecificStats = { inStock };
      } else if (moduleName === "games_inventory") {
        // Sum 'Distributed' across all rows (total sent)
        const distributed =
          data?.reduce((sum, item) => sum + (Number(item.sent) || 0), 0) || 0;

        // Stock Available should not sum every transaction; use the LATEST row per game
        const latestByGame = new Map<string, any>();
        (data || []).forEach((row: any) => {
          const key = String(row.game_details || "");
          const existing = latestByGame.get(key);
          const rowTime = new Date(
            row.updated_at || row.created_at || 0
          ).getTime();
          const exTime = existing
            ? new Date(
                existing.updated_at || existing.created_at || 0
              ).getTime()
            : -1;
          if (!existing || rowTime > exTime) {
            latestByGame.set(key, row);
          }
        });

        let stockAvailable = 0;
        latestByGame.forEach((row) => {
          const current =
            row.in_stock ??
            Number(row.previous_stock || 0) +
              Number(row.adding || 0) -
              Number(row.sent || 0);
          stockAvailable += Number(current) || 0;
        });

        moduleSpecificStats = { distributed, stockAvailable };
      } else if (moduleName === "daily_expenses") {
        // Get current month data
        const currentMonth = new Date().toISOString().slice(0, 7);
        const currentMonthData =
          data?.filter((item) => {
            const itemMonth = new Date(item.date).toISOString().slice(0, 7);
            return itemMonth === currentMonth;
          }) || [];

        // Calculate total expenses (all time) and current month expenses
        const totalExpenses =
          data?.reduce((sum, item) => sum + (Number(item.expenses) || 0), 0) ||
          0;

        const currentMonthExpenses = currentMonthData.reduce(
          (sum, item) => sum + (Number(item.expenses) || 0),
          0
        );

        // Sum all fixed amounts for current month (not just latest)
        const totalFixedAmount = currentMonthData
          .filter((item) => item.fixed_amount && Number(item.fixed_amount) > 0)
          .reduce((sum, item) => sum + Number(item.fixed_amount), 0);

        // Get previous month carryover from first record with value
        const previousMonthCarryover = (() => {
          for (const record of currentMonthData) {
            if (
              record.previous_month_overspend != null &&
              record.previous_month_overspend !== 0
            ) {
              return Number(record.previous_month_overspend);
            }
          }
          return 0;
        })();

        // Calculate adjusted fixed amount and remaining balance
        const adjustedFixedAmount = totalFixedAmount - previousMonthCarryover;
        const remainingBalance = adjustedFixedAmount - currentMonthExpenses;

        console.log("🔍 Daily Expenses Stats Calculation:", {
          currentMonthData: currentMonthData.map((r) => ({
            id: r.id,
            date: r.date,
            fixed_amount: r.fixed_amount,
            expenses: r.expenses,
            previous_month_overspend: r.previous_month_overspend,
          })),
          totalFixedAmount,
          previousMonthCarryover,
          adjustedFixedAmount,
          totalExpenses,
          currentMonthExpenses,
          remainingBalance,
        });

        moduleSpecificStats = {
          totalExpenses: currentMonthExpenses, // Show current month expenses in the card
          fixedAmount: totalFixedAmount,
          remainingBalance,
          previousMonthCarryover,
          currentMonthEntries: currentMonthData.length, // Number of entries this month
        };
      } else if (moduleName === "courier_tracking") {
        const dispatched =
          data?.filter((item) => item.status === "Dispatched").length || 0;
        const delivered =
          data?.filter((item) => item.status === "Delivered").length || 0;
        moduleSpecificStats = { dispatched, delivered };
      }

      setStats({
        totalRecords,
        todayRecords,
        ...moduleSpecificStats,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }, [isValidModule, moduleDefinition, moduleName]);

  useRealtimeRefresh({
    table: isValidModule ? moduleDefinition.table_name : "",
    onRefresh: fetchStats,
    enabled: isValidModule,
  });

  useEffect(() => {
    if (isValidModule) {
      fetchStats();
    }
  }, [isValidModule, fetchStats]);

  if (moduleLoading || fieldsLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold">Loading...</h1>
          <p className="text-muted-foreground">
            Loading module configuration...
          </p>
        </div>
      </div>
    );
  }

  if (!isValidModule) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold">Module not found</h1>
          <p className="text-muted-foreground">
            The requested module does not exist.
          </p>
        </div>
      </div>
    );
  }

  // Get the icon component
  const IconComponent =
    isValidModule && moduleDefinition.icon
      ? (LucideIcons as any)[moduleDefinition.icon]
      : Plus;

  const handleSuccessfulAdd = () => {
    setIsAddModalOpen(false);
    fetchStats();
  };

  const renderStatCards = () => {
    const cards = [
      {
        title: "Total Records",
        value: stats.totalRecords,
        icon: IconComponent,
      },
      {
        title: "Today's Entries",
        value: stats.todayRecords,
        icon: Plus,
      },
    ];

    // Add module-specific cards
    if (moduleName === "blazer_inventory") {
      cards.push(
        {
          title: "Total Blazer",
          value: stats.totalBlazer,
          icon: IconComponent,
        },
        { title: "Male Blazer", value: stats.maleBlazer, icon: IconComponent },
        {
          title: "Female Blazer",
          value: stats.femaleBlazer,
          icon: IconComponent,
        }
      );
    } else if (moduleName === "kits_inventory") {
      cards.push({
        title: "In Stock",
        value: stats.inStock,
        icon: IconComponent,
      });
    } else if (moduleName === "games_inventory") {
      cards.push(
        { title: "Distributed", value: stats.distributed, icon: IconComponent },
        {
          title: "Stock Available",
          value: stats.stockAvailable,
          icon: IconComponent,
        }
      );
    } else if (moduleName === "daily_expenses") {
      // For daily expenses, replace default cards with specific ones
      cards.length = 0; // Clear the default cards
      cards.push(
        {
          title: "This Month Entries",
          value: stats.currentMonthEntries || 0,
          icon: IconComponent,
        },
        {
          title: "This Month Expenses",
          value: `₹${stats.totalExpenses?.toFixed(2) || "0.00"}`,
          icon: IconComponent,
        },
        {
          title: "This Month Fixed Amount",
          value: `₹${stats.fixedAmount?.toFixed(2) || "0.00"}`,
          icon: IconComponent,
        },
        {
          title: "Current Balance",
          value: `₹${stats.remainingBalance?.toFixed(2) || "0.00"}`,
          icon: IconComponent,
        },
        {
          title: "Previous Month Carryover",
          value: `₹${stats.previousMonthCarryover?.toFixed(2) || "0.00"}`,
          icon: IconComponent,
        }
      );
    } else if (moduleName === "courier_tracking") {
      cards.push(
        { title: "Dispatched", value: stats.dispatched, icon: IconComponent },
        { title: "Delivered", value: stats.delivered, icon: IconComponent }
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "-" : card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isValidModule ? moduleDefinition.display_name : "Module"}
            </h1>
            <p className="text-muted-foreground">
              {isValidModule ? moduleDefinition.description : "Loading..."}
            </p>
          </div>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Record
          </Button>
        </div>

        {/* Dynamic Stats Cards */}
        {renderStatCards()}

        {/* Universal Table */}
        {isValidModule && isValidFields && (
          <UniversalTable
            moduleName={moduleName}
            tableName={moduleDefinition.table_name}
            fields={fields}
            onDataChange={fetchStats}
          />
        )}

        {/* Activity Logs */}
        <ModuleActivityLogs
          moduleType={moduleName}
          moduleName={isValidModule ? moduleDefinition.display_name : "Module"}
        />
      </div>

      {/* Add Record Modal */}
      {isValidModule && isValidFields && (
        <AddRecordModal
          open={isAddModalOpen}
          onOpenChange={setIsAddModalOpen}
          onSuccess={handleSuccessfulAdd}
          defaultModuleType={getModuleType(moduleName)}
        />
      )}
    </>
  );
}
