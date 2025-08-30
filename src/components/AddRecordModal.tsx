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
    {
      name: "current_balance",
      label: "Current Balance",
      type: "text",
      required: false,
      readOnly: true,
      placeholder: "Shows current available balance from dashboard",
      className: "bg-muted font-mono text-lg font-semibold text-green-600",
    },
    { name: "date", label: "Date", type: "date", required: true },
    {
      name: "expenses",
      label: "Expenses",
      type: "number",
      required: false,
      defaultValue: 0,
    },
    {
      name: "previous_month_overspend",
      label: "Previous Month Carryover",
      type: "number",
      required: false,
      placeholder:
        "Amount from previous month (positive = overspend, negative = underspend)",
    },
    {
      name: "fixed_amount",
      label: "Fixed Amount (Optional)",
      type: "number",
      required: false,
      placeholder:
        "Add fixed amount for this month (only needed for initial setup or top-ups)",
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
    {
      name: "transaction_type",
      label: "Transaction Type",
      type: "select",
      options: ["Received (+)", "Sent (-)"],
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
    {
      name: "previous_stock",
      label: "Previous Stock",
      type: "number",
      required: true,
    },
    { name: "adding", label: "Adding", type: "number", required: false },
    { name: "sent", label: "Sent", type: "number", required: false },
    {
      name: "current_stock",
      label: "Current Stock",
      type: "number",
      required: false,
    },
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
  currentBalance?: number;
}

export function AddRecordModal({
  open,
  onOpenChange,
  onSuccess,
  defaultModuleType,
  currentBalance,
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

  // State to track if user wants to add a new item
  const [isAddingNewKit, setIsAddingNewKit] = useState(false);
  const [isAddingNewGame, setIsAddingNewGame] = useState(false);

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
    // Reset "Add New" states when changing module type
    setIsAddingNewKit(false);
    setIsAddingNewGame(false);

    // Set default values for kits when switching to kits module
    if (value === "kits") {
      setFormData({
        addins: 0,
        takeouts: 0,
      });
      console.log(
        "🔍 Module type changed to kits - initialized with default values (addins: 0, takeouts: 0)"
      );
    } else if (value === "expenses") {
      // For expenses, initialize with the passed currentBalance
      setFormData({
        current_balance: currentBalance ?? 0,
        expenses: 0,
        previous_month_overspend: 0,
        fixed_amount: 0,
      });
      console.log(
        "🔍 Module type changed to expenses - initialized with current balance:",
        currentBalance ?? 0
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
      } else if (defaultModuleType === "expenses") {
        // For expenses, initialize with default values and use the passed currentBalance
        console.log(
          "🔍 AddRecordModal - currentBalance prop received:",
          currentBalance
        );
        console.log(
          "🔍 AddRecordModal - typeof currentBalance:",
          typeof currentBalance
        );

        setFormData({
          current_balance: currentBalance ?? 0,
          expenses: 0,
          previous_month_overspend: 0,
          fixed_amount: 0,
        });
        console.log(
          "🔍 AddRecordModal - Expenses form initialized with actual current balance:",
          currentBalance ?? 0
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
      setIsAddingNewKit(false);
      setIsAddingNewGame(false);
      console.log("🔍 AddRecordModal - Modal closed, form reset");
    }
  }, [open]);

  const handleFieldChange = (fieldName: string, value: any) => {
    console.log(
      `🔍 Field change: ${fieldName} = "${value}" (was: "${formData[fieldName]}")`
    );
    console.log(`🔍 Form data before change:`, formData);

    setFormData((prev) => {
      const updated: Record<string, any> = { ...prev, [fieldName]: value };

      // Blazer auto-calc: compute post-entry in_office_stock from previous stock and quantity
      if (moduleType === "blazer") {
        const prevStock = Number(
          updated._prev_in_office_stock ?? updated.in_office_stock ?? 0
        );
        const qty = Number(
          fieldName === "quantity" ? value : updated.quantity ?? 0
        );
        const tx = String(updated.transaction_type || "");
        if (!Number.isNaN(prevStock) && !Number.isNaN(qty) && qty >= 0) {
          if (tx === "Sent (-)") {
            updated.in_office_stock = Math.max(0, prevStock - qty);
          } else if (tx === "Received (+)") {
            updated.in_office_stock = prevStock + qty;
          }
        }
      }

      // Games auto-calc: live current_stock from previous_stock + adding - sent
      if (moduleType === "games") {
        const previous = Number(
          fieldName === "previous_stock" ? value : updated.previous_stock ?? 0
        );
        const adding = Number(
          fieldName === "adding" ? value : updated.adding ?? 0
        );
        const sent = Number(fieldName === "sent" ? value : updated.sent ?? 0);
        if (
          !Number.isNaN(previous) &&
          !Number.isNaN(adding) &&
          !Number.isNaN(sent)
        ) {
          updated.current_stock = previous + adding - sent;
        }
      }

      // Daily expenses auto-calc: live current balance from fixed amount + previous month carryover - expenses
      if (moduleType === "expenses") {
        // Remove live calculation - just keep the current balance as passed from props
        // The balance will be updated after form submission when the dashboard refreshes
      }

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
        // Normalize blazer fields
        insertData.gender = insertData.gender || "Male";
        // Map transaction_type to sign and drop helper fields
        if (
          insertData.transaction_type &&
          insertData._prev_in_office_stock !== undefined
        ) {
          // in_office_stock already computed in form change handler
          delete insertData._prev_in_office_stock;
        }
        delete insertData.transaction_type;
      }

      if (moduleType === "expenses") {
        // Remove sr_no - it's auto-generated SERIAL field
        delete insertData.sr_no;
        // Let database generated column compute total; do not send 'total'
        delete insertData.total;
        // Remove opening_balance - it doesn't exist in daily_expenses table
        delete insertData.opening_balance;
        // Remove current_balance - it's a UI-only computed field
        delete insertData.current_balance;
        // Remove internal form management fields (no longer needed)

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
        // Normalize blanks and strings like '-' to numbers
        if (insertData.adding === "" || insertData.adding === "-")
          insertData.adding = 0;
        if (insertData.sent === "" || insertData.sent === "-")
          insertData.sent = 0;
        if (
          insertData.previous_stock === "" ||
          insertData.previous_stock === "-"
        )
          insertData.previous_stock = 0;
        // Some flows may still carry kits' 'addins' field — map it to 'adding'
        if (
          (insertData.adding === undefined || insertData.adding === null) &&
          insertData.addins !== undefined
        ) {
          insertData.adding = Number(insertData.addins) || 0;
        }
        delete insertData.addins;
        // current_stock is a UI-only computed field
        delete insertData.current_stock;
        // Ensure we don't accidentally send a date column if it doesn't exist
        delete insertData.date;
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

      if (moduleType === "expenses") {
        // Remove current_balance - it's just for display, not stored in database
        delete insertData.current_balance;

        // Log the cleaned data for debugging
        console.log("💰 Expenses data after cleaning:", insertData);
        console.log(
          "🔍 Checking for current_balance:",
          insertData.current_balance
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

      // Also insert into activity logs with a helpful summary
      console.log("📝 Logging activity...");

      const insertedRecord = Array.isArray(insertResult)
        ? insertResult[0]
        : undefined;
      const recordId = insertedRecord?.id;

      const moduleDisplayNames: Record<string, string> = {
        blazer_inventory: "Blazer Inventory",
        kits_inventory: "Kits Inventory",
        games_inventory: "Games Inventory",
        daily_expenses: "Daily Expenses",
        books_distribution: "Books Distribution",
        courier_tracking: "Courier Tracking",
      };

      // Build a concise summary per module
      let summary = "Record Added Successfully";
      if (tableName === "kits_inventory") {
        summary = `Added kit "${insertData.item_name || "Unknown"}" on ${
          insertData.date || "-"
        } (Opening: ${insertData.opening_balance ?? 0}, Add-ins: ${
          insertData.addins ?? 0
        }, Take-outs: ${insertData.takeouts ?? 0})`;
      } else if (tableName === "games_inventory") {
        summary = `Added game "${insertData.game_details || "Unknown"}" on ${
          insertData.date || "-"
        } (Prev: ${insertData.previous_stock ?? 0}, Adding: ${
          insertData.adding ?? 0
        }, Sent: ${insertData.sent ?? 0})`;
      } else if (tableName === "blazer_inventory") {
        const displaySize = (insertData.size || "")
          .toString()
          .replace("F-", "")
          .replace("M-", "");
        summary = `Added ${insertData.quantity ?? 0} ${
          insertData.gender || ""
        } ${displaySize} blazers`;
      } else if (tableName === "daily_expenses") {
        summary = `Expense entry on ${insertData.date || "-"} (Expenses: ₹${
          insertData.expenses ?? 0
        }, Fixed: ₹${insertData.fixed_amount ?? 0})`;
      } else if (tableName === "courier_tracking") {
        summary = `Courier ${insertData.status || "Dispatched"} - ${
          insertData.name || "Unknown"
        } (${insertData.tracking_number || "No Tracking"})`;
      } else if (tableName === "books_distribution") {
        summary = `Books distribution for ${
          insertData.school_name || "Unknown"
        } (${insertData.kit_type || "Kit"})`;
      }

      const { error: activityError } = await supabase
        .from("activity_logs")
        .insert({
          user_id: user.id,
          module_type: tableName,
          data: {
            module_name: moduleDisplayNames[tableName] || tableName,
            action: "CREATE_SUCCESS",
            summary,
            record_id: recordId,
            record_data: insertData,
            timestamp: new Date().toISOString(),
            user_email: user.email,
          },
        });

      if (activityError) {
        console.warn("⚠️ Failed to log activity:", activityError);
        // Don't fail the whole operation if activity logging fails
      } else {
        console.log("✅ Activity logged successfully");
      }

      console.log("🎉 Record creation successful!");
      console.log("🔍 About to close modal and reset form...");

      // Show success message
      if (moduleType === "expenses") {
        toast.success("Expense added successfully!");
      } else {
        toast.success("Record added successfully");
      }

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
      } else if (moduleType === "expenses") {
        // For expenses, fixed amount field is always visible
        setFormData({});
        console.log(
          "🔍 Expenses form reset - fixed amount field always visible"
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

  // Smart form logic for expenses - determine if fixed amount field should be shown
  const shouldShowFixedAmountField = () => {
    if (moduleType !== "expenses") return true;

    // For expenses, ALWAYS show fixed_amount field
    // It's optional but should be visible by default for better UX
    return true;
  };

  // Balance calculation and current month data removed - now handled in dashboard cards

  // Balance update function removed - now handled in dashboard cards

  const renderField = (field: any) => {
    const value = formData[field.name] || "";
    // Make all fields editable by default, except read-only fields
    const isDisabled = field.readOnly || false;
    const showAutoCarryNote =
      shouldAutoCarry(field.name) && autoCarryValues[field.name] !== undefined;

    // Special handling for current_balance field in expenses
    let displayValue = value;
    if (field.name === "current_balance" && moduleType === "expenses") {
      // Always show the passed currentBalance prop value with proper formatting
      const balance = currentBalance ?? 0;
      displayValue = `₹${balance.toFixed(2)}`;
    }

    // Fixed amount field is now always visible for expenses

    switch (field.type) {
      case "text":
      case "number":
        return (
          <div
            key={`${moduleType}-${field.name}`}
            className={`space-y-2 ${
              field.name === "current_balance"
                ? "p-4 bg-green-50 border border-green-200 rounded-lg"
                : ""
            }`}
          >
            <Label
              htmlFor={field.name}
              className={
                field.name === "current_balance"
                  ? "text-lg font-semibold text-green-700"
                  : ""
              }
            >
              {field.label}{" "}
              {field.required && <span className="text-destructive">*</span>}
            </Label>

            {field.name === "current_balance" && moduleType === "expenses" ? (
              // Special display for current balance - show formatted value
              <div className="flex items-center h-10 px-3 py-2 text-lg font-mono font-semibold text-green-600 bg-muted border border-input rounded-md">
                {displayValue}
              </div>
            ) : (
              <Input
                id={field.name}
                type={field.type}
                value={displayValue}
                onChange={(e) => {
                  // Don't allow changes for read-only fields
                  if (field.readOnly) return;

                  const raw = e.target.value;
                  if (field.type === "number") {
                    // Allow '', '-' while typing; convert to number only when valid
                    if (raw === "" || raw === "-") {
                      handleFieldChange(field.name, raw);
                    } else {
                      handleFieldChange(field.name, Number(raw));
                    }
                  } else {
                    handleFieldChange(field.name, raw);
                  }
                }}
                required={field.required}
                disabled={
                  isDisabled ||
                  (moduleType === "games" && field.name === "current_stock")
                }
                placeholder={field.placeholder}
                className={field.className || ""}
                readOnly={field.readOnly}
              />
            )}
            {/* Show helpful text for addins/takeouts fields */}
            {(field.name === "addins" || field.name === "takeouts") &&
              moduleType === "kits" && (
                <p className="text-sm text-muted-foreground">
                  Leave empty to use default value of 0
                </p>
              )}

            {/* Show helpful text for expenses fields */}
            {field.name === "previous_month_overspend" &&
              moduleType === "expenses" && (
                <p className="text-sm text-muted-foreground">
                  Enter positive amount if you overspent last month, negative if
                  you had money left
                </p>
              )}

            {/* Show helpful text for current balance field */}
            {field.name === "current_balance" && moduleType === "expenses" && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground"></p>
                {(() => {
                  const balance = currentBalance ?? 0;
                  return balance < 0 ? (
                    <p className="text-sm text-red-600 font-medium">
                      ⚠️ You are currently overspending this month
                    </p>
                  ) : null;
                })()}
              </div>
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
        // Handle special case for kits and games with "Add New" option
        if (
          (field.name === "item_name" && moduleType === "kits") ||
          (field.name === "game_details" && moduleType === "games")
        ) {
          const isAddingNew =
            field.name === "item_name" ? isAddingNewKit : isAddingNewGame;
          const setIsAddingNew =
            field.name === "item_name" ? setIsAddingNewKit : setIsAddingNewGame;
          const existingOptions =
            field.name === "item_name" ? kitNames : gameNames;

          return (
            <div key={`${moduleType}-${field.name}`} className="space-y-2">
              <Label htmlFor={field.name}>
                {field.label}{" "}
                {field.required && <span className="text-destructive">*</span>}
              </Label>

              {isAddingNew ? (
                // Show text input when adding new item
                <div className="space-y-2">
                  <Input
                    id={field.name}
                    type="text"
                    value={value}
                    onChange={(e) =>
                      handleFieldChange(field.name, e.target.value)
                    }
                    placeholder={`Enter new ${
                      field.name === "item_name" ? "kit" : "game"
                    } name`}
                    required={field.required}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAddingNew(false);
                      handleFieldChange(field.name, "");
                    }}
                    className="text-xs"
                  >
                    ← Back to dropdown
                  </Button>
                </div>
              ) : (
                // Show dropdown with existing options + "Add New" option
                <Select
                  value={value}
                  onValueChange={(val) => {
                    if (val === "ADD_NEW") {
                      setIsAddingNew(true);
                      handleFieldChange(field.name, "");
                    } else {
                      handleFieldChange(field.name, val);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${field.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Add "Add New" option at the top */}
                    <SelectItem
                      key="ADD_NEW"
                      value="ADD_NEW"
                      className="font-medium text-blue-600"
                    >
                      ➕ Add New {field.name === "item_name" ? "Kit" : "Game"}
                    </SelectItem>

                    {/* Separator */}
                    {existingOptions.length > 0 && (
                      <div className="px-2 py-1 text-xs text-muted-foreground border-b">
                        Existing {field.name === "item_name" ? "Kits" : "Games"}
                        :
                      </div>
                    )}

                    {/* Existing options */}
                    {existingOptions.map((option: string) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}

                    {existingOptions.length === 0 && (
                      <div className="px-2 py-1 text-xs text-muted-foreground">
                        No existing{" "}
                        {field.name === "item_name" ? "kits" : "games"} found
                      </div>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        }

        // Default select field for other cases
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

              {/* Balance preview removed - now shown in top dashboard cards */}

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
