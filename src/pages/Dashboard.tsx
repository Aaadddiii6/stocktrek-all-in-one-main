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
import { useDashboardStats } from "@/hooks/useDashboardStats";
import {
  Package,
  Truck,
  HardHat,
  DollarSign,
  Gamepad2,
  BookOpen,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Plus,
} from "lucide-react";

const modules = [
  {
    title: "Courier Tracking",
    description: "Track outstation deliveries and shipments",
    icon: Truck,
    href: "/courier",
    color: "bg-blue-500",
  },
  {
    title: "Kits Inventory",
    description: "Manage educational kits and supplies",
    icon: Package,
    href: "/kits",
    color: "bg-green-500",
  },
  {
    title: "Daily Expenses",
    description: "Track daily operational expenses",
    icon: DollarSign,
    href: "/expenses",
    color: "bg-orange-500",
  },
  {
    title: "Blazer Inventory",
    description: "Manage uniform blazer stock by sizes",
    icon: HardHat,
    href: "/blazer",
    color: "bg-purple-500",
  },
  {
    title: "Games Inventory",
    description: "Track educational games distribution",
    icon: Gamepad2,
    href: "/games",
    color: "bg-pink-500",
  },
  {
    title: "Books Distribution",
    description: "Manage book distribution to schools",
    icon: BookOpen,
    href: "/books",
    color: "bg-indigo-500",
  },
];

export default function Dashboard() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { stats, loading } = useDashboardStats();

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
              <div className="text-2xl font-bold">6</div>
              <p className="text-xs text-muted-foreground">
                Management modules
              </p>
            </CardContent>
          </Card>
        </div>

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
