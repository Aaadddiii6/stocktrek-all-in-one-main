import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAutoCarryStock } from "@/hooks/useAutoCarryStock";
import { toast } from "sonner";

const MODULE_TYPES = {
  courier: "Courier Tracking",
  kits: "Kits Inventory",
  expenses: "Daily Expenses",
  blazer: "Blazer Inventory",
  games: "Games Inventory",
  books: "Books Distribution",
};

const FIELD_CONFIGS = {
  courier: [
    { name: "name", label: "Name", type: "text", required: true },
    {
      name: "tracking_number",
      label: "Tracking Number",
      type: "text",
      required: true,
    },
    {
      name: "courier_details",
      label: "Courier Details",
      type: "text",
      required: true,
    },
    {
      name: "phone_number",
      label: "Phone Number",
      type: "text",
      required: true,
    },
    { name: "address", label: "Address", type: "textarea", required: true },
    { name: "date", label: "Date", type: "date", required: true },
    { name: "delivery_date", label: "Delivery Date", type: "date" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: ["Dispatched", "In Transit", "Delivered", "Delayed", "Failed"],
      required: true,
    },
  ],
  kits: [
    { name: "item_name", label: "Item Name", type: "text", required: true },
    { name: "date", label: "Date", type: "date", required: true },
    {
      name: "opening_balance",
      label: "Opening Balance",
      type: "number",
      required: true,
    },
    { name: "addins", label: "Add-ins", type: "number", required: true },
    { name: "takeouts", label: "Take-outs", type: "number", required: true },
    { name: "remarks", label: "Remarks", type: "textarea" },
  ],
  expenses: [
    { name: "date", label: "Date", type: "date", required: true },
    { name: "expenses", label: "Expenses", type: "number", required: true },
    {
      name: "fixed_amount",
      label: "Fixed Amount",
      type: "number",
      required: true,
    },
    { name: "remarks", label: "Remarks", type: "text", required: true },
  ],
  blazer: [
    {
      name: "gender",
      label: "Gender",
      type: "select",
      options: ["Male", "Female"],
      required: true,
    },
    // UI options should map to DB enums; we keep simple labels and map before insert
    {
      name: "size",
      label: "Size",
      type: "select",
      options: [
        "F-XS",
        "F-S",
        "F-M",
        "F-L",
        "F-XL",
        "F-XXL",
        "M-36",
        "M-38",
        "M-40",
        "M-42",
        "M-44",
        "M-46",
        "M-48",
        "M-50",
      ],
      required: true,
    },
    { name: "quantity", label: "Quantity", type: "number", required: true },
    {
      name: "in_office_stock",
      label: "In Office Stock",
      type: "number",
      required: true,
    },
    { name: "remarks", label: "Remarks", type: "textarea" },
  ],
  games: [
    {
      name: "game_details",
      label: "Game Details",
      type: "text",
      required: true,
    },
    {
      name: "previous_stock",
      label: "Previous Stock",
      type: "number",
      required: true,
    },
    { name: "adding", label: "Adding", type: "number", required: true },
    { name: "sent", label: "Sent", type: "number", required: true },
    { name: "sent_by", label: "Sent By", type: "text" },
  ],
  books: [
    { name: "school_name", label: "School Name", type: "text", required: true },
    {
      name: "coordinator_name",
      label: "Coordinator Name",
      type: "text",
      required: true,
    },
    {
      name: "coordinator_number",
      label: "Coordinator Number",
      type: "text",
      required: true,
    },
    { name: "address", label: "Address", type: "textarea", required: true },
    {
      name: "kit_type",
      label: "Kit Type",
      type: "select",
      options: ["Lab", "Individual", "Returnable"],
      required: true,
    },
    {
      name: "ordered_from_printer",
      label: "Ordered from Printer",
      type: "number",
      required: true,
    },
    { name: "received", label: "Received", type: "number", required: true },
    {
      name: "total_used_till_now",
      label: "Total Used Till Now",
      type: "number",
      required: true,
    },
    { name: "delivery_date", label: "Delivery Date", type: "date" },
    { name: "grade1", label: "Grade 1", type: "number" },
    { name: "grade2", label: "Grade 2", type: "number" },
    { name: "grade3", label: "Grade 3", type: "number" },
    { name: "grade4", label: "Grade 4", type: "number" },
    { name: "grade5", label: "Grade 5", type: "number" },
    { name: "grade6", label: "Grade 6", type: "number" },
    { name: "grade7", label: "Grade 7", type: "number" },
    { name: "grade7iot", label: "Grade 7 IoT", type: "number" },
    { name: "grade8", label: "Grade 8", type: "number" },
    { name: "grade8iot", label: "Grade 8 IoT", type: "number" },
    { name: "grade9", label: "Grade 9", type: "number" },
    { name: "grade9iot", label: "Grade 9 IoT", type: "number" },
    { name: "grade10", label: "Grade 10", type: "number" },
    { name: "grade10iot", label: "Grade 10 IoT", type: "number" },
    { name: "additional", label: "Additional Notes", type: "textarea" },
  ],
};

