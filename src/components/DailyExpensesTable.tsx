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

interface ExpenseRecord {
  id: string;
  sr_no: number;
  date: string;
  fixed_amount: number;
  expenses: number;
  total: number | null;
  remarks: string;
  created_at: string;
  user_id: string;
}

interface DailyExpensesTableProps {
  onDataChange: () => void;
  selectedMonth?: string;
}

export function DailyExpensesTable({
  onDataChange,
  selectedMonth,
}: DailyExpensesTableProps) {
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ExpenseRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ExpenseRecord>>({});
  const { logSuccess, logError } = useActivityLogger();

  const fetchRecords = async () => {
    try {
      let query = supabase
        .from("daily_expenses")
        .select("*")
        .order("created_at", { ascending: false });

      // Filter by selected month if provided
      if (selectedMonth) {
        query = query.eq("month_year", selectedMonth);
      }

      const { data, error } = await query;

      if (error) throw error;

      setRecords((data as unknown as ExpenseRecord[]) || []);
      setFilteredRecords((data as unknown as ExpenseRecord[]) || []);
    } catch (error) {
      console.error("Error fetching expense records:", error);
      toast.error("Failed to load expense records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [selectedMonth]);

  useEffect(() => {
    const filtered = records.filter(
      (record) =>
        record.date.includes(searchTerm) ||
        record.remarks.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.sr_no.toString().includes(searchTerm) ||
        record.fixed_amount.toString().includes(searchTerm) ||
        record.expenses.toString().includes(searchTerm) ||
        (record.total?.toString() || "").includes(searchTerm)
    );
    setFilteredRecords(filtered);
  }, [searchTerm, records]);

  const handleEdit = (record: ExpenseRecord) => {
    setEditingRecord(record.id);
    setEditForm({
      fixed_amount: record.fixed_amount,
      expenses: record.expenses,
      remarks: record.remarks,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;

    const originalRecord = records.find((r) => r.id === editingRecord);
    if (!originalRecord) return;

    try {
      const updatedData = {
        ...editForm,
        total: (editForm.fixed_amount || 0) + (editForm.expenses || 0),
      };

      const { error } = await supabase
        .from("daily_expenses")
        .update(updatedData)
        .eq("id", editingRecord);

      if (error) throw error;

      // Log the changes
      const changes = Object.keys(editForm).reduce((acc: any, key) => {
        const oldValue = originalRecord[key as keyof ExpenseRecord];
        const newValue = editForm[key as keyof ExpenseRecord];
        if (oldValue !== newValue) {
          acc[key] = { old: oldValue, new: newValue };
        }
        return acc;
      }, {});

      await logSuccess(
        "daily_expenses",
        "UPDATE",
        {
          date: originalRecord.date,
          changes,
          summary: `Updated expense record for ${originalRecord.date}`,
        },
        editingRecord
      );

      toast.success("Expense record updated successfully");
      fetchRecords();
      onDataChange();
      setEditingRecord(null);
      setEditForm({});
    } catch (error: any) {
      console.error("Error updating expense record:", error);
      await logError("daily_expenses", "UPDATE", error, editForm);
      toast.error("Failed to update expense record");
    }
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
    setEditForm({});
  };

  const handleDelete = async (record: ExpenseRecord) => {
    if (!confirm("Are you sure you want to delete this expense record?"))
      return;

    try {
      const { error } = await supabase
        .from("daily_expenses")
        .delete()
        .eq("id", record.id);

      if (error) throw error;

      await logSuccess(
        "daily_expenses",
        "DELETE",
        {
          date: record.date,
          fixed_amount: record.fixed_amount,
          expenses: record.expenses,
          remarks: record.remarks,
        },
        record.id
      );

      toast.success("Expense record deleted successfully");
      fetchRecords();
      onDataChange();
    } catch (error: any) {
      console.error("Error deleting expense record:", error);
      await logError("daily_expenses", "DELETE", error, record);
      toast.error("Failed to delete expense record");
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Sr No",
      "Date",
      "Fixed Amount",
      "Expenses",
      "Total",
      "Remarks",
      "Created At",
    ];
    const csvData = filteredRecords.map((record) => [
      record.sr_no,
      record.date,
      record.fixed_amount,
      record.expenses,
      record.total || record.fixed_amount + record.expenses,
      record.remarks,
      new Date(record.created_at).toLocaleDateString(),
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-expenses-${new Date().toISOString().split("T")[0]}.csv`;
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
          <div className="text-center">Loading expense records...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Expense Records</CardTitle>
            {selectedMonth && (
              <p className="text-sm text-muted-foreground mt-1">
                Showing records for{" "}
                {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="expenses_search"
                name="expenses_search"
                placeholder="Search expenses..."
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
              ? "No expense records found matching your search."
              : "No expense records found."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sr No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Fixed Amount</TableHead>
                  <TableHead>Expenses</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono">{record.sr_no}</TableCell>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>
                      {editingRecord === record.id ? (
                        <Input
                          id={`fixed_amount_${record.id}`}
                          name={`fixed_amount_${record.id}`}
                          type="number"
                          step="0.01"
                          value={editForm.fixed_amount || 0}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              fixed_amount: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-24"
                        />
                      ) : (
                        `₹${record.fixed_amount.toFixed(2)}`
                      )}
                    </TableCell>
                    <TableCell>
                      {editingRecord === record.id ? (
                        <Input
                          id={`expenses_${record.id}`}
                          name={`expenses_${record.id}`}
                          type="number"
                          step="0.01"
                          value={editForm.expenses || 0}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              expenses: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-24"
                        />
                      ) : (
                        <Badge variant="destructive">
                          ₹{record.expenses.toFixed(2)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          editingRecord === record.id
                            ? (editForm.fixed_amount || 0) +
                                (editForm.expenses || 0) >=
                              0
                              ? "secondary"
                              : "destructive"
                            : (record.total ||
                                record.fixed_amount + record.expenses) >= 0
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        ₹
                        {editingRecord === record.id
                          ? (
                              (editForm.fixed_amount || 0) +
                              (editForm.expenses || 0)
                            ).toFixed(2)
                          : (
                              record.total ||
                              record.fixed_amount + record.expenses
                            ).toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-48 truncate">
                      {editingRecord === record.id ? (
                        <Input
                          id={`remarks_${record.id}`}
                          name={`remarks_${record.id}`}
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
