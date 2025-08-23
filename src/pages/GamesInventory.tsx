import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModuleActivityLogs } from "@/components/ModuleActivityLogs";
import { AddRecordModal } from "@/components/AddRecordModal";
import { GamesInventoryTable } from "@/components/GamesInventoryTable";
import { Gamepad2, Plus, TrendingUp, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

export default function GamesInventory() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalGames: 0,
    distributed: 0,
    stockAvailable: 0,
  });

  const fetchGamesStats = async () => {
    try {
      const { data, error } = await supabase
        .from("games_inventory")
        .select("*");

      if (error) throw error;

      const totalGames = data?.length || 0;
      const distributed = data?.reduce((sum, item) => sum + item.sent, 0) || 0;
      const stockAvailable =
        data?.reduce(
          (sum, item) => sum + (item.previous_stock + item.adding - item.sent),
          0
        ) || 0;

      setStats({
        totalGames,
        distributed,
        stockAvailable,
      });
    } catch (error) {
      console.error("Error fetching games stats:", error);
    }
  };

  useRealtimeRefresh({
    table: "games_inventory",
    onRefresh: fetchGamesStats,
  });

  useEffect(() => {
    fetchGamesStats();
  }, []);

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Games Inventory
            </h1>
            <p className="text-muted-foreground">
              Track educational games distribution
            </p>
          </div>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Game Record
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Games</CardTitle>
              <Gamepad2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGames}</div>
              <p className="text-xs text-muted-foreground">
                All educational games
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Distributed</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.distributed}</div>
              <p className="text-xs text-muted-foreground">Games sent out</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Stock Available
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.stockAvailable}</div>
              <p className="text-xs text-muted-foreground">Current inventory</p>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Table */}
        <GamesInventoryTable onDataChange={fetchGamesStats} />

        {/* Activity Logs */}
        <ModuleActivityLogs
          moduleType="games_inventory"
          moduleName="Games Inventory"
        />
      </div>

      {/* Add Record Modal */}
      <AddRecordModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchGamesStats();
        }}
        defaultModuleType="games"
      />
    </>
  );
}
