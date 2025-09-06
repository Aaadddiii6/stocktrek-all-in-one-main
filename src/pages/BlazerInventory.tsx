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
import { BlazerInventoryTable } from "@/components/BlazerInventoryTable";
import { HardHat, Plus, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function BlazerInventory() {
  console.log(
    "🔍 BlazerInventory component rendered - using AddRecordModal with letter-based sizes"
  );
  console.log("🔍 Current URL path:", window.location.pathname);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalBlazers: 0,
    inOfficeStock: 0,
    maleBlazers: 0,
    femaleBlazers: 0,
    sizeBreakdown: [] as Array<{
      size: string;
      total: number;
      male: number;
      female: number;
    }>,
  });

  const fetchBlazerStats = async () => {
    try {
      // Use blazer_stock table for accurate current stock levels
      const { data: stockData, error: stockError } = await supabase
        .from("blazer_stock")
        .select("*");

      if (stockError) throw stockError;

      console.log("🔍 Blazer stock data:", stockData);

      // If no stock data, try to fetch from blazer_inventory as fallback
      if (!stockData || stockData.length === 0) {
        console.log(
          "🔍 No stock data found, fetching from blazer_inventory..."
        );
        const { data: inventoryData, error: inventoryError } = await supabase
          .from("blazer_inventory")
          .select("*");

        if (inventoryError) throw inventoryError;

        console.log("🔍 Blazer inventory data:", inventoryData);

        // Calculate stats from inventory data using quantity field
        const totalBlazers = (inventoryData || []).reduce(
          (sum, item) => sum + (item.quantity || 0),
          0
        );
        const inOfficeStock = totalBlazers;

        const maleBlazers = (inventoryData || [])
          .filter((item) => item.gender === "Male")
          .reduce((sum, item) => sum + (item.quantity || 0), 0);

        const femaleBlazers = (inventoryData || [])
          .filter((item) => item.gender === "Female")
          .reduce((sum, item) => sum + (item.quantity || 0), 0);

        // Build size breakdown from inventory data
        const orderedSizes = ["XS", "S", "M", "L", "XL", "XXL"];
        const breakdownMap = new Map<
          string,
          { total: number; male: number; female: number }
        >();

        (inventoryData || []).forEach((row: any) => {
          const letters = (row.size || "")
            .toString()
            .replace("F-", "")
            .replace("M-", "");
          const prev = breakdownMap.get(letters) || {
            total: 0,
            male: 0,
            female: 0,
          };
          const qty = row.quantity || 0;
          if (row.gender === "Male") prev.male += qty;
          else if (row.gender === "Female") prev.female += qty;
          prev.total += qty;
          breakdownMap.set(letters, prev);
        });

        const sizeBreakdown = orderedSizes.map((s) => ({
          size: s,
          total: breakdownMap.get(s)?.total || 0,
          male: breakdownMap.get(s)?.male || 0,
          female: breakdownMap.get(s)?.female || 0,
        }));

        setStats({
          totalBlazers,
          inOfficeStock,
          maleBlazers,
          femaleBlazers,
          sizeBreakdown,
        });
        return;
      }

      // Calculate stats from blazer_stock table
      const totalBlazers = (stockData || []).reduce(
        (sum, item) => sum + (item.current_stock || 0),
        0
      );
      const inOfficeStock = totalBlazers;

      const maleBlazers = (stockData || [])
        .filter((item) => item.gender === "Male")
        .reduce((sum, item) => sum + (item.current_stock || 0), 0);

      const femaleBlazers = (stockData || [])
        .filter((item) => item.gender === "Female")
        .reduce((sum, item) => sum + (item.current_stock || 0), 0);

      // Build size breakdown using the stock data we already fetched
      const orderedSizes = ["XS", "S", "M", "L", "XL", "XXL"];
      const breakdownMap = new Map<
        string,
        { total: number; male: number; female: number }
      >();

      (stockData || []).forEach((row: any) => {
        const letters = (row.size || "")
          .toString()
          .replace("F-", "")
          .replace("M-", "");
        const prev = breakdownMap.get(letters) || {
          total: 0,
          male: 0,
          female: 0,
        };
        const qty = Number(row.current_stock || 0);
        if (row.gender === "Male") prev.male += qty;
        else if (row.gender === "Female") prev.female += qty;
        prev.total += qty;
        breakdownMap.set(letters, prev);
      });

      const sizeBreakdown = orderedSizes.map((s) => ({
        size: s,
        total: breakdownMap.get(s)?.total || 0,
        male: breakdownMap.get(s)?.male || 0,
        female: breakdownMap.get(s)?.female || 0,
      }));

      setStats({
        totalBlazers,
        inOfficeStock,
        maleBlazers,
        femaleBlazers,
        sizeBreakdown,
      });
    } catch (error) {
      console.error("Error fetching blazer stats:", error);
    }
  };

  useRealtimeRefresh({
    table: "blazer_inventory",
    onRefresh: fetchBlazerStats,
  });

  useEffect(() => {
    fetchBlazerStats();
  }, []);

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Blazer Inventory
            </h1>
            <p className="text-muted-foreground">
              Manage uniform blazer stock by sizes
            </p>
          </div>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Blazer Record
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Blazers
              </CardTitle>
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 px-2">
                      View by size
                      <ChevronDown className="ml-1 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Blazer stock by size</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {stats.sizeBreakdown.map((b) => (
                      <div
                        key={b.size}
                        className="flex items-center justify-between px-2 py-1 text-sm"
                      >
                        <span className="font-medium">{b.size}</span>
                        <span className="tabular-nums">
                          {b.total} (M: {b.male}, F: {b.female})
                        </span>
                      </div>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <HardHat className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBlazers}</div>
              <p className="text-xs text-muted-foreground">
                All sizes combined
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Male Blazers
              </CardTitle>
              <HardHat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.maleBlazers}</div>
              <p className="text-xs text-muted-foreground">All male sizes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Female Blazers
              </CardTitle>
              <HardHat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.femaleBlazers}</div>
              <p className="text-xs text-muted-foreground">All female sizes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                In Office Stock
              </CardTitle>
              <HardHat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inOfficeStock}</div>
              <p className="text-xs text-muted-foreground">
                Available inventory
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Blazer Records Table */}
        <BlazerInventoryTable onDataChange={fetchBlazerStats} />

        {/* Current Stock by Size (M/F split) */}
        <Card>
          <CardHeader>
            <CardTitle>Current Stock by Size</CardTitle>
            <CardDescription>
              Live in-office stock from blazer stock (M/F)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2">Size</th>
                    <th className="py-2">Male</th>
                    <th className="py-2">Female</th>
                    <th className="py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.sizeBreakdown.map((row) => (
                    <tr key={row.size} className="border-t">
                      <td className="py-2 font-medium">{row.size}</td>
                      <td className="py-2 tabular-nums">{row.male}</td>
                      <td className="py-2 tabular-nums">{row.female}</td>
                      <td className="py-2 tabular-nums">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Activity Logs */}
        <ModuleActivityLogs
          moduleType="blazer_inventory"
          moduleName="Blazer Inventory"
        />
      </div>

      {/* Use the working AddRecordModal instead of the broken AddBlazerRecordModal */}
      <AddRecordModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchBlazerStats();
        }}
        defaultModuleType="blazer"
      />
    </>
  );
}
