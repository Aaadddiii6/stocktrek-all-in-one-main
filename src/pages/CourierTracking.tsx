import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

import { ModuleActivityLogs } from "@/components/ModuleActivityLogs";
import {
  Plus,
  Search,
  Download,
  Filter,
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
} from "lucide-react";
import { format } from "date-fns";

type CourierStatus =
  | "Dispatched"
  | "In Transit"
  | "Delivered"
  | "Delayed"
  | "Failed";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AddRecordModal } from "@/components/AddRecordModal";

interface CourierRecord {
  id: string;
  sr_no: number;
  date: string;
  name: string;
  address: string;
  phone_number: string;
  courier_details: string;
  tracking_number: string;
  status: CourierStatus;
  delivery_date?: string;
}

const statusConfig = {
  Dispatched: {
    icon: Package,
    color: "bg-blue-500",
    variant: "default" as const,
  },
  "In Transit": {
    icon: Truck,
    color: "bg-orange-500",
    variant: "secondary" as const,
  },
  Delivered: {
    icon: CheckCircle,
    color: "bg-green-500",
    variant: "default" as const,
  },
  Delayed: {
    icon: Clock,
    color: "bg-yellow-500",
    variant: "destructive" as const,
  },
  Failed: {
    icon: AlertTriangle,
    color: "bg-red-500",
    variant: "destructive" as const,
  },
};

export default function CourierTracking() {
  const [records, setRecords] = useState<CourierRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<CourierStatus | "All">(
    "All"
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();




  // Fetch records from Supabase
  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("courier_tracking")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRecords(data || []);
      // setFilteredRecords(data || []); // This line was removed from the new_code, so it's removed here.
    } catch (error) {
      console.error("Error fetching courier records:", error);
      toast.error("Failed to load courier records");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Set up real-time refresh
  useRealtimeRefresh({
    table: "courier_tracking",
    onRefresh: fetchRecords,
  });

  // Load data on component mount
  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.courier_details.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || record.status === statusFilter;

    return matchesSearch && matchesStatus;
  });



  const exportData = () => {
    const csvContent = [
      [
        "Sr No",
        "Date",
        "Name",
        "Address",
        "Phone",
        "Courier Details",
        "Tracking Number",
        "Status",
        "Delivery Date",
      ],
      ...filteredRecords.map((record) => [
        record.sr_no,
        record.date,
        record.name,
        record.address,
        record.phone_number,
        record.courier_details,
        record.tracking_number,
        record.status,
        record.delivery_date || "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "courier_tracking.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Courier Tracking
          </h1>
          <p className="text-muted-foreground">
            Manage outstation courier deliveries and shipments
          </p>
        </div>

        <Button 
          onClick={() => setIsDialogOpen(true)} 
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add New Courier
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, tracking number, or courier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value: CourierStatus | "All") =>
                  setStatusFilter(value)
                }
              >
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="Dispatched">Dispatched</SelectItem>
                  <SelectItem value="In Transit">In Transit</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Delayed">Delayed</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={exportData}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Courier Records</CardTitle>
          <CardDescription>
            Total {filteredRecords.length} records found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Sr No</th>
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-left p-4 font-medium">Name</th>
                  <th className="text-left p-4 font-medium">Address</th>
                  <th className="text-left p-4 font-medium">Phone</th>
                  <th className="text-left p-4 font-medium">Courier</th>
                  <th className="text-left p-4 font-medium">Tracking No</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Delivery Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRecords.map((record) => {
                  const statusInfo = statusConfig[record.status];
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr key={record.id} className="hover:bg-muted/25">
                      <td className="p-4 font-medium">{record.sr_no}</td>
                      <td className="p-4">
                        {format(new Date(record.date), "dd/MM/yyyy")}
                      </td>
                      <td className="p-4 font-medium">{record.name}</td>
                      <td
                        className="p-4 max-w-xs truncate"
                        title={record.address}
                      >
                        {record.address}
                      </td>
                      <td className="p-4">{record.phone_number}</td>
                      <td className="p-4">{record.courier_details}</td>
                      <td className="p-4 font-mono text-sm">
                        {record.tracking_number}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={statusInfo.variant}
                          className="flex items-center gap-1 w-fit"
                        >
                          <StatusIcon className="h-3 w-3" />
                          {record.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {record.delivery_date
                          ? format(new Date(record.delivery_date), "dd/MM/yyyy")
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading records...</p>
            </div>
          )}

          {!loading && filteredRecords.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No records found
              </h3>
              <p className="text-muted-foreground">
                {records.length === 0
                  ? "Start by adding your first courier record."
                  : "Try adjusting your search or filter criteria."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Logs */}
      <ModuleActivityLogs
        moduleType="courier_tracking"
        moduleName="Courier Tracking"
      />
    </div>

      {/* Add Record Modal */}
      <AddRecordModal
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={() => {
          setIsDialogOpen(false);
          fetchRecords();
        }}
        defaultModuleType="courier"
      />
  );
}
