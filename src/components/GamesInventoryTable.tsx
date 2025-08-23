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

interface GameRecord {
  id: string;
  sr_no: number;
  game_details: string;
  previous_stock: number;
  adding: number;
  sent: number;
  in_stock: number | null;
  sent_by: string | null;
  created_at: string;
  user_id: string;
}

interface GamesInventoryTableProps {
  onDataChange: () => void;
}

export function GamesInventoryTable({
  onDataChange,
}: GamesInventoryTableProps) {
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<GameRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<GameRecord>>({});
  const { logSuccess, logError } = useActivityLogger();

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from("games_inventory")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRecords((data as unknown as GameRecord[]) || []);
      setFilteredRecords((data as unknown as GameRecord[]) || []);
    } catch (error) {
      console.error("Error fetching game records:", error);
      toast.error("Failed to load game records");
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
        record.game_details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.sent_by?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.sr_no.toString().includes(searchTerm) ||
        record.previous_stock.toString().includes(searchTerm) ||
        record.adding.toString().includes(searchTerm) ||
        record.sent.toString().includes(searchTerm) ||
        (record.in_stock?.toString() || "").includes(searchTerm)
    );
    setFilteredRecords(filtered);
  }, [searchTerm, records]);

  const handleEdit = (record: GameRecord) => {
    setEditingRecord(record.id);
    setEditForm({
      game_details: record.game_details,
      previous_stock: record.previous_stock,
      adding: record.adding,
      sent: record.sent,
      sent_by: record.sent_by || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;

    const originalRecord = records.find((r) => r.id === editingRecord);
    if (!originalRecord) return;

    try {
      const updatedData = {
        ...editForm,
        in_stock:
          (editForm.previous_stock || 0) +
          (editForm.adding || 0) -
          (editForm.sent || 0),
      };

      const { error } = await supabase
        .from("games_inventory")
        .update(updatedData)
        .eq("id", editingRecord);

      if (error) throw error;

      // Log the changes
      const changes = Object.keys(editForm).reduce((acc: any, key) => {
        const oldValue = originalRecord[key as keyof GameRecord];
        const newValue = editForm[key as keyof GameRecord];
        if (oldValue !== newValue) {
          acc[key] = { old: oldValue, new: newValue };
        }
        return acc;
      }, {});

      await logSuccess(
        "games_inventory",
        "UPDATE",
        {
          game_details: editForm.game_details,
          changes,
          summary: `Updated ${editForm.game_details} inventory`,
        },
        editingRecord
      );

      toast.success("Game record updated successfully");
      fetchRecords();
      onDataChange();
      setEditingRecord(null);
      setEditForm({});
    } catch (error: any) {
      console.error("Error updating game record:", error);
      await logError("games_inventory", "UPDATE", error, editForm);
      toast.error("Failed to update game record");
    }
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
    setEditForm({});
  };

  const handleDelete = async (record: GameRecord) => {
    if (!confirm("Are you sure you want to delete this game record?")) return;

    try {
      const { error } = await supabase
        .from("games_inventory")
        .delete()
        .eq("id", record.id);

      if (error) throw error;

      await logSuccess(
        "games_inventory",
        "DELETE",
        {
          game_details: record.game_details,
          previous_stock: record.previous_stock,
          adding: record.adding,
          sent: record.sent,
        },
        record.id
      );

      toast.success("Game record deleted successfully");
      fetchRecords();
      onDataChange();
    } catch (error: any) {
      console.error("Error deleting game record:", error);
      await logError("games_inventory", "DELETE", error, record);
      toast.error("Failed to delete game record");
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Sr No",
      "Game Details",
      "Previous Stock",
      "Adding",
      "Sent",
      "In Stock",
      "Sent By",
      "Created At",
    ];
    const csvData = filteredRecords.map((record) => [
      record.sr_no,
      record.game_details,
      record.previous_stock,
      record.adding,
      record.sent,
      record.in_stock || record.previous_stock + record.adding - record.sent,
      record.sent_by || "",
      new Date(record.created_at).toLocaleDateString(),
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `games-inventory-${
      new Date().toISOString().split("T")[0]
    }.csv`;
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
          <div className="text-center">Loading game records...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>Game Records</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="games_search"
                name="games_search"
                placeholder="Search games..."
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
              ? "No game records found matching your search."
              : "No game records found."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sr No</TableHead>
                  <TableHead>Game Details</TableHead>
                  <TableHead>Previous Stock</TableHead>
                  <TableHead>Adding</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>In Stock</TableHead>
                  <TableHead>Sent By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono">{record.sr_no}</TableCell>
                    <TableCell>
                      {editingRecord === record.id ? (
                        <Input
                          id={`game_details_${record.id}`}
                          name={`game_details_${record.id}`}
                          value={editForm.game_details || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              game_details: e.target.value,
                            })
                          }
                          className="w-full"
                        />
                      ) : (
                        <span className="font-medium">
                          {record.game_details}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingRecord === record.id ? (
                        <Input
                          id={`previous_stock_${record.id}`}
                          name={`previous_stock_${record.id}`}
                          type="number"
                          value={editForm.previous_stock || 0}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              previous_stock: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-20"
                        />
                      ) : (
                        record.previous_stock
                      )}
                    </TableCell>
                    <TableCell>
                      {editingRecord === record.id ? (
                        <Input
                          id={`adding_${record.id}`}
                          name={`adding_${record.id}`}
                          type="number"
                          value={editForm.adding || 0}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              adding: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-20"
                        />
                      ) : (
                        <Badge variant="secondary">+{record.adding}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingRecord === record.id ? (
                        <Input
                          id={`sent_${record.id}`}
                          name={`sent_${record.id}`}
                          type="number"
                          value={editForm.sent || 0}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              sent: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-20"
                        />
                      ) : (
                        <Badge variant="destructive">-{record.sent}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {editingRecord === record.id
                          ? (editForm.previous_stock || 0) +
                            (editForm.adding || 0) -
                            (editForm.sent || 0)
                          : record.in_stock ||
                            record.previous_stock + record.adding - record.sent}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {editingRecord === record.id ? (
                        <Input
                          id={`sent_by_${record.id}`}
                          name={`sent_by_${record.id}`}
                          value={editForm.sent_by || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              sent_by: e.target.value,
                            })
                          }
                          className="w-full"
                          placeholder="Sent by"
                        />
                      ) : (
                        record.sent_by || "-"
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
