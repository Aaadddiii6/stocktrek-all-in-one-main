import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DynamicField } from "./DynamicField";
import { ModuleField } from "@/hooks/useModuleConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useAutoCarryStock } from "@/hooks/useAutoCarryStock";
import { toast } from "sonner";

interface DynamicFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  moduleName: string;
  tableName: string;
  fields: ModuleField[];
  editingRecord?: any;
  title?: string;
  description?: string;
}

export function DynamicForm({
  open,
  onOpenChange,
  onSuccess,
  moduleName,
  tableName,
  fields,
  editingRecord,
  title,
  description,
}: DynamicFormProps) {
  const { user } = useAuth();
  const { logSuccess, logError } = useActivityLogger();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-carry stock functionality
  const { autoCarryValues, shouldAutoCarry, getAutoCarryValue } =
    useAutoCarryStock(tableName, formData);

  // Initialize form data when fields change or editing record changes
  useEffect(() => {
    const initialData: Record<string, any> = {};

    fields.forEach((field) => {
      if (editingRecord && editingRecord[field.field_name] !== undefined) {
        initialData[field.field_name] = editingRecord[field.field_name];
      } else if (
        field.default_value !== undefined &&
        field.default_value !== null
      ) {
        // Parse default value based on field type
        switch (field.field_type) {
          case "number":
          case "decimal":
            initialData[field.field_name] =
              parseFloat(field.default_value) || 0;
            break;
          case "boolean":
            initialData[field.field_name] = field.default_value === "true";
            break;
          default:
            initialData[field.field_name] = field.default_value;
        }
      } else {
        // Set appropriate default values based on field type
        switch (field.field_type) {
          case "number":
          case "decimal":
            initialData[field.field_name] = 0;
            break;
          case "boolean":
            initialData[field.field_name] = false;
            break;
          default:
            initialData[field.field_name] = "";
        }
      }
    });

    setFormData(initialData);
    setErrors({});
  }, [fields, editingRecord]);

  // Apply auto-carry values only to empty fields (do not override user input)
  useEffect(() => {
    if (editingRecord) return;
    if (!fields || fields.length === 0) return;

    setFormData((prev) => {
      const updated = { ...prev };
      fields.forEach((field) => {
        if (shouldAutoCarry(field.field_name)) {
          const carryVal = getAutoCarryValue(field.field_name);
          const current = prev[field.field_name];
          if (
            (current === "" || current === undefined || current === null) &&
            carryVal !== undefined
          ) {
            updated[field.field_name] = carryVal;
          }
        }
      });
      return updated;
    });
  }, [
    autoCarryValues,
    fields,
    editingRecord,
    shouldAutoCarry,
    getAutoCarryValue,
  ]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        [fieldName]: value,
      };

      // Auto-calculate computed fields
      if (moduleName === "kits_inventory") {
        const opening = updated.opening_balance || 0;
        const addins = updated.addins || 0;
        const takeouts = updated.takeouts || 0;
        updated.closing_balance = opening + addins - takeouts;
      } else if (moduleName === "games_inventory") {
        const previous = updated.previous_stock || 0;
        const adding = updated.adding || 0;
        const sent = updated.sent || 0;
        updated.in_stock = previous + adding - sent;
      } else if (moduleName === "daily_expenses") {
        const fixed = updated.fixed_amount || 0;
        const expenses = updated.expenses || 0;
        updated.total = fixed + expenses; // display-only; DB will compute stored total
      }

      return updated;
    });

    // Clear error when field is modified
    if (errors[fieldName]) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: "",
      }));
    }

    // Handle dependent fields (like size based on gender for blazers)
    if (fieldName === "gender" && moduleName === "blazer_inventory") {
      setFormData((prev) => ({
        ...prev,
        size: "", // Reset size when gender changes
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      if (field.is_required) {
        const value = formData[field.field_name];
        if (value === undefined || value === null || value === "") {
          newErrors[field.field_name] = `${field.display_name} is required`;
        }
      }

      // Additional validation based on field type
      const value = formData[field.field_name];
      if (value && field.field_type === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          newErrors[field.field_name] = "Please enter a valid email address";
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!user || !validateForm()) return;

    setIsSubmitting(true);

    try {
      const submitData = { ...formData };

      // Add user_id and timestamps for new records
      if (!editingRecord) {
        submitData.user_id = user.id;
      }

      // Remove computed fields - DB computes via GENERATED ALWAYS
      if (moduleName === "daily_expenses") {
        // Let database generated column compute total; do not send 'total'
        delete submitData.total;
      }
      delete submitData.closing_balance; // kits_inventory
      delete submitData.in_stock; // games_inventory

      let result;
      if (editingRecord) {
        // Update existing record using dynamic table queries
        const { data, error } = await (supabase as any)
          .from(tableName)
          .update(submitData)
          .eq("id", editingRecord.id)
          .select()
          .single();

        if (error) throw error;
        result = data;

        // Log changes
        const changes = Object.keys(submitData).reduce((acc: any, key) => {
          const oldValue = editingRecord[key];
          const newValue = submitData[key];
          if (oldValue !== newValue) {
            acc[key] = { old: oldValue, new: newValue };
          }
          return acc;
        }, {});

        await logSuccess(
          moduleName,
          "UPDATE",
          {
            ...submitData,
            changes,
            summary: `Updated ${moduleName.replace("_", " ")} record`,
          },
          editingRecord.id
        );

        toast.success("Record updated successfully");
      } else {
        // Create new record using dynamic table queries
        const { data, error } = await (supabase as any)
          .from(tableName)
          .insert(submitData)
          .select()
          .single();

        if (error) throw error;
        result = data;

        await logSuccess(moduleName, "INSERT", submitData, result.id);
        toast.success("Record added successfully");
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error submitting form:", error);
      const errorMessage = error?.message || "Failed to save record";

      let userMessage = `Error: ${errorMessage}`;
      if (error?.code === "42501") {
        userMessage =
          "Permission denied. Please check your user role or contact an administrator.";
      } else if (error?.code === "23505") {
        userMessage =
          "This record already exists. Please check for duplicates.";
      }

      toast.error(userMessage);
      await logError(
        moduleName,
        editingRecord ? "UPDATE" : "INSERT",
        error,
        formData
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get size options based on gender for blazer inventory
  const getSizeField = (field: ModuleField) => {
    if (field.field_name === "size" && moduleName === "blazer_inventory") {
      const gender = formData.gender;
      if (!gender) {
        return { ...field, option_sets: [] };
      }

      // Create dynamic option set based on gender
      const sizeSetName =
        gender === "Male" ? "male_blazer_sizes" : "female_blazer_sizes";
      // For now, we'll use the existing field structure
      // In a full implementation, you might want to fetch the correct option set
      return field;
    }
    return field;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {title || (editingRecord ? "Edit Record" : "Add New Record")}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((field) => {
                const fieldToRender = getSizeField(field);
                return (
                  <div
                    key={field.id}
                    className={
                      field.field_type === "textarea" ? "md:col-span-2" : ""
                    }
                  >
                    <DynamicField
                      field={fieldToRender}
                      value={formData[field.field_name]}
                      onChange={(value) =>
                        handleFieldChange(field.field_name, value)
                      }
                      dependentValues={formData}
                      disabled={!field.is_editable}
                    />
                  </div>
                );
              })}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting
                ? editingRecord
                  ? "Updating..."
                  : "Adding..."
                : editingRecord
                ? "Update Record"
                : "Add Record"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
