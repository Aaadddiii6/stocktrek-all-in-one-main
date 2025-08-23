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
    {
      name: "item_name",
      label: "Item Name",
      type: "select",
      required: true,
      options: [],
    },
    { name: "date", label: "Date", type: "date", required: true },
    {
      name: "opening_balance",
      label: "Opening Balance",
      type: "number",
      required: true,
    },
    {
      name: "addins",
      label: "Add-ins",
      type: "number",
      required: false,
      placeholder: "Enter add-ins quantity (default: 0)",
    },
    {
      name: "takeouts",
      label: "Take-outs",
      type: "number",
      required: false,
      placeholder: "Enter take-outs quantity (default: 0)",
    },
    {
      name: "remarks",
      label: "Remarks",
      type: "textarea",
      required: false,
    },
  ],
  expenses: [
    { name: "date", label: "Date", type: "date", required: true },
    {
      name: "expense_category",
      label: "Expense Category",
      type: "select",
      required: true,
      options: ["Transport", "Food", "Stationary", "Other"],
    },
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
        "M-XS",
        "M-S",
        "M-M",
        "M-L",
        "M-XL",
        "M-XXL",
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
      label: "Game Name",
      type: "select",
      required: true,
      options: [],
    },
    { name: "date", label: "Date", type: "date", required: true },
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
    const tableMapping: Record<string, string> = {
      blazer: "blazer_inventory",
      kits: "kits_inventory",
      games: "games_inventory",
      expenses: "daily_expenses",
      books: "books_distribution",
      courier: "courier_tracking",
    };
    return tableMapping[moduleType] || "";
  };

  // Fetch existing kit names for dropdown
  const [kitNames, setKitNames] = useState<string[]>([]);
  const [isLoadingKits, setIsLoadingKits] = useState(false);

  // Fetch existing games names for dropdown
  const [gameNames, setGameNames] = useState<string[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(false);

  useEffect(() => {
    if (moduleType === "kits") {
      fetchKitNames();
    } else if (moduleType === "games") {
      fetchGameNames();
    }
  }, [moduleType]);

  const fetchKitNames = async () => {
    setIsLoadingKits(true);
    try {
      const { data, error } = await supabase
        .from("kits_inventory")
        .select("item_name")
        .not("item_name", "is", null);

      if (error) {
        console.error("❌ Error fetching kit names:", error);
        return;
      }

      // Extract unique item names
      const uniqueNames = [
        ...new Set(data.map((item) => item.item_name)),
      ].sort();
      setKitNames(uniqueNames);
      console.log("✅ Kit names fetched:", uniqueNames);
    } catch (error) {
      console.error("❌ Error fetching kit names:", error);
    } finally {
      setIsLoadingKits(false);
    }
  };

  const fetchGameNames = async () => {
    setIsLoadingGames(true);
    try {
      const { data, error } = await supabase
        .from("games_inventory")
        .select("game_details")
        .not("game_details", "is", null);

      if (error) {
        console.error("❌ Error fetching game names:", error);
        return;
      }

      // Extract unique item names
      const uniqueNames = [
        ...new Set(data.map((item) => item.game_details)),
      ].sort();
      setGameNames(uniqueNames);
      console.log("✅ Game names fetched:", uniqueNames);
    } catch (error) {
      console.error("❌ Error fetching game names:", error);
    } finally {
      setIsLoadingGames(false);
    }
  };

  const { autoCarryValues, shouldAutoCarry, canEditField } = useAutoCarryStock(
    getTableName(moduleType),
    formData
  );

  const handleModuleTypeChange = (value: string) => {
    setModuleType(value);
    // Set default values for kits when switching to kits module
    if (value === "kits") {
      setFormData({
        addins: 0,
        takeouts: 0,
      });
      console.log(
        "🔍 Module type changed to kits - initialized with default values (addins: 0, takeouts: 0)"
      );
    } else {
      // Don't reset form data completely - preserve user input for other modules
      // setFormData({});
      console.log(
        "🔍 Module type changed to:",
        value,
        "- preserving existing form data"
      );
    }
  };

  // Update form data when auto-carry values change – auto-carry values are already filtered
  useEffect(() => {
    if (!moduleType || Object.keys(autoCarryValues).length === 0) return;

    console.log("🔄 Auto-carry values received:", autoCarryValues);
    console.log("🔄 Current form data:", formData);

    // 🚀 THE FIX: Only update if values are actually different
    const needsUpdate = Object.keys(autoCarryValues).some(
      (key) => formData[key] !== autoCarryValues[key]
    );

    if (!needsUpdate) {
      console.log("🔄 No update needed - values are the same");
      return;
    }

    // 🚀 THE FIX: Use functional update to ensure we merge with the LATEST state
    setFormData((prevFormData) => {
      console.log("🔄 Before auto-carry update - prev formData:", prevFormData);

      // Merge auto-carry values with existing form data
      const updated = {
        ...prevFormData, // Keep all existing user input (including item_name)
        ...autoCarryValues, // Add the auto-carry values
      };

      console.log("🔄 After auto-carry update - updated formData:", updated);
      console.log("🔄 Form data updated with auto-carry values");
      return updated;
    });
  }, [autoCarryValues, moduleType]); // Removed formData dependency to prevent loops

  // 🔍 DEBUG: Track formData changes
  useEffect(() => {
    console.log("🔍 FormData changed:", formData);
    console.log("🔍 item_name in formData:", formData.item_name);
  }, [formData]);

  // Set default module type when modal opens
  useEffect(() => {
    if (open && defaultModuleType && !moduleType) {
      setModuleType(defaultModuleType);
      // Reset form data when modal opens with default values for kits
      if (defaultModuleType === "kits") {
        setFormData({
          addins: 0,
          takeouts: 0,
        });
        console.log(
          "🔍 AddRecordModal - Kits form initialized with default values (addins: 0, takeouts: 0)"
        );
      } else {
        setFormData({});
      }
      console.log("🔍 AddRecordModal - Module type set to:", defaultModuleType);
      if (defaultModuleType === "blazer") {
        console.log(
          "🔍 AddRecordModal - Blazer size options:",
          FIELD_CONFIGS.blazer[1].options
        );
      }
    }
  }, [open, defaultModuleType, moduleType]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({});
      setModuleType("");
      console.log("🔍 AddRecordModal - Modal closed, form reset");
    }
  }, [open]);

  const handleFieldChange = (fieldName: string, value: any) => {
    console.log(
      `🔍 Field change: ${fieldName} = "${value}" (was: "${formData[fieldName]}")`
    );
    console.log(`🔍 Form data before change:`, formData);

    setFormData((prev) => {
      const updated = { ...prev, [fieldName]: value };
      console.log(`🔍 Form data after change:`, updated);
      console.log(`🔍 item_name after change:`, updated.item_name);
      return updated;
    });
  };

  // Removed Enter key handling - using simple debounced approach

  const handleSubmit = async () => {
    if (!moduleType || !user) return;

    const fields = FIELD_CONFIGS[moduleType as keyof typeof FIELD_CONFIGS];
    const requiredFields = fields.filter((field) => field.required);

    // Validate required fields
    for (const field of requiredFields) {
      const value = formData[field.name];
      if (value === undefined || value === null || value === "") {
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
        // Ensure addins and takeouts have default values
        if (
          insertData.addins === undefined ||
          insertData.addins === null ||
          insertData.addins === ""
        ) {
          insertData.addins = 0;
        }
        if (
          insertData.takeouts === undefined ||
          insertData.takeouts === null ||
          insertData.takeouts === ""
        ) {
          insertData.takeouts = 0;
        }
        console.log(
          "🔧 Kits data after setting defaults - addins:",
          insertData.addins,
          "takeouts:",
          insertData.takeouts
        );
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

      console.log("📦 Final insert data:", insertData);

      // Insert into the specific module table
      console.log("💾 Inserting into table:", tableName);
      console.log(
        "📦 Insert data being sent:",
        JSON.stringify(insertData, null, 2)
      );

      const { error: moduleError, data: insertResult } = await (supabase as any)
        .from(tableName)
        .insert(insertData)
        .select();

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
        console.log("📊 Insert result:", insertResult);
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
      console.log("🔍 About to close modal and reset form...");
      toast.success("Record added successfully");
      onOpenChange(false);
      console.log("🔍 Modal closed, resetting form state...");
      setModuleType("");
      // Reset form with default values for kits
      if (moduleType === "kits") {
        setFormData({
          addins: 0,
          takeouts: 0,
        });
        console.log(
          "🔍 Kits form reset with default values (addins: 0, takeouts: 0)"
        );
      } else {
        setFormData({});
      }
      console.log("🔍 Form state reset complete, calling onSuccess...");
      onSuccess();
      console.log("🔍 onSuccess callback completed");
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
          <div key={`${moduleType}-${field.name}`} className="space-y-2">
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
              placeholder={field.placeholder}
            />
            {/* Show helpful text for addins/takeouts fields */}
            {(field.name === "addins" || field.name === "takeouts") &&
              moduleType === "kits" && (
                <p className="text-sm text-muted-foreground">
                  Leave empty to use default value of 0
                </p>
              )}
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
          <div key={`${moduleType}-${field.name}`} className="space-y-2">
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
          <div key={`${moduleType}-${field.name}`} className="space-y-2">
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
                  : field.name === "item_name" && moduleType === "kits"
                  ? kitNames
                  : field.name === "game_details" && moduleType === "games"
                  ? gameNames
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
          <div key={`${moduleType}-${field.name}`} className="space-y-2">
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
                      date
                        ? (() => {
                            const localDate = new Date(
                              date.getFullYear(),
                              date.getMonth(),
                              date.getDate()
                            );
                            return format(localDate, "yyyy-MM-dd");
                          })()
                        : ""
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
            <div key={moduleType} className="space-y-4">
              <h3 className="text-lg font-medium">
                {MODULE_TYPES[moduleType as keyof typeof MODULE_TYPES]} Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {FIELD_CONFIGS[moduleType as keyof typeof FIELD_CONFIGS].map(
                  renderField
                )}
              </div>
              {/* Removed Enter key tip - using simple debounced approach */}
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
