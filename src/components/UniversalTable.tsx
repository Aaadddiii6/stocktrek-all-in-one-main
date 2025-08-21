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
}

export function UniversalTable({
  moduleName,
  tableName,
  fields,
  onDataChange,
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
      setLoading(true);
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRecords(data || []);
      setFilteredRecords(data || []);
    } catch (error) {
      console.error("Error fetching records:", error);
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
    }
  }, [tableName, isValidModule, isValidFields]);

  // Real-time updates
  useEffect(() => {
    if (isValidModule && isValidFields) {
      fetchRecords();
    }
  }, [fetchRecords, isValidModule, isValidFields]);

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
      const originalRecord = records.find((r) => r.id === recordId);
      const oldValue = originalRecord?.[fieldName];

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
          updatedData.closing_balance = opening + addins - takeouts;
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
          updatedData.in_stock = previous + adding - sent;
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
          updatedData.total_used_till_now = total;
        }
      }

      const { error } = await (supabase as any)
        .from(tableName)
        .update(updatedData)
        .eq("id", recordId);

      if (error) throw error;

      // Update local state
      setRecords((prev) =>
        prev.map((record) =>
          record.id === recordId ? { ...record, ...updatedData } : record
        )
      );

      // Log the activity
      await logSuccess(
        moduleName,
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
      console.error("Error updating field:", error);
      toast.error("Failed to update field");
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
      const { error } = await (supabase as any)
        .from(tableName)
        .delete()
        .eq("id", record.id);

      if (error) throw error;

      const recordData: Record<string, any> = {};
      visibleFields.forEach((field) => {
        recordData[field.field_name] = record[field.field_name];
      });

      await logSuccess(moduleName, "DELETE", recordData, record.id);

      toast.success(`${moduleName} record deleted successfully`);
      fetchRecords();
      onDataChange();
    } catch (error: any) {
      console.error(`Error deleting ${moduleName} record:`, error);
      await logError(moduleName, "DELETE", error, record);
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
