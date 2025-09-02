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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Save, X, Trash2, Search, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BookDistributionRecord {
  id: string;
  school_name: string;
  coordinator_name: string;
  coordinator_number: string;
  address: string;
  kit_name: string;
  kit_type: string;
  delivery_date: string;
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
  total_used_till_now: number;
  additional: string;
  created_at: string;
  updated_at: string;
}

interface BookDistributionTableProps {
  onDataChange?: () => void;
}

export function BookDistributionTable({
  onDataChange,
}: BookDistributionTableProps) {
  const [records, setRecords] = useState<BookDistributionRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<
    BookDistributionRecord[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>("");
  const [isLoading, setIsLoading] = useState(true);
  const [schools, setSchools] = useState<any[]>([]);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [kitNames, setKitNames] = useState<string[]>([]);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from("books_distribution")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRecords(data || []);
    } catch (error) {
      console.error("Error fetching book distribution records:", error);
      toast.error("Failed to fetch book distribution records");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("schools")
        .select("*")
        .order("school_name");

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error("Error fetching schools:", error);
    }
  };

  const fetchCoordinators = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("coordinators")
        .select("*")
        .order("coordinator_name");

      if (error) throw error;
      setCoordinators(data || []);
    } catch (error) {
      console.error("Error fetching coordinators:", error);
    }
  };

  const fetchKitNames = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("book_inventory")
        .select("kit_name")
        .not("kit_name", "is", null);

      if (error) throw error;
      setKitNames(data?.map((item: any) => item.kit_name) || []);
    } catch (error) {
      console.error("Error fetching kit names:", error);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchSchools();
    fetchCoordinators();
    fetchKitNames();
  }, []);

  // Filter records based on search term
  useEffect(() => {
    const filtered = records.filter(
      (record) =>
        record.school_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.coordinator_name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        record.kit_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
      console.log("✏️ Updating book distribution field:", {
        recordId,
        fieldName,
        newValue,
      });

      const record = records.find((r) => r.id === recordId);
      if (!record) {
        throw new Error("Record not found");
      }

      // If updating grade fields, recalculate total_used_till_now
      let updateData: any = { [fieldName]: newValue };

      if (fieldName.startsWith("grade")) {
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

        let totalDistributed = 0;
        gradeFields.forEach((grade) => {
          const value =
            grade === fieldName
              ? newValue
              : record[grade as keyof BookDistributionRecord] || 0;
          totalDistributed += Number(value) || 0;
        });

        updateData.total_used_till_now = totalDistributed;
      }

      const { error } = await (supabase as any)
        .from("books_distribution")
        .update(updateData)
        .eq("id", recordId);

      if (error) throw error;

      // Update local state
      setRecords((prev) =>
        prev.map((record) =>
          record.id === recordId ? { ...record, ...updateData } : record
        )
      );

      // If grade fields were updated, also update book inventory
      if (fieldName.startsWith("grade") && record.kit_name) {
        console.log("🔄 Updating book inventory due to grade changes...");

        // Get current book inventory data
        const { data: currentInventory, error: fetchError } = await (
          supabase as any
        )
          .from("book_inventory")
          .select("*")
          .eq("kit_name", record.kit_name)
          .single();

        if (!fetchError && currentInventory) {
          // Calculate new grade-wise stock
          const gradeUpdates: any = {};
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

          // Get all distribution records for this kit to calculate total distributed per grade
          const { data: allDistributions } = await (supabase as any)
            .from("books_distribution")
            .select("*")
            .eq("kit_name", record.kit_name);

          if (allDistributions) {
            gradeFields.forEach((grade) => {
              const totalDistributedForGrade = allDistributions.reduce(
                (sum: number, dist: any) => {
                  return sum + (Number(dist[grade]) || 0);
                },
                0
              );

              const originalStock = Number(currentInventory[grade]) || 0;
              const newStock = originalStock - totalDistributedForGrade;
              gradeUpdates[grade] = newStock;
            });

            // Update total_used_till_now
            const totalUsed = allDistributions.reduce(
              (sum: number, dist: any) => {
                return sum + (Number(dist.total_used_till_now) || 0);
              },
              0
            );
            gradeUpdates.total_used_till_now = totalUsed;

            // Update book inventory
            const { error: updateError } = await (supabase as any)
              .from("book_inventory")
              .update(gradeUpdates)
              .eq("kit_name", record.kit_name);

            if (updateError) {
              console.error("❌ Error updating book inventory:", updateError);
            } else {
              console.log("✅ Book inventory updated successfully");
            }
          }
        }
      }

      setEditingRecord(null);
      setEditingField(null);
      setEditValue("");

      toast.success("Book distribution record updated successfully");

      if (onDataChange) {
        onDataChange();
      }
    } catch (error) {
      console.error("Error updating book distribution record:", error);
      toast.error("Failed to update book distribution record");
    }
  };

  const handleFieldCancel = () => {
    setEditingRecord(null);
    setEditingField(null);
    setEditValue("");
  };

  const handleDelete = async (record: BookDistributionRecord) => {
    if (
      !confirm(
        `Are you sure you want to delete the distribution record for "${record.school_name}"?`
      )
    ) {
      return;
    }

    try {
      console.log("🗑️ Deleting book distribution record:", record.id);

      const { error } = await (supabase as any)
        .from("books_distribution")
        .delete()
        .eq("id", record.id);

      if (error) throw error;

      // Update local state
      setRecords((prev) => prev.filter((r) => r.id !== record.id));

      // Update book inventory after deletion
      if (record.kit_name) {
        console.log("🔄 Updating book inventory after deletion...");

        // Get current book inventory data
        const { data: currentInventory, error: fetchError } = await (
          supabase as any
        )
          .from("book_inventory")
          .select("*")
          .eq("kit_name", record.kit_name)
          .single();

        if (!fetchError && currentInventory) {
          // Calculate new grade-wise stock
          const gradeUpdates: any = {};
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

          // Get all remaining distribution records for this kit
          const { data: remainingDistributions } = await (supabase as any)
            .from("books_distribution")
            .select("*")
            .eq("kit_name", record.kit_name);

          if (remainingDistributions) {
            gradeFields.forEach((grade) => {
              const totalDistributedForGrade = remainingDistributions.reduce(
                (sum: number, dist: any) => {
                  return sum + (Number(dist[grade]) || 0);
                },
                0
              );

              const originalStock = Number(currentInventory[grade]) || 0;
              const newStock = originalStock - totalDistributedForGrade;
              gradeUpdates[grade] = newStock;
            });

            // Update total_used_till_now
            const totalUsed = remainingDistributions.reduce(
              (sum: number, dist: any) => {
                return sum + (Number(dist.total_used_till_now) || 0);
              },
              0
            );
            gradeUpdates.total_used_till_now = totalUsed;

            // Update book inventory
            const { error: updateError } = await (supabase as any)
              .from("book_inventory")
              .update(gradeUpdates)
              .eq("kit_name", record.kit_name);

            if (updateError) {
              console.error(
                "❌ Error updating book inventory after deletion:",
                updateError
              );
            } else {
              console.log("✅ Book inventory updated after deletion");
            }
          }
        }
      }

      toast.success("Book distribution record deleted successfully");

      if (onDataChange) {
        onDataChange();
      }
    } catch (error) {
      console.error("Error deleting book distribution record:", error);
      toast.error("Failed to delete book distribution record");
    }
  };

  const renderEditableField = (
    record: BookDistributionRecord,
    fieldName: string,
    value: any,
    type: "text" | "number" | "select" | "textarea" | "date" = "text",
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
            <BookOpen className="h-5 w-5" />
            Book Distribution
          </CardTitle>
          <CardDescription>Track book distribution to schools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">
              Loading book distribution records...
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
          <BookOpen className="h-5 w-5" />
          Book Distribution
        </CardTitle>
        <CardDescription>Track book distribution to schools</CardDescription>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">
              No book distribution records found
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by school, coordinator, or kit..."
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
                    <TableHead>School Name</TableHead>
                    <TableHead>Coordinator</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Kit Name</TableHead>
                    <TableHead>Kit Type</TableHead>
                    <TableHead>Delivery Date</TableHead>
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
                    <TableHead>Total</TableHead>
                    <TableHead>Additional</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => {
                    const totalBooks =
                      (record.grade1 || 0) +
                      (record.grade2 || 0) +
                      (record.grade3 || 0) +
                      (record.grade4 || 0) +
                      (record.grade5 || 0) +
                      (record.grade6 || 0) +
                      (record.grade7 || 0) +
                      (record.grade7iot || 0) +
                      (record.grade8 || 0) +
                      (record.grade8iot || 0) +
                      (record.grade9 || 0) +
                      (record.grade9iot || 0) +
                      (record.grade10 || 0) +
                      (record.grade10iot || 0);

                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {renderEditableField(
                            record,
                            "school_name",
                            record.school_name,
                            "select",
                            schools.map((s) => s.school_name)
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "coordinator_name",
                            record.coordinator_name,
                            "select",
                            coordinators.map((c) => c.coordinator_name)
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "coordinator_number",
                            record.coordinator_number
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "address",
                            record.address,
                            "textarea"
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "kit_name",
                            record.kit_name,
                            "select",
                            kitNames
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
                            "delivery_date",
                            record.delivery_date,
                            "date"
                          )}
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
                        <TableCell className="font-medium text-blue-600">
                          {totalBooks}
                        </TableCell>
                        <TableCell>
                          {renderEditableField(
                            record,
                            "additional",
                            record.additional,
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
