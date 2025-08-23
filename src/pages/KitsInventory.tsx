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
import { KitsInventoryTable } from "@/components/KitsInventoryTable";
import { Package, Plus, Boxes, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

export default function KitsInventory() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalItems: 0,
    inStock: 0,
    monthlyMovement: 0,
  });

  const fetchKitsStats = async () => {
    try {
      const { data, error } = await supabase.from("kits_inventory").select("*");

      if (error) throw error;

      const totalItems = data?.length || 0;
      const inStock =
        data?.reduce(
          (sum, item) =>
            sum + (item.opening_balance + item.addins - item.takeouts),
          0
        ) || 0;

      // Calculate this month's movement
      const thisMonth = new Date().toISOString().substring(0, 7);
      const monthlyData =
        data?.filter((item) => item.created_at?.startsWith(thisMonth)) || [];
      const monthlyMovement = monthlyData.reduce(
        (sum, item) => sum + item.addins + item.takeouts,
        0
      );

      setStats({
        totalItems,
        inStock,
        monthlyMovement,
      });
    } catch (error) {
      console.error("Error fetching kits stats:", error);
    }
  };

  useRealtimeRefresh({
    table: "kits_inventory",
    onRefresh: fetchKitsStats,
  });

  useEffect(() => {
    fetchKitsStats();
  }, []);

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Kits Inventory
            </h1>
            <p className="text-muted-foreground">
              Manage educational kits and supplies inventory
            </p>
          </div>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Kit Record
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalItems}</div>
              <p className="text-xs text-muted-foreground">All kit items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Stock</CardTitle>
              <Boxes className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inStock}</div>
              <p className="text-xs text-muted-foreground">
                Available inventory
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Movement This Month
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthlyMovement}</div>
              <p className="text-xs text-muted-foreground">
                Addins and takeouts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Table */}
        <KitsInventoryTable onDataChange={fetchKitsStats} />

        {/* Activity Logs */}
        <ModuleActivityLogs
          moduleType="kits_inventory"
          moduleName="Kits Inventory"
        />
      </div>

      {/* Add Record Modal */}
      <AddRecordModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchKitsStats();
        }}
        defaultModuleType="kits"
      />
    </>
  );
}
