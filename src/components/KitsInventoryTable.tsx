import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Search, Download, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { toast } from "sonner";

interface KitRecord {
  id: string;
  item_name: string;
  date: string;
  opening_balance: number;
  addins: number;
  takeouts: number;
  closing_balance: number | null;
  remarks: string | null;
  created_at: string;
  user_id: string;
}

interface KitsInventoryTableProps {
  onDataChange: () => void;
}

export function KitsInventoryTable({ onDataChange }: KitsInventoryTableProps) {
  const [records, setRecords] = useState<KitRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<KitRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<KitRecord>>({});
  const { logSuccess, logError } = useActivityLogger();

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from("kits_inventory")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRecords((data as unknown as KitRecord[]) || []);
      setFilteredRecords((data as unknown as KitRecord[]) || []);
    } catch (error) {
      console.error("Error fetching kit records:", error);
      toast.error("Failed to load kit records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    const filtered = records.filter(
      (record) =>
        record.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.date.includes(searchTerm) ||
        record.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.opening_balance.toString().includes(searchTerm) ||
        record.addins.toString().includes(searchTerm) ||
        record.takeouts.toString().includes(searchTerm) ||
        (record.closing_balance?.toString() || "").includes(searchTerm)
    );
    setFilteredRecords(filtered);
  }, [searchTerm, records]);

  const handleEdit = (record: KitRecord) => {
    setEditingRecord(record.id);
    setEditForm({
      item_name: record.item_name,
      opening_balance: record.opening_balance,
      addins: record.addins,
      takeouts: record.takeouts,
      remarks: record.remarks || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;

    const originalRecord = records.find((r) => r.id === editingRecord);
    if (!originalRecord) return;

    try {
      const updatedData = {
        ...editForm,
        closing_balance:
          (editForm.opening_balance || 0) +
          (editForm.addins || 0) -
          (editForm.takeouts || 0),
      };

      const { error } = await supabase
        .from("kits_inventory")
        .update(updatedData)
        .eq("id", editingRecord);

      if (error) throw error;

      // Log the changes
      const changes = Object.keys(editForm).reduce((acc: any, key) => {
        const oldValue = originalRecord[key as keyof KitRecord];
        const newValue = editForm[key as keyof KitRecord];
        if (oldValue !== newValue) {
          acc[key] = { old: oldValue, new: newValue };
        }
        return acc;
      }, {});

      await logSuccess(
        "kits_inventory",
        "UPDATE",
        {
          item_name: editForm.item_name,
          changes,
          summary: `Updated ${editForm.item_name} inventory`,
        },
        editingRecord
      );

      toast.success("Kit record updated successfully");
      fetchRecords();
      onDataChange();
      setEditingRecord(null);
      setEditForm({});
    } catch (error: any) {
      console.error("Error updating kit record:", error);
      await logError("kits_inventory", "UPDATE", error, editForm);
      toast.error("Failed to update kit record");
    }
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
    setEditForm({});
  };

  const handleDelete = async (record: KitRecord) => {
    if (!confirm("Are you sure you want to delete this kit record?")) return;

    try {
      const { error } = await supabase
        .from("kits_inventory")
        .delete()
        .eq("id", record.id);

      if (error) throw error;

      await logSuccess(
        "kits_inventory",
        "DELETE",
        {
          item_name: record.item_name,
          opening_balance: record.opening_balance,
          addins: record.addins,
          takeouts: record.takeouts,
        },
        record.id
      );

      toast.success("Kit record deleted successfully");
      fetchRecords();
      onDataChange();
    } catch (error: any) {
      console.error("Error deleting kit record:", error);
      await logError("kits_inventory", "DELETE", error, record);
      toast.error("Failed to delete kit record");
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Item Name",
      "Date",
      "Opening Balance",
      "Add-ins",
      "Take-outs",
      "Closing Balance",
      "Remarks",
      "Created At",
    ];
    const csvData = filteredRecords.map((record) => [
      record.item_name,
      record.date,
      record.opening_balance,
      record.addins,
      record.takeouts,
      record.closing_balance || 0,
      record.remarks || "",
      new Date(record.created_at).toLocaleDateString(),
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kits-inventory-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success("CSV export completed");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading kit records...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>Kit Records</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="kits_search"
                name="kits_search"
                placeholder="Search kits..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredRecords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm
              ? "No kit records found matching your search."
              : "No kit records found."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Opening Balance</TableHead>
                  <TableHead>Add-ins</TableHead>
                  <TableHead>Take-outs</TableHead>
                  <TableHead>Closing Balance</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {editingRecord === record.id ? (
                        <Input
                          id={`edit_item_name_${record.id}`}
                          name={`edit_item_name_${record.id}`}
                          value={editForm.item_name || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              item_name: e.target.value,
                            })
                          }
                          className="w-full"
                        />
                      ) : (
                        <span className="font-medium">{record.item_name}</span>
                      )}
                    </TableCell>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>
                      {editingRecord === record.id ? (
                        <Input
                          id={`edit_opening_balance_${record.id}`}
                          name={`edit_opening_balance_${record.id}`}
                          type="number"
                          value={editForm.opening_balance || 0}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              opening_balance: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-20"
                        />
                      ) : (
                        record.opening_balance
                      )}
                    </TableCell>
                    <TableCell>
                      {editingRecord === record.id ? (
                        <Input
                          id={`edit_addins_${record.id}`}
                          name={`edit_addins_${record.id}`}
                          type="number"
                          value={editForm.addins || 0}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              addins: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-20"
                        />
                      ) : (
                        <Badge variant="secondary">+{record.addins}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingRecord === record.id ? (
                        <Input
                          id={`edit_takeouts_${record.id}`}
                          name={`edit_takeouts_${record.id}`}
                          type="number"
                          value={editForm.takeouts || 0}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              takeouts: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-20"
                        />
                      ) : (
                        <Badge variant="destructive">-{record.takeouts}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {editingRecord === record.id
                          ? (editForm.opening_balance || 0) +
                            (editForm.addins || 0) -
                            (editForm.takeouts || 0)
                          : record.closing_balance ||
                            record.opening_balance +
                              record.addins -
                              record.takeouts}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-48 truncate">
                      {editingRecord === record.id ? (
                        <Input
                          id={`edit_remarks_${record.id}`}
                          name={`edit_remarks_${record.id}`}
                          value={editForm.remarks || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              remarks: e.target.value,
                            })
                          }
                          className="w-full"
                          placeholder="Remarks"
                        />
                      ) : (
                        record.remarks || "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {editingRecord === record.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleSaveEdit}
                              className="h-8 w-8 p-0"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEdit}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(record)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(record)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
