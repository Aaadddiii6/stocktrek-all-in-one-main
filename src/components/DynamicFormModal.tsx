import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useAutoCarryStock } from "@/hooks/useAutoCarryStock";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ModuleField } from "@/hooks/useModuleConfig";
import { DynamicField } from "@/components/DynamicField";

interface DynamicFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  moduleName: string;
  moduleDisplayName: string;
  tableName: string;
  fields: ModuleField[];
  editingRecord?: any;
}

export function DynamicFormModal({
  open,
  onOpenChange,
  onSuccess,
  moduleName,
  moduleDisplayName,
  tableName,
  fields,
  editingRecord,
}: DynamicFormModalProps) {
  const { user } = useAuth();
  const { logSuccess, logError } = useActivityLogger();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { autoCarryValues, shouldAutoCarry, canEditField } = useAutoCarryStock(
    tableName,
    formData
  );

  // Initialize form data when modal opens or when editing
  useEffect(() => {
    if (open) {
      if (editingRecord) {
        setFormData(editingRecord);
      } else {
        // Initialize form with auto-carry values for new records
        const initialData: Record<string, any> = {};
        fields.forEach((field) => {
          if (shouldAutoCarry(field.field_name)) {
            const autoCarryValue = autoCarryValues[field.field_name];
            if (autoCarryValue !== undefined) {
              initialData[field.field_name] = autoCarryValue;
            }
          }
        });
        setFormData(initialData);
      }
    }
  }, [autoCarryValues, open, editingRecord, shouldAutoCarry, fields]);

  // Update form data when auto-carry values change – only fill empty fields
  useEffect(() => {
    if (open && !editingRecord) {
      setFormData((prev) => {
        const updated = { ...prev };
        Object.keys(autoCarryValues).forEach((fieldName) => {
          if (!shouldAutoCarry(fieldName)) return;
          const current = prev[fieldName];
          const carryVal = autoCarryValues[fieldName];
          if (
            (current === "" || current === undefined || current === null) &&
            carryVal !== undefined
          ) {
            updated[fieldName] = carryVal;
          }
        });
        return updated;
      });
    }
  }, [autoCarryValues, open, editingRecord, shouldAutoCarry]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [fieldName]: value };

      // Handle dependent field resets (like size when gender changes)
      if (fieldName === "gender") {
        updated.size = "";
      }

      // Auto-calculate computed fields
      if (tableName === "kits_inventory") {
        if (
          fieldName === "opening_balance" ||
          fieldName === "addins" ||
          fieldName === "takeouts"
        ) {
          updated.closing_balance =
            (updated.opening_balance || 0) +
            (updated.addins || 0) -
            (updated.takeouts || 0);
        }
      } else if (tableName === "games_inventory") {
        if (
          fieldName === "previous_stock" ||
          fieldName === "adding" ||
          fieldName === "sent"
        ) {
          updated.in_stock =
            (updated.previous_stock || 0) +
            (updated.adding || 0) -
            (updated.sent || 0);
        }
      } else if (tableName === "daily_expenses") {
        if (fieldName === "fixed_amount" || fieldName === "expenses") {
          // display-only; DB computes stored total via generated column (expenses + fixed_amount)
          updated.total = (updated.fixed_amount || 0) + (updated.expenses || 0);
        }
      }

      return updated;
    });
  };

  const validateForm = () => {
    const errors: string[] = [];

    fields.forEach((field) => {
      if (field.is_required) {
        const value = formData[field.field_name];
        if (value === undefined || value === null || value === "") {
          errors.push(`${field.display_name} is required`);
        }
      }
    });

    return errors;
  };

  const handleSubmit = async () => {
    if (!user) return;

    const errors = validateForm();
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for submission
      const submitData = { ...formData };

      // Add user_id for new records
      if (!editingRecord) {
        submitData.user_id = user.id;
      }

      // Defaults for specific tables
      if (tableName === "books_distribution" && !submitData.kit_type) {
        submitData.kit_type = "Lab";
      }

      // Remove computed fields from submission (DB has generated columns)
      delete submitData.closing_balance; // kits_inventory: GENERATED ALWAYS
      delete submitData.in_stock; // games_inventory: GENERATED ALWAYS
      if (tableName === "daily_expenses") delete submitData.total; // DB generated column

      let result;
      if (editingRecord) {
        // Update existing record - use any to bypass TypeScript table name restrictions
        const { data, error } = await (supabase as any)
          .from(tableName)
          .update(submitData)
          .eq("id", editingRecord.id)
          .select()
          .single();

        if (error) throw error;
        result = data;

        // Log the changes
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
            summary: `Updated ${moduleDisplayName} record`,
          },
          editingRecord.id
        );

        toast.success(`${moduleDisplayName} record updated successfully`);
      } else {
        // Create new record - use any to bypass TypeScript table name restrictions
        const { data, error } = await (supabase as any)
          .from(tableName)
          .insert(submitData)
          .select()
          .single();

        if (error) throw error;
        result = data;

        await logSuccess(moduleName, "INSERT", submitData, result?.id);
        toast.success(`${moduleDisplayName} record added successfully`);
      }

      onOpenChange(false);
      setFormData({});
      onSuccess();
    } catch (error: any) {
      console.error(
        `Error ${editingRecord ? "updating" : "adding"} ${moduleName} record:`,
        error
      );
      const errorMessage =
        error?.message ||
        `Failed to ${editingRecord ? "update" : "add"} ${moduleName} record`;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingRecord
              ? `Edit ${moduleDisplayName} Record`
              : `Add ${moduleDisplayName} Record`}
          </DialogTitle>
          <DialogDescription>
            {editingRecord
              ? `Update the ${moduleDisplayName.toLowerCase()} record details.`
              : `Add a new ${moduleDisplayName.toLowerCase()} record.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields
              .filter(
                (field) => field.is_visible && field.field_name !== "user_id"
              )
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((field) => {
                // Disable auto-carried stock fields unless editable is allowed by hook
                const isDisabled = !canEditField(field.field_name);

                return (
                  <div
                    key={field.id}
                    className={
                      field.field_type === "textarea" ? "md:col-span-2" : ""
                    }
                  >
                    <DynamicField
                      field={{
                        ...field,
                        help_text:
                          // Auto-carried text hidden but functionality preserved
                          // shouldAutoCarry(field.field_name) &&
                          // autoCarryValues[field.field_name] !== undefined
                          //   ? `Auto-carried from previous entry: ${
                          //       autoCarryValues[field.field_name]
                          //     }`
                          //   : field.help_text,
                          field.help_text,
                      }}
                      value={formData[field.field_name]}
                      onChange={(value) =>
                        handleFieldChange(field.field_name, value)
                      }
                      dependentValues={formData}
                      disabled={isDisabled}
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
                ? `Update ${moduleDisplayName} Record`
                : `Add ${moduleDisplayName} Record`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
