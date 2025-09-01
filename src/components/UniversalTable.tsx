import React, { useState, useEffect, useCallback } from "react";
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
import { Trash2, Search, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { toast } from "sonner";
import { ModuleField } from "@/hooks/useModuleConfig";
import { InlineEditableField } from "@/components/InlineEditableField";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

interface UniversalTableProps {
  moduleName: string;
  tableName: string;
  fields: ModuleField[];
  onDataChange: () => void;
  selectedMonth?: string;
}

export function UniversalTable({
  moduleName,
  tableName,
  fields,
  onDataChange,
  selectedMonth,
}: UniversalTableProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const { logSuccess, logError } = useActivityLogger();

  const visibleFields = fields.filter(
    (field) => field.is_visible && field.field_name !== "user_id"
  );

  // Validation checks
  const isValidModule = Boolean(tableName && tableName.trim());
  const isValidFields = Boolean(fields && fields.length > 0);

  const fetchRecords = useCallback(async () => {
    if (!isValidModule || !isValidFields) return;

    try {
      console.log(
        `🔄 Fetching records for ${moduleName} from table: ${tableName}`
      );
      setLoading(true);

      let query = (supabase as any)
        .from(tableName as any)
        .select("*")
        .order("created_at", { ascending: false });

      // Add month filtering for daily expenses
      if (moduleName === "daily_expenses" && selectedMonth) {
        query = query.eq("month_year", selectedMonth);
        console.log(`🔍 Filtering daily expenses by month: ${selectedMonth}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`❌ Error fetching records for ${moduleName}:`, error);
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} records for ${moduleName}`);
      console.log(`📊 Sample record:`, data?.[0]);

      setRecords(data || []);
      setFilteredRecords(data || []);
    } catch (error) {
      console.error(`❌ Error fetching records for ${moduleName}:`, error);
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
    }
  }, [tableName, isValidModule, isValidFields, moduleName, selectedMonth]);

  // Real-time updates
  useEffect(() => {
    if (isValidModule && isValidFields) {
      fetchRecords();
    }
  }, [fetchRecords, isValidModule, isValidFields]);

  // Enable real-time refresh for the table
  useRealtimeRefresh({
    table: tableName,
    onRefresh: fetchRecords,
    enabled: isValidModule && isValidFields,
  });

  // Enhanced filtering logic to search across all visible searchable fields
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredRecords(records);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const searchableFields = visibleFields.filter(
      (field) => field.is_searchable
    );

    const filtered = records.filter((record) => {
      return searchableFields.some((field) => {
        const value = getFieldValue(record, field);
        return (
          value && value.toString().toLowerCase().includes(searchTermLower)
        );
      });
    });

    setFilteredRecords(filtered);
  }, [searchTerm, records, visibleFields]);

  // Inline field editing functions
  const handleFieldEdit = (recordId: string, fieldName: string) => {
    setEditingRecord(recordId);
    setEditingField(fieldName);
  };

  const handleFieldSave = async (
    recordId: string,
    fieldName: string,
    newValue: any
  ) => {
    try {
      console.log(
        `✏️ Attempting to update field: ${fieldName} for record: ${recordId}`
      );

      const originalRecord = records.find((r) => r.id === recordId);
      if (!originalRecord) {
        console.error("❌ Record not found:", recordId);
        toast.error("Record not found. Please refresh the page.");
        setEditingRecord(null);
        setEditingField(null);
        return;
      }

      const oldValue = originalRecord[fieldName];
      console.log("📝 Field update:", { fieldName, oldValue, newValue });

      // Auto-calculate computed fields for specific modules
      const updatedData: any = { [fieldName]: newValue };

      if (
        tableName === "kits_inventory" &&
        ["opening_balance", "addins", "takeouts"].includes(fieldName)
      ) {
        const record = records.find((r) => r.id === recordId);
        if (record) {
          const opening =
            fieldName === "opening_balance"
              ? newValue
              : record.opening_balance || 0;
          const addins = fieldName === "addins" ? newValue : record.addins || 0;
          const takeouts =
            fieldName === "takeouts" ? newValue : record.takeouts || 0;
          // Don't include closing_balance - it's computed automatically by the database
          // updatedData.closing_balance = opening + addins - takeouts;
        }
      } else if (
        tableName === "games_inventory" &&
        ["previous_stock", "adding", "sent"].includes(fieldName)
      ) {
        const record = records.find((r) => r.id === recordId);
        if (record) {
          const previous =
            fieldName === "previous_stock"
              ? newValue
              : record.previous_stock || 0;
          const adding = fieldName === "adding" ? newValue : record.adding || 0;
          const sent = fieldName === "sent" ? newValue : record.sent || 0;
          // Don't include in_stock - it's computed automatically by the database
          // updatedData.in_stock = previous + adding - sent;
        }
      } else if (
        tableName === "daily_expenses" &&
        ["expenses", "fixed_amount"].includes(fieldName)
      ) {
        const record = records.find((r) => r.id === recordId);
        if (record) {
          const expenses =
            fieldName === "expenses" ? newValue : record.expenses || 0;
          const fixedAmount =
            fieldName === "fixed_amount" ? newValue : record.fixed_amount || 0;
          // Don't include total - it's computed automatically by the database
          // updatedData.total = expenses + fixedAmount;
        }
      } else if (
        tableName === "books_distribution" &&
        fieldName.startsWith("grade")
      ) {
        const record = records.find((r) => r.id === recordId);
        if (record) {
          const gradeFields = [
            "grade1",
            "grade2",
            "grade3",
            "grade4",
            "grade5",
            "grade6",
            "grade7",
            "grade7iot",
            "grade8",
            "grade8iot",
            "grade9",
            "grade9iot",
            "grade10",
            "grade10iot",
          ];
          let total = 0;
          gradeFields.forEach((field) => {
            const value = field === fieldName ? newValue : record[field] || 0;
            total += parseInt(value) || 0;
          });
          // Don't include total_used_till_now - it's computed automatically by the database
          // updatedData.total_used_till_now = total;
        }
      }

      // Remove any computed columns from the update data
      if (tableName === "kits_inventory") {
        delete updatedData.closing_balance;
      } else if (tableName === "games_inventory") {
        delete updatedData.in_stock;
      } else if (tableName === "daily_expenses") {
        delete updatedData.total;
      } else if (tableName === "books_distribution") {
        delete updatedData.total_used_till_now;
      }

      console.log("📦 Sending update data:", updatedData);

      const { error, data } = await (supabase as any)
        .from(tableName as any)
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
        tableName,
        "UPDATE",
        {
          field: fieldName,
          oldValue,
          newValue,
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
    }
  };

  const handleFieldCancel = () => {
    setEditingRecord(null);
    setEditingField(null);
  };

  const handleDelete = async (record: any) => {
    if (!confirm(`Are you sure you want to delete this ${moduleName} record?`))
      return;

    try {
      console.log(`🗑️ Attempting to delete ${moduleName} record:`, record.id);

      // First, let's check if the record actually exists
      console.log(`🔍 Checking if record exists before deletion...`);
      const { data: checkData, error: checkError } = await (supabase as any)
        .from(tableName as any)
        .select("id")
        .eq("id", record.id);

      console.log(`🔍 Record check response:`, { checkData, checkError });

      if (checkError) {
        console.error(`❌ Error checking record existence:`, checkError);
        throw checkError;
      }

      if (!checkData || checkData.length === 0) {
        console.error(`❌ Record not found in database:`, record.id);
        throw new Error(`Record with ID ${record.id} not found in database`);
      }

      console.log(`✅ Record found, proceeding with deletion...`);

      // Guard: some legacy rows may have NULL month_year causing DB trigger errors on delete
      if (tableName === "daily_expenses") {
        try {
          let monthYear: string | null = record.month_year || null;
          if (!monthYear && record.date) {
            const d = new Date(record.date);
            if (!Number.isNaN(d.getTime())) {
              monthYear = d.toISOString().slice(0, 7);
            }
          }

          if (monthYear) {
            console.log("🛠️ Normalizing month_year before delete:", monthYear);
            await (supabase as any)
              .from(tableName as any)
              .update({ month_year: monthYear })
              .eq("id", record.id);
          } else {
            console.warn(
              "⚠️ Could not compute month_year for record before delete; proceeding anyway"
            );
          }
        } catch (normError) {
          console.warn(
            "⚠️ Failed to normalize month_year before delete:",
            normError
          );
        }
      }

      const { error } = await (supabase as any)
        .from(tableName as any)
        .delete()
        .eq("id", record.id);

      console.log(`🗑️ Delete response:`, { error });

      if (error) {
        console.error(`❌ Delete error for ${moduleName}:`, error);
        console.error(`❌ Error details:`, {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      console.log(`✅ Delete successful for ${moduleName}`);

      const recordData: Record<string, any> = {};
      visibleFields.forEach((field) => {
        recordData[field.field_name] = record[field.field_name];
      });

      await logSuccess(moduleName, "DELETE", recordData, record.id);

      toast.success(`${moduleName} record deleted successfully`);

      console.log(`🔄 Updating local state for ${moduleName}...`);
      console.log(`📊 Records before deletion:`, records.length);

      // Update local state immediately for better UX
      setRecords((prev) => {
        const newRecords = prev.filter((r) => r.id !== record.id);
        console.log(`📊 Records after deletion:`, newRecords.length);
        return newRecords;
      });

      setFilteredRecords((prev) => {
        const newFiltered = prev.filter((r) => r.id !== record.id);
        console.log(`📊 Filtered records after deletion:`, newFiltered.length);
        return newFiltered;
      });

      console.log(`🔄 Fetching fresh data for ${moduleName}...`);
      // Also fetch fresh data to ensure consistency
      try {
        await fetchRecords();
        console.log(`✅ Fresh data fetched successfully`);
      } catch (fetchError) {
        console.error(`❌ Error fetching fresh data:`, fetchError);
      }

      onDataChange();
    } catch (error: any) {
      console.error(`❌ Error deleting ${moduleName} record:`, error);
      await logError(tableName, "DELETE", error, record);
      toast.error(`Failed to delete ${moduleName} record`);
    }
  };

  const exportToCSV = () => {
    const headers = visibleFields.map((field) => field.display_name);
    const csvData = filteredRecords.map((record) =>
      visibleFields.map((field) => {
        let value = getFieldValue(record, field);

        // Format specific field types for CSV
        if (field.field_type === "date" && value) {
          value = new Date(value).toLocaleDateString();
        }

        return value || "";
      })
    );

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${moduleName}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success("CSV export completed");
  };

  const getFieldValue = (record: any, field: ModuleField) => {
    const value = record[field.field_name];

    if (field.field_type === "date" && value) {
      return new Date(value).toLocaleDateString();
    } else if (field.field_name === "size" && value) {
      return value.replace("F-", "").replace("M-", "");
    } else if (
      field.field_type === "decimal" ||
      field.field_type === "number"
    ) {
      if (
        field.field_name.includes("expense") ||
        field.field_name.includes("amount") ||
        field.field_name.includes("total")
      ) {
        return `₹${Number(value || 0).toFixed(2)}`;
      }
      return value || 0;
    }

    return value;
  };

  const renderCellContent = (record: any, field: ModuleField) => {
    const isEditing =
      editingRecord === record.id && editingField === field.field_name;

    return (
      <InlineEditableField
        field={field}
        value={record[field.field_name]}
        record={record}
        onSave={(newValue) =>
          handleFieldSave(record.id, field.field_name, newValue)
        }
        isEditing={isEditing}
        onStartEdit={() => handleFieldEdit(record.id, field.field_name)}
        onCancelEdit={handleFieldCancel}
      />
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading records...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>{moduleName} Records</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search across all fields..."
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
              Export CSV ({filteredRecords.length})
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filteredRecords.length} of {records.length} records • Click
          any field to edit inline
        </div>
      </CardHeader>
      <CardContent>
        {filteredRecords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm
              ? `No ${moduleName.toLowerCase()} records found matching your search.`
              : `No ${moduleName.toLowerCase()} records found.`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleFields.map((field) => (
                    <TableHead key={field.id}>{field.display_name}</TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id} className="hover:bg-muted/50">
                    {visibleFields.map((field) => (
                      <TableCell
                        key={field.id}
                        className={`relative ${
                          field.field_type === "textarea"
                            ? "max-w-48 truncate"
                            : ""
                        }`}
                      >
                        {renderCellContent(record, field)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(record)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
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
