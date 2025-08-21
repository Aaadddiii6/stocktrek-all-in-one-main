import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, X, Edit3 } from "lucide-react";
import { DynamicField } from "./DynamicField";
import { ModuleField } from "@/hooks/useModuleConfig";

interface InlineEditableFieldProps {
  field: ModuleField;
  value: any;
  record: any;
  onSave: (newValue: any) => Promise<void>;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}

export function InlineEditableField({
  field,
  value,
  record,
  onSave,
  isEditing,
  onStartEdit,
  onCancelEdit,
}: InlineEditableFieldProps) {
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditValue(value);
  }, [value, isEditing]);

  const handleSave = async () => {
    if (editValue === value) {
      onCancelEdit();
      return;
    }

    setSaving(true);
    try {
      await onSave(editValue);
    } catch (error) {
      console.error("Error saving field:", error);
      setEditValue(value); // Revert on error
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    onCancelEdit();
  };

  const formatDisplayValue = (value: any) => {
    if (value == null) return "-";

    if (field.field_type === "date" && value) {
      return new Date(value).toLocaleDateString();
    }

    if (field.field_type === "boolean") {
      return value ? "Yes" : "No";
    }

    // Special formatting for certain fields
    if (field.field_name === "gender") {
      return (
        <Badge variant={value === "Male" ? "default" : "secondary"}>
          {value}
        </Badge>
      );
    }

    if (field.field_name === "status") {
      const statusColors: Record<
        string,
        "default" | "destructive" | "outline" | "secondary"
      > = {
        Dispatched: "default",
        Delivered: "default",
        "In Transit": "secondary",
        Delayed: "outline",
        Failed: "destructive",
      };
      return <Badge variant={statusColors[value] || "outline"}>{value}</Badge>;
    }

    // Blazer size display: strip gender prefix when showing
    if (field.field_name === "size" && typeof value === "string") {
      return value.replace("F-", "").replace("M-", "");
    }

    // Currency-like display for expense/amount/total numbers (display only)
    if (
      (field.field_type === "number" || field.field_type === "decimal") &&
      typeof value === "number"
    ) {
      const name = field.field_name.toLowerCase();
      if (
        name.includes("expense") ||
        name.includes("amount") ||
        name.includes("total")
      ) {
        return `₹${Number(value || 0).toFixed(2)}`;
      }
    }

    return value.toString();
  };

  if (!field.is_editable) {
    return <span className="text-foreground">{formatDisplayValue(value)}</span>;
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2 group">
        <span className="text-foreground">{formatDisplayValue(value)}</span>
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
          onClick={onStartEdit}
        >
          <Edit3 className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-[200px]">
      <div className="flex-1">
        <DynamicField
          field={field}
          value={editValue}
          onChange={setEditValue}
          dependentValues={record}
        />
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
          onClick={handleSave}
          disabled={saving}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
          onClick={handleCancel}
          disabled={saving}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
