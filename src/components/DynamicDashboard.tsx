import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActivityLogsTable } from "@/components/ActivityLogsTable";
import { AddRecordModal } from "@/components/AddRecordModal";

import { useDynamicModules } from "@/hooks/useDynamicModules";
import { useDynamicStats } from "@/hooks/useDynamicStats";
import { TrendingUp, CheckCircle, Plus, Package } from "lucide-react";
import { Link } from "react-router-dom";

export default function DynamicDashboard() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { modules, isLoading: modulesLoading } = useDynamicModules();
  const { stats, loading: statsLoading } = useDynamicStats();

  const loading = modulesLoading || statsLoading;

  return (
    <>
      <div className="space-y-6 pb-20">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Unified Inventory & Tracking Management System
            </p>
          </div>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New Record
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Records
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "-" : stats.totalRecords.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                All module entries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Entries
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "-" : stats.todaysEntries.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">New records today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Modules
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeModules}</div>
              <p className="text-xs text-muted-foreground">
                Management modules
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Module Cards Section Removed */}

        {/* Activity Logs */}
        <ActivityLogsTable />
      </div>

      {/* Add Record Modal */}
      <AddRecordModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => setIsAddModalOpen(false)}
        currentBalance={undefined}
      />
    </>
  );
}

function renderModuleSpecificStats(
  moduleName: string,
  moduleStats: any,
  loading: boolean
) {
  if (loading) return null;

  switch (moduleName) {
    case "courier_tracking":
      return (
        <>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Dispatched:</span>
            <Badge variant="default">{moduleStats.dispatched || 0}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Delivered:</span>
            <Badge variant="default">{moduleStats.delivered || 0}</Badge>
          </div>
        </>
      );

    case "daily_expenses":
      return (
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Monthly Total:</span>
          <Badge variant="destructive">
            ₹{moduleStats.monthlyExpenses?.toLocaleString() || 0}
          </Badge>
        </div>
      );

    case "blazer_inventory":
      return (
        <>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">In Office:</span>
            <Badge variant="default">{moduleStats.inOffice || 0}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Male/Female:</span>
            <div className="flex gap-1">
              <Badge variant="outline">{moduleStats.maleStock || 0}</Badge>
              <Badge variant="outline">{moduleStats.femaleStock || 0}</Badge>
            </div>
          </div>
        </>
      );

    case "games_inventory":
      return (
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Available:</span>
          <Badge variant="default">{moduleStats.available || 0}</Badge>
        </div>
      );

    case "kits_inventory":
      return (
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">In Stock:</span>
          <Badge variant="default">{moduleStats.inStock || 0}</Badge>
        </div>
      );

    case "books_distribution":
      return (
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Schools:</span>
          <Badge variant="default">{moduleStats.schoolsReached || 0}</Badge>
        </div>
      );

    default:
      return null;
  }
}
