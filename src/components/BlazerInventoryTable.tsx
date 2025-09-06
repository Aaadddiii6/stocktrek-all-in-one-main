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
import { Edit, Trash2, Search, Download, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface BlazerRecord {
  id: string;
  gender: string;
  size: string;
  quantity: number;
  added: number;
  sent: number;
  in_office_stock: number;
  remarks: string | null;
  created_at: string;
  user_id: string;
}

interface BlazerInventoryTableProps {
  onDataChange: () => void;
}

export function BlazerInventoryTable({
  onDataChange,
}: BlazerInventoryTableProps) {
  const [records, setRecords] = useState<BlazerRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<BlazerRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>("");
  const { logSuccess, logError } = useActivityLogger();

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from("blazer_inventory")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRecords((data as unknown as BlazerRecord[]) || []);
      setFilteredRecords((data as unknown as BlazerRecord[]) || []);
    } catch (error) {
      console.error("Error fetching blazer records:", error);
      toast.error("Failed to load blazer records");
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
        record.gender.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.size.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.quantity.toString().includes(searchTerm) ||
        record.in_office_stock.toString().includes(searchTerm)
    );
    setFilteredRecords(filtered);
  }, [searchTerm, records]);

  // Calculate current in_office_stock for a given gender/size combination
  const getCurrentInOfficeStock = (gender: string, size: string) => {
    return records
      .filter((record) => record.gender === gender && record.size === size)
      .reduce(
        (total, record) => total + ((record.added || 0) - (record.sent || 0)),
        0
      );
  };

  // Inline field editing functions
  const handleFieldEdit = (
    recordId: string,
    fieldName: string,
    currentValue: any
  ) => {
    setEditingRecord(recordId);
    setEditingField(fieldName);
    // Preserve raw text for numeric fields to allow intermediate '-' while typing
    if (fieldName === "quantity") {
      setEditValue(String(currentValue ?? ""));
    } else {
      setEditValue(currentValue);
    }
  };

  const handleFieldSave = async (
    recordId: string,
    fieldName: string,
    newValue: any
  ) => {
    // Handle quantity field editing
    if (fieldName === "quantity") {
      const numeric = Number(newValue);
      if (isNaN(numeric)) {
        toast.error("Value must be a number");
        return;
      }
      // Continue with normal field save for quantity
    }
    let originalRecord: BlazerRecord | undefined;

    try {
      console.log(
        "✏️ Attempting to update field:",
        fieldName,
        "for record:",
        recordId
      );

      originalRecord = records.find((r) => r.id === recordId);
      if (!originalRecord) {
        console.error("❌ Record not found:", recordId);
        toast.error("Record not found. Please refresh the page.");
        handleFieldCancel();
        return;
      }

      const oldValue = originalRecord[fieldName as keyof BlazerRecord];
      console.log("📝 Field update:", { fieldName, oldValue, newValue });

      // Prepare update data
      // Parse numeric strings safely (allow '-', '', etc.)
      let parsedValue: any = newValue;
      if (fieldName === "added" || fieldName === "sent") {
        if (typeof newValue === "string") {
          if (newValue.trim() === "" || newValue === "-") {
            // Do not save until a valid number; keep editing state
            setEditValue(newValue);
            return;
          }
          parsedValue = Number(newValue);
        }
      }

      const updatedData: any = { [fieldName]: parsedValue };

      // Handle special cases (gender and size are now non-editable)

      // Validate numeric fields
      if (fieldName === "quantity") {
        const numValue = Number(parsedValue);
        if (isNaN(numValue)) {
          toast.error(`quantity must be a number`);
          return;
        }
        updatedData[fieldName] = numValue;

        // Update added/sent based on quantity sign
        if (numValue > 0) {
          updatedData.added = numValue;
          updatedData.sent = 0;
        } else if (numValue < 0) {
          updatedData.added = 0;
          updatedData.sent = Math.abs(numValue);
        } else {
          updatedData.added = 0;
          updatedData.sent = 0;
        }
      } else if (fieldName === "added") {
        const numValue = Number(parsedValue);
        if (isNaN(numValue) || numValue < 0) {
          toast.error(`added must be a non-negative number`);
          return;
        }
        updatedData[fieldName] = numValue;

        // Update quantity and sent based on added value
        const currentSent = originalRecord.sent || 0;
        updatedData.quantity = numValue - currentSent;
        updatedData.sent = currentSent;
      } else if (fieldName === "sent") {
        const numValue = Number(parsedValue);
        if (isNaN(numValue) || numValue < 0) {
          toast.error(`sent must be a non-negative number`);
          return;
        }
        updatedData[fieldName] = numValue;

        // Update quantity and added based on sent value
        const currentAdded = originalRecord.added || 0;
        updatedData.quantity = currentAdded - numValue;
        updatedData.added = currentAdded;
      }

      console.log("📦 Sending update data:", updatedData);

      const { error, data } = await supabase
        .from("blazer_inventory")
        .update(updatedData)
        .eq("id", recordId)
        .select();

      if (error) {
        console.error("❌ Update error:", error);
        throw error;
      }

      console.log("✅ Update successful:", data);

      // Update local state
      setRecords((prev) =>
        prev.map((record) =>
          record.id === recordId ? { ...record, ...updatedData } : record
        )
      );

      // Also update filtered records to maintain search consistency
      setFilteredRecords((prev) =>
        prev.map((record) =>
          record.id === recordId ? { ...record, ...updatedData } : record
        )
      );

      // Log the activity
      await logSuccess(
        "blazer_inventory",
        "UPDATE",
        {
          field: fieldName,
          oldValue,
          newValue: updatedData[fieldName],
          recordId,
          updatedFields: Object.keys(updatedData),
        },
        recordId
      );

      setEditingRecord(null);
      setEditingField(null);
      onDataChange?.();

      toast.success("Field updated successfully");
    } catch (error) {
      console.error("❌ Error updating field:", error);
      toast.error("Failed to update field. Please try again.");
      // Revert the edit value on error
      if (originalRecord) {
        setEditValue(originalRecord[fieldName as keyof BlazerRecord] || "");
      }
    }
  };

  const handleFieldCancel = () => {
    setEditingRecord(null);
    setEditingField(null);
    setEditValue("");
  };

  const handleDelete = async (record: BlazerRecord) => {
    if (!confirm("Are you sure you want to delete this blazer record?")) return;

    try {
      console.log("🗑️ Attempting to delete blazer record:", record.id);
      console.log("📊 Record details:", record);

      // First, let's check if the record actually exists
      console.log("🔍 Checking if record exists before deletion...");
      const { data: checkData, error: checkError } = await supabase
        .from("blazer_inventory")
        .select("id, size, gender")
        .eq("id", record.id);

      console.log("🔍 Record check response:", { checkData, checkError });

      if (checkError) {
        console.error("❌ Error checking record existence:", checkError);
        throw checkError;
      }

      if (!checkData || checkData.length === 0) {
        console.error("❌ Record not found in database:", record.id);
        toast.error("Record not found. Please refresh the page.");
        return;
      }

      console.log("✅ Record found, proceeding with deletion...");

      // Use standard delete operation - the trigger function is now fixed
      console.log("🔄 Using standard delete operation...");

      const { error: deleteError } = await supabase
        .from("blazer_inventory")
        .delete()
        .eq("id", record.id);

      if (deleteError) {
        console.error("❌ Delete failed:", deleteError);
        throw deleteError;
      }

      console.log("✅ Delete successful");

      // Update local state immediately for better UX
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
      setFilteredRecords((prev) => prev.filter((r) => r.id !== record.id));

      await logSuccess(
        "blazer_inventory",
        "DELETE",
        {
          size: record.size,
          gender: record.gender,
          remarks: record.remarks,
          quantity: record.quantity,
          in_office_stock: record.in_office_stock,
        },
        record.id
      );

      toast.success("Blazer record deleted successfully");

      // Force refresh to ensure consistency
      await fetchRecords();
      onDataChange();
    } catch (error: any) {
      console.error("❌ Error deleting blazer record:", error);
      await logError("blazer_inventory", "DELETE", error, {
        size: record.size,
        gender: record.gender,
        remarks: record.remarks,
        quantity: record.quantity,
        in_office_stock: record.in_office_stock,
      });
      toast.error("Failed to delete blazer record");
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Gender",
      "Size",
      "Added",
      "Sent",
      "In Office Stock",
      "Remarks",
      "Created At",
    ];
    const csvData = filteredRecords.map((record) => [
      record.gender,
      record.size.replace("F-", "").replace("M-", ""),
      record.added || 0,
      record.sent || 0,
      getCurrentInOfficeStock(record.gender, record.size),
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
    a.download = `blazer-inventory-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success("CSV export completed");
  };

  const formatSize = (size: string) => {
    return size.replace("F-", "").replace("M-", "");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading blazer records...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>Blazer Records</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="blazer_search"
                name="blazer_search"
                placeholder="Search blazers..."
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
        <div className="text-sm text-muted-foreground">
          Click on any Added and Sent fields to edit • Click the checkmark to
          save or X to cancel
        </div>
      </CardHeader>
      <CardContent>
        {filteredRecords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm
              ? "No blazer records found matching your search."
              : "No blazer records found."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gender</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>In Office Stock</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    {/* Gender - Non-editable */}
                    <TableCell>
                      <Badge
                        variant={
                          record.gender === "Male" ? "default" : "secondary"
                        }
                      >
                        {record.gender}
                      </Badge>
                    </TableCell>
                    {/* Size - Non-editable */}
                    <TableCell className="font-medium">
                      {formatSize(record.size)}
                    </TableCell>
                    <TableCell>
                      {editingRecord === record.id &&
                      editingField === "added" ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-16"
                            min={0}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleFieldSave(record.id, "added", editValue)
                            }
                            className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleFieldCancel}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={() =>
                            handleFieldEdit(
                              record.id,
                              "added",
                              record.added || 0
                            )
                          }
                        >
                          {record.added || 0}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingRecord === record.id &&
                      editingField === "sent" ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-16"
                            min={0}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleFieldSave(record.id, "sent", editValue)
                            }
                            className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleFieldCancel}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={() =>
                            handleFieldEdit(record.id, "sent", record.sent || 0)
                          }
                        >
                          {record.sent || 0}
                        </span>
                      )}
                    </TableCell>
                    {/* In Office Stock - calculated field, non-editable */}
                    <TableCell>
                      <span className="font-semibold text-blue-600">
                        {getCurrentInOfficeStock(record.gender, record.size)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-48 truncate">
                      {editingRecord === record.id &&
                      editingField === "remarks" ? (
                        <div className="flex items-center gap-1">
                          <Textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleFieldSave(record.id, "remarks", editValue)
                            }
                            className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleFieldCancel}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={() =>
                            handleFieldEdit(
                              record.id,
                              "remarks",
                              record.remarks || ""
                            )
                          }
                        >
                          {record.remarks || "-"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(record.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(record)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