interface AddRecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultModuleType?: string;
}

export function AddRecordModal({
  open,
  onOpenChange,
  onSuccess,
  defaultModuleType,
}: AddRecordModalProps) {
  const { user } = useAuth();
  const [moduleType, setModuleType] = useState<string>("");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get table name for auto-carry functionality
  const getTableName = (moduleType: string): string => {
    const tableMapping = {
      courier: "courier_tracking",
      kits: "kits_inventory",
      expenses: "daily_expenses",
      blazer: "blazer_inventory",
      games: "games_inventory",
      books: "books_distribution",
    };
    return tableMapping[moduleType as keyof typeof tableMapping] || "";
  };

  const { autoCarryValues, shouldAutoCarry, canEditField } = useAutoCarryStock(
    getTableName(moduleType),
    formData
  );

  const handleModuleTypeChange = (value: string) => {
    setModuleType(value);
    setFormData({});
  };

  // Update form data when auto-carry values change – only fill empty fields
  useEffect(() => {
    if (!moduleType || Object.keys(autoCarryValues).length === 0) return;

    // Skip auto-carry for gender field to prevent infinite loops
    if (moduleType === "blazer" && Object.keys(autoCarryValues).length > 0) {
      console.log(
        "🔄 Auto-carry triggered but skipping for blazer to prevent loops"
      );
      return;
    }

    setFormData((prev) => {
      const updated = { ...prev };
      Object.keys(autoCarryValues).forEach((fieldName) => {
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
  }, [autoCarryValues, moduleType]);

  // Set default module type when modal opens
  useEffect(() => {
    if (open && defaultModuleType && !moduleType) {
      setModuleType(defaultModuleType);
    }
  }, [open, defaultModuleType, moduleType]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!moduleType || !user) return;

    const fields = FIELD_CONFIGS[moduleType as keyof typeof FIELD_CONFIGS];
    const requiredFields = fields.filter((field) => field.required);

    // Validate required fields
    for (const field of requiredFields) {
      if (!formData[field.name]) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    console.log("🔄 Submitting record for module:", moduleType);
    console.log("📝 Form data:", formData);
    setIsSubmitting(true);

    try {
      // Map module types to table names
      const tableMapping = {
        courier: "courier_tracking",
        kits: "kits_inventory",
        expenses: "daily_expenses",
        blazer: "blazer_inventory",
        games: "games_inventory",
        books: "books_distribution",
      };

      const tableName = tableMapping[moduleType as keyof typeof tableMapping];
      console.log("📍 Target table:", tableName);

      // Prepare data for insertion
      const insertData: Record<string, any> = {
        ...formData,
        user_id: user.id,
      };
      console.log("📦 Insert data before processing:", insertData);

      // Handle special cases for different modules
      if (moduleType === "blazer") {
        // Add gender field for blazers (default to 'Male' if not specified)
        insertData.gender = insertData.gender || "Male";
      }

      if (moduleType === "expenses") {
        // Remove sr_no - it's auto-generated SERIAL field
        delete insertData.sr_no;
        // Let database generated column compute total; do not send 'total'
        delete insertData.total;
        // Remove opening_balance - it doesn't exist in daily_expenses table
        delete insertData.opening_balance;

        // Log the cleaned data for debugging
        console.log("🧹 Daily expenses data after cleaning:", insertData);
        console.log("🔍 Checking for sr_no:", insertData.sr_no);
        console.log("🔍 Checking for total:", insertData.total);
        console.log(
          "🔍 Checking for opening_balance:",
          insertData.opening_balance
        );
      }

      if (moduleType === "kits") {
        // DB computes closing_balance; do not send it
        delete insertData.closing_balance;
      }

      if (moduleType === "games") {
        // DB computes in_stock; do not send it
        delete insertData.in_stock;
        // Remove in_office_stock - it doesn't exist in games_inventory table
        delete insertData.in_office_stock;

        // Log the cleaned data for debugging
        console.log("🎮 Games data after cleaning:", insertData);
        console.log("🔍 Checking for in_stock:", insertData.in_stock);
        console.log(
          "🔍 Checking for in_office_stock:",
          insertData.in_office_stock
        );
      }

      if (moduleType === "courier") {
        // Remove sr_no - it's auto-generated SERIAL field
        delete insertData.sr_no;
        // Remove opening_balance - it doesn't exist in courier_tracking table
        delete insertData.opening_balance;

        // Log the cleaned data for debugging
        console.log("📦 Courier data after cleaning:", insertData);
        console.log("🔍 Checking for sr_no:", insertData.sr_no);
        console.log(
          "🔍 Checking for opening_balance:",
          insertData.opening_balance
        );
      }

      if (moduleType === "books") {
        // Remove previous_stock - it doesn't exist in books_distribution table
        delete insertData.previous_stock;

        // Log the cleaned data for debugging
        console.log("📚 Books data after cleaning:", insertData);
        console.log(
          "🔍 Checking for previous_stock:",
          insertData.previous_stock
        );
      }

      if (moduleType === "kits") {
        // DB computes closing_balance; do not send it
        delete insertData.closing_balance;
      }

      console.log("📦 Final insert data:", insertData);

      // Insert into the specific module table
      console.log("💾 Inserting into table:", tableName);
      const { error: moduleError } = await (supabase as any)
        .from(tableName)
        .insert(insertData);

      if (moduleError) {
        console.error("❌ Module insert error:", moduleError);
        console.error("❌ Error details:", {
          message: moduleError.message,
          code: moduleError.code,
          details: moduleError.details,
          hint: moduleError.hint,
          fullError: moduleError,
        });

        // Log the full error object for debugging
        console.error(
          "🔍 Full error object:",
          JSON.stringify(moduleError, null, 2)
        );

        throw moduleError;
      } else {
        console.log("✅ Successfully inserted into", tableName);
      }

      // Also insert into activity logs for tracking
      console.log("📝 Logging activity...");
      const { error: activityError } = await supabase
        .from("activity_logs")
        .insert({
          user_id: user.id,
          module_type: tableName,
          data: formData,
        });

      if (activityError) {
        console.warn("⚠️ Failed to log activity:", activityError);
        // Don't fail the whole operation if activity logging fails
      } else {
        console.log("✅ Activity logged successfully");
      }

      console.log("🎉 Record creation successful!");
      toast.success("Record added successfully");
      onOpenChange(false);
      setModuleType("");
      setFormData({});
      onSuccess();
    } catch (error) {
      console.error("❌ Error adding record:", error);
      toast.error("Failed to add record");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: any) => {
    const value = formData[field.name] || "";
    // Make all fields editable by default
    const isDisabled = false;
    const showAutoCarryNote =
      shouldAutoCarry(field.name) && autoCarryValues[field.name] !== undefined;

    switch (field.type) {
      case "text":
      case "number":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}{" "}
              {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type}
              value={value}
              onChange={(e) =>
                handleFieldChange(
                  field.name,
                  field.type === "number"
                    ? Number(e.target.value)
                    : e.target.value
                )
              }
              required={field.required}
              disabled={isDisabled}
            />
            {/* Auto-carry text hidden but functionality preserved */}
            {/* {showAutoCarryNote && (
              <p className="text-sm text-muted-foreground">
                Auto-carried from previous entry: {autoCarryValues[field.name]}
              </p>
            )} */}
          </div>
        );

      case "textarea":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}{" "}
              {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id={field.name}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              required={field.required}
            />
          </div>
        );

      case "select":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}{" "}
              {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(val) => handleFieldChange(field.name, val)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {(field.name === "size" && moduleType === "blazer"
                  ? formData.gender === "Male"
                    ? field.options?.filter((o: string) => o.startsWith("M-"))
                    : field.options?.filter((o: string) => o.startsWith("F-"))
                  : field.options
                )?.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {field.name === "size"
                      ? option.replace("F-", "").replace("M-", "")
                      : option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "date":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}{" "}
              {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !value && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value
                    ? format(new Date(value), "PPP")
                    : `Pick ${field.label.toLowerCase()}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={value ? new Date(value) : undefined}
                  onSelect={(date) =>
                    handleFieldChange(
                      field.name,
                      date?.toISOString().split("T")[0]
                    )
                  }
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {moduleType
              ? `Add ${
                  MODULE_TYPES[moduleType as keyof typeof MODULE_TYPES]
                } Record`
              : "Add New Record"}
          </DialogTitle>
          <DialogDescription>
            {moduleType
              ? `Add a new ${MODULE_TYPES[
                  moduleType as keyof typeof MODULE_TYPES
                ].toLowerCase()} record.`
              : "Select a module type and fill in the required information."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>
              Module Type <span className="text-destructive">*</span>
            </Label>
            <Select value={moduleType} onValueChange={handleModuleTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select module type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MODULE_TYPES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {moduleType && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                {MODULE_TYPES[moduleType as keyof typeof MODULE_TYPES]} Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {FIELD_CONFIGS[moduleType as keyof typeof FIELD_CONFIGS].map(
                  renderField
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!moduleType || isSubmitting}
            >
              {isSubmitting
                ? "Adding..."
                : moduleType
                ? `Add ${
                    MODULE_TYPES[moduleType as keyof typeof MODULE_TYPES]
                  } Record`
                : "Add Record"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
