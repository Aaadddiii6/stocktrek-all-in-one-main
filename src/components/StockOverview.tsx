import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Package, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StockSummary {
  blazer: any[];
  kits: any[];
  games: any[];
}

export default function StockOverview() {
  const [stockSummary, setStockSummary] = useState<StockSummary>({
    blazer: [],
    kits: [],
    games: [],
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStockSummary = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch blazer inventory
      const { data: blazerData, error: blazerError } = await supabase
        .from("blazer_inventory")
        .select("*");

      if (blazerError) throw blazerError;

      // Fetch kits inventory
      const { data: kitsData, error: kitsError } = await supabase
        .from("kits_inventory")
        .select("*");

      if (kitsError) throw kitsError;

      // Fetch games inventory
      const { data: gamesData, error: gamesError } = await supabase
        .from("games_inventory")
        .select("*");

      if (gamesError) throw gamesError;

      setStockSummary({
        blazer: blazerData || [],
        kits: kitsData || [],
        games: gamesData || [],
      });
    } catch (error) {
      console.error("Error fetching stock summary:", error);
      toast({
        title: "Error",
        description: "Failed to load stock summary",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStockSummary();
  }, [fetchStockSummary]);

  const getTotalCurrentStock = () => {
    const blazerStock = (stockSummary.blazer || []).reduce(
      (sum, item) => sum + (item.in_office_stock || 0),
      0
    );
    const kitsStock = (stockSummary.kits || []).reduce(
      (sum, item) => sum + (item.closing_balance || 0),
      0
    );
    const gamesStock = (stockSummary.games || []).reduce(
      (sum, item) => sum + (item.in_stock || 0),
      0
    );
    return blazerStock + kitsStock + gamesStock;
  };

  const getTotalReceived = () => {
    const blazerReceived = (stockSummary.blazer || []).reduce(
      (sum, item) => sum + (item.quantity || 0),
      0
    );
    const kitsReceived = (stockSummary.kits || []).reduce(
      (sum, item) => sum + (item.addins || 0),
      0
    );
    const gamesReceived = (stockSummary.games || []).reduce(
      (sum, item) => sum + (item.adding || 0),
      0
    );
    return blazerReceived + kitsReceived + gamesReceived;
  };

  const getTotalDistributed = () => {
    const blazerDistributed = (stockSummary.blazer || []).reduce(
      (sum, item) => sum + (item.quantity || 0),
      0
    );
    const kitsDistributed = (stockSummary.kits || []).reduce(
      (sum, item) => sum + (item.takeouts || 0),
      0
    );
    const gamesDistributed = (stockSummary.games || []).reduce(
      (sum, item) => sum + (item.sent || 0),
      0
    );
    return blazerDistributed + kitsDistributed + gamesDistributed;
  };

  const getTotalLowStock = () => {
    const blazerLowStock = stockSummary.blazer.filter(
      (item) => (item.in_office_stock || 0) <= 5
    ).length;
    const kitsLowStock = stockSummary.kits.filter(
      (item) => (item.closing_balance || 0) <= 5
    ).length;
    const gamesLowStock = stockSummary.games.filter(
      (item) => (item.in_stock || 0) <= 5
    ).length;
    return blazerLowStock + kitsLowStock + gamesLowStock;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Loading stock data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Overview
          </CardTitle>
          <CardDescription>
            Real-time inventory levels across all modules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {getTotalCurrentStock()}
              </div>
              <div className="text-sm text-muted-foreground">Current Stock</div>
            </div>
            <div className="text-center p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                <TrendingUp className="h-4 w-4" />
                {getTotalReceived()}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Received
              </div>
            </div>
            <div className="text-center p-4 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1">
                <TrendingDown className="h-4 w-4" />
                {getTotalDistributed()}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Distributed
              </div>
            </div>
            <div className="text-center p-4 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 flex items-center justify-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                {getTotalLowStock()}
              </div>
              <div className="text-sm text-muted-foreground">
                Low Stock Items
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
