import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Save, X, Trash2, Search, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BookInventoryRecord {
  id: string;
  kit_name: string;
  kit_type: string;
  ordered_from_printer: number;
  received: number;
  total_used_till_now: number;
  grade1: number;
  grade2: number;
  grade3: number;
  grade4: number;
  grade5: number;
  grade6: number;
  grade7: number;
  grade7iot: number;
  grade8: number;
  grade8iot: number;
  grade9: number;
  grade9iot: number;
  grade10: number;
  grade10iot: number;
  remarks: string;
  created_at: string;
  updated_at: string;
}

interface BookInventoryTableProps {
  onDataChange?: () => void;
}

export function BookInventoryTable({ onDataChange }: BookInventoryTableProps) {
  const [records, setRecords] = useState<BookInventoryRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<BookInventoryRecord[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from("book_inventory")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRecords(data || []);
    } catch (error) {
      console.error("Error fetching book inventory records:", error);
      toast.error("Failed to fetch book inventory records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Filter records based on search term
  useEffect(() => {
    const filtered = records.filter(
      (record) =>
        record.kit_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.kit_type?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredRecords(filtered);
  }, [searchTerm, records]);

  // Inline field editing functions
  const handleFieldEdit = (
    recordId: string,
    fieldName: string,
    currentValue: any
  ) => {
    setEditingRecord(recordId);
    setEditingField(fieldName);
    setEditValue(currentValue);
  };

  const handleFieldSave = async (
    recordId: string,
    fieldName: string,
    newValue: any
  ) => {
    try {
      console.log("✏️ Updating book inventory field:", {
        recordId,
        fieldName,
        newValue,
      });

      const { error } = await (supabase as any)
        .from("book_inventory")
        .update({ [fieldName]: newValue })
        .eq("id", recordId);

      if (error) throw error;

      // Update local state
      setRecords((prev) =>
        prev.map((record) =>
          record.id === recordId ? { ...record, [fieldName]: newValue } : record
        )
      );

      setEditingRecord(null);
      setEditingField(null);
      setEditValue("");

      toast.success("Book inventory record updated successfully");

      if (onDataChange) {
        onDataChange();
      }
    } catch (error) {
      console.error("Error updating book inventory record:", error);
      toast.error("Failed to update book inventory record");
    }
  };

  const handleFieldCancel = () => {
    setEditingRecord(null);
    setEditingField(null);
    setEditValue("");
  };

  const handleDelete = async (record: BookInventoryRecord) => {
    if (
      !confirm(
        `Are you sure you want to delete the book inventory record for "${record.kit_name}"?`
      )
    ) {
      return;
    }

    try {
      console.log("🗑️ Deleting book inventory record:", record.id);

      const { error } = await (supabase as any)
        .from("book_inventory")
        .delete()
        .eq("id", record.id);

      if (error) throw error;

      // Update local state
      setRecords((prev) => prev.filter((r) => r.id !== record.id));

      toast.success("Book inventory record deleted successfully");

      if (onDataChange) {
        onDataChange();
      }
    } catch (error) {
      console.error("Error deleting book inventory record:", error);
      toast.error("Failed to delete book inventory record");
    }
  };

  const renderEditableField = (
    record: BookInventoryRecord,
    fieldName: string,
    value: any,
    type: "text" | "number" | "select" | "textarea" = "text",
    options?: string[]
  ) => {
    const isEditing = editingRecord === record.id && editingField === fieldName;

    if (isEditing) {
      if (type === "select" && options) {
        return (
          <div className="flex items-center gap-2">
            <Select
              value={editValue}
              onValueChange={(value) => setEditValue(value)}
            >
              <SelectTrigger className="h-9 w-full min-w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFieldSave(record.id, fieldName, editValue)}
              className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFieldCancel}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      } else if (type === "textarea") {
        return (
          <div className="flex items-start gap-2">
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="min-h-[80px] w-full min-w-[200px]"
            />
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFieldSave(record.id, fieldName, editValue)}
                className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFieldCancel}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      } else {
        return (
          <div className="flex items-center gap-2">
            <Input
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className={`h-9 w-full min-w-[80px] ${
                type === "number" ? "pr-2" : ""
              }`}
              style={
                type === "number"
                  ? {
                      paddingRight: "8px",
                      WebkitAppearance: "none",
                      MozAppearance: "textfield",
                    }
                  : {}
              }
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFieldSave(record.id, fieldName, editValue)}
              className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFieldCancel}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }

    return (
      <span
        className="cursor-pointer hover:bg-muted/50 px-3 py-2 rounded min-h-[32px] flex items-center"
        onClick={() => handleFieldEdit(record.id, fieldName, value)}
      >
        {value || "-"}
      </span>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Book Inventory
          </CardTitle>
          <CardDescription>
            Manage book stock by kit type and grades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">
              Loading book inventory records...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Book Inventory
        </CardTitle>
        <CardDescription>
          Manage book stock by kit type and grades
        </CardDescription>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">
              No book inventory records found
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by kit name or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kit Name</TableHead>
                    <TableHead>Kit Type</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Used</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Grade 1</TableHead>
                    <TableHead>Grade 2</TableHead>
                    <TableHead>Grade 3</TableHead>
                    <TableHead>Grade 4</TableHead>
                    <TableHead>Grade 5</TableHead>
                    <TableHead>Grade 6</TableHead>
                    <TableHead>Grade 7</TableHead>
                    <TableHead>Grade 7 IoT</TableHead>
                    <TableHead>Grade 8</TableHead>
                    <TableHead>Grade 8 IoT</TableHead>
                    <TableHead>Grade 9</TableHead>
                    <TableHead>Grade 9 IoT</TableHead>
                    <TableHead>Grade 10</TableHead>
                    <TableHead>Grade 10 IoT</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => {
                    const available = record.received
                      ? record.received - (record.total_used_till_now || 0)
                      : "-";

                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {renderEditableField(
                            record,
                            "kit_name",
                            record.kit_name
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "kit_type",
                            record.kit_type,
                            "select",
                            ["Lab", "Individual", "Returnable"]
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "ordered_from_printer",
                            record.ordered_from_printer,
                            "number"
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "received",
                            record.received,
                            "number"
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "total_used_till_now",
                            record.total_used_till_now,
                            "number"
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {available}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "grade1",
                            record.grade1,
                            "number"
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "grade2",
                            record.grade2,
                            "number"
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "grade3",
                            record.grade3,
                            "number"
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "grade4",
                            record.grade4,
                            "number"
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "grade5",
                            record.grade5,
                            "number"
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "grade6",
                            record.grade6,
                            "number"
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "grade7",
                            record.grade7,
                            "number"
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "grade7iot",
                            record.grade7iot,
                            "number"
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "grade8",
                            record.grade8,
                            "number"
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "grade8iot",
                            record.grade8iot,
                            "number"
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "grade9",
                            record.grade9,
                            "number"
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "grade9iot",
                            record.grade9iot,
                            "number"
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "grade10",
                            record.grade10,
                            "number"
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "grade10iot",
                            record.grade10iot,
                            "number"
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "remarks",
                            record.remarks,
                            "textarea"
                          )}
                        </TableCell>
                        <TableCell>
                          {record.created_at
                            ? new Date(record.created_at).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(record)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
