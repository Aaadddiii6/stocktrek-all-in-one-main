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
  book_inventory: "Book Inventory",
  book_distribution: "Book Distribution",
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
      readOnly: false,
      placeholder:
        "Enter carryover from previous month (+ or −). Default: 0 (optional)",
      className: "",
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
      label: "Current In-Office Stock",
      type: "number",
      required: false,
      placeholder: "Shows current stock for selected size/gender",
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
  book_inventory: [
    {
      name: "kit_name",
      label: "Kit Name",
      type: "select",
      required: true,
      options: [],
    },
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
      required: false,
      placeholder: "Enter number of books ordered (optional)",
    },
    {
      name: "received",
      label: "Received",
      type: "number",
      required: false,
      placeholder: "Enter number of books received (optional)",
    },
    {
      name: "total_used_till_now",
      label: "Total Used Till Now",
      type: "number",
      required: false,
      defaultValue: 0,
      placeholder: "Will be calculated automatically from distributions",
      readOnly: true,
    },
    { name: "grade1", label: "Grade 1", type: "number", defaultValue: 0 },
    { name: "grade2", label: "Grade 2", type: "number", defaultValue: 0 },
    { name: "grade3", label: "Grade 3", type: "number", defaultValue: 0 },
    { name: "grade4", label: "Grade 4", type: "number", defaultValue: 0 },
    { name: "grade5", label: "Grade 5", type: "number", defaultValue: 0 },
    { name: "grade6", label: "Grade 6", type: "number", defaultValue: 0 },
    { name: "grade7", label: "Grade 7", type: "number", defaultValue: 0 },
    {
      name: "grade7iot",
      label: "Grade 7 IoT",
      type: "number",
      defaultValue: 0,
    },
    { name: "grade8", label: "Grade 8", type: "number", defaultValue: 0 },
    {
      name: "grade8iot",
      label: "Grade 8 IoT",
      type: "number",
      defaultValue: 0,
    },
    { name: "grade9", label: "Grade 9", type: "number", defaultValue: 0 },
    {
      name: "grade9iot",
      label: "Grade 9 IoT",
      type: "number",
      defaultValue: 0,
    },
    { name: "grade10", label: "Grade 10", type: "number", defaultValue: 0 },
    {
      name: "grade10iot",
      label: "Grade 10 IoT",
      type: "number",
      defaultValue: 0,
    },
    { name: "remarks", label: "Remarks", type: "textarea" },
  ],
  book_distribution: [
    {
      name: "school_name",
      label: "School Name",
      type: "select",
      required: true,
      options: [],
    },
    {
      name: "coordinator_name",
      label: "Coordinator Name",
      type: "select",
      required: true,
      options: [],
    },
    {
      name: "coordinator_number",
      label: "Coordinator Number",
      type: "text",
      required: true,
    },
    {
      name: "address",
      label: "Address",
      type: "textarea",
      required: true,
      readOnly: true,
    },
    {
      name: "kit_name",
      label: "Kit Name",
      type: "select",
      required: true,
      options: [],
    },
    {
      name: "kit_type",
      label: "Kit Type",
      type: "select",
      required: true,
      options: ["Lab", "Individual", "Returnable"],
    },
    { name: "delivery_date", label: "Delivery Date", type: "date" },
    { name: "grade1", label: "Grade 1", type: "number", defaultValue: 0 },
    { name: "grade2", label: "Grade 2", type: "number", defaultValue: 0 },
    { name: "grade3", label: "Grade 3", type: "number", defaultValue: 0 },
    { name: "grade4", label: "Grade 4", type: "number", defaultValue: 0 },
    { name: "grade5", label: "Grade 5", type: "number", defaultValue: 0 },
    { name: "grade6", label: "Grade 6", type: "number", defaultValue: 0 },
    { name: "grade7", label: "Grade 7", type: "number", defaultValue: 0 },
    {
      name: "grade7iot",
      label: "Grade 7 IoT",
      type: "number",
      defaultValue: 0,
    },
    { name: "grade8", label: "Grade 8", type: "number", defaultValue: 0 },
    {
      name: "grade8iot",
      label: "Grade 8 IoT",
      type: "number",
      defaultValue: 0,
    },
    { name: "grade9", label: "Grade 9", type: "number", defaultValue: 0 },
    {
      name: "grade9iot",
      label: "Grade 9 IoT",
      type: "number",
      defaultValue: 0,
    },
    { name: "grade10", label: "Grade 10", type: "number", defaultValue: 0 },
    {
      name: "grade10iot",
      label: "Grade 10 IoT",
      type: "number",
      defaultValue: 0,
    },
    { name: "additional", label: "Additional Notes", type: "textarea" },
  ],
};

interface AddRecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultModuleType?: string;
  currentBalance?: number;
  selectedMonth?: string;
  previousMonthCarryover?: number;
}

export function AddRecordModal({
  open,
  onOpenChange,
  onSuccess,
  defaultModuleType,
  currentBalance,
  selectedMonth,
  previousMonthCarryover,
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
      book_inventory: "book_inventory",
      book_distribution: "books_distribution",
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

  // Fetch existing book kit names for dropdown
  const [bookKitNames, setBookKitNames] = useState<string[]>([]);
  const [isLoadingBookKits, setIsLoadingBookKits] = useState(false);

  // Fetch schools and coordinators for book distribution
  const [schools, setSchools] = useState<any[]>([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [isLoadingCoordinators, setIsLoadingCoordinators] = useState(false);

  // State to track if user wants to add a new item
  const [isAddingNewKit, setIsAddingNewKit] = useState(false);
  const [isAddingNewGame, setIsAddingNewGame] = useState(false);
  const [isAddingNewBookKit, setIsAddingNewBookKit] = useState(false);
  const [isAddingNewSchool, setIsAddingNewSchool] = useState(false);
  const [isAddingNewCoordinator, setIsAddingNewCoordinator] = useState(false);

  useEffect(() => {
    if (moduleType === "kits") {
      fetchKitNames();
    } else if (moduleType === "games") {
      fetchGameNames();
    } else if (moduleType === "book_inventory") {
      fetchBookKitNames();
    } else if (moduleType === "book_distribution") {
      fetchSchools();
      fetchCoordinators();
      fetchBookKitNames();
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

  const fetchBookKitNames = async () => {
    setIsLoadingBookKits(true);
    try {
      const { data, error } = await (supabase as any)
        .from("book_inventory")
        .select("kit_name")
        .not("kit_name", "is", null);

      if (error) {
        console.error("❌ Error fetching book kit names:", error);
        return;
      }

      // Extract unique kit names
      const uniqueNames = [
        ...new Set(data.map((item: any) => item.kit_name).filter(Boolean)),
      ].sort() as string[];
      setBookKitNames(uniqueNames);
      console.log("✅ Book kit names fetched:", uniqueNames);
    } catch (error) {
      console.error("❌ Error fetching book kit names:", error);
    } finally {
      setIsLoadingBookKits(false);
    }
  };

  const fetchSchools = async () => {
    setIsLoadingSchools(true);
    try {
      const { data, error } = await (supabase as any)
        .from("schools")
        .select("*")
        .order("school_name");

      if (error) {
        console.error("❌ Error fetching schools:", error);
        // If table doesn't exist, set empty array
        if (
          error.code === "PGRST116" ||
          error.message.includes("does not exist")
        ) {
          console.log(
            "📝 Schools table doesn't exist yet - migrations need to be applied"
          );
          setSchools([]);
        }
        return;
      }

      setSchools(data || []);
      console.log("✅ Schools fetched:", data);
    } catch (error) {
      console.error("❌ Error fetching schools:", error);
      setSchools([]);
    } finally {
      setIsLoadingSchools(false);
    }
  };

  const fetchCoordinators = async () => {
    setIsLoadingCoordinators(true);
    try {
      const { data, error } = await (supabase as any)
        .from("coordinators")
        .select("*")
        .order("coordinator_name");

      if (error) {
        console.error("❌ Error fetching coordinators:", error);
        // If table doesn't exist, set empty array
        if (
          error.code === "PGRST116" ||
          error.message.includes("does not exist")
        ) {
          console.log(
            "📝 Coordinators table doesn't exist yet - migrations need to be applied"
          );
          setCoordinators([]);
        }
        return;
      }

      setCoordinators(data || []);
      console.log("✅ Coordinators fetched:", data);
    } catch (error) {
      console.error("❌ Error fetching coordinators:", error);
      setCoordinators([]);
    } finally {
      setIsLoadingCoordinators(false);
    }
  };

  const fetchExistingKitData = async (kitName: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from("book_inventory")
        .select("*")
        .eq("kit_name", kitName)
        .single();

      if (error) {
        console.error("❌ Error fetching existing kit data:", error);
        return;
      }

      if (data) {
        console.log("✅ Existing kit data fetched:", data);
        // Populate form with existing data
        setFormData({
          kit_name: (data as any).kit_name,
          kit_type: (data as any).kit_type,
          ordered_from_printer: (data as any).ordered_from_printer || "",
          received: (data as any).received || "",
          total_used_till_now: (data as any).total_used_till_now || 0,
          grade1: (data as any).grade1 || 0,
          grade2: (data as any).grade2 || 0,
          grade3: (data as any).grade3 || 0,
          grade4: (data as any).grade4 || 0,
          grade5: (data as any).grade5 || 0,
          grade6: (data as any).grade6 || 0,
          grade7: (data as any).grade7 || 0,
          grade7iot: (data as any).grade7iot || 0,
          grade8: (data as any).grade8 || 0,
          grade8iot: (data as any).grade8iot || 0,
          grade9: (data as any).grade9 || 0,
          grade9iot: (data as any).grade9iot || 0,
          grade10: (data as any).grade10 || 0,
          grade10iot: (data as any).grade10iot || 0,
          remarks: (data as any).remarks || "",
        });
      }
    } catch (error) {
      console.error("❌ Error fetching existing kit data:", error);
    }
  };

  const fetchSchoolData = async (schoolName: string) => {
    try {
      console.log("🏫 Fetching school data for:", schoolName);

      // First try to find in the current schools array
      let school = schools.find((s) => s.school_name === schoolName);

      // If not found, fetch from database
      if (!school) {
        console.log("🏫 School not in cache, fetching from database...");
        const { data, error } = await (supabase as any)
          .from("schools")
          .select("*")
          .eq("school_name", schoolName)
          .single();

        if (error) {
          console.error("❌ Error fetching school from database:", error);
          return;
        }
        school = data;
      }

      if (school) {
        console.log("✅ School data found:", school);
        console.log("🏫 Setting address to:", school.address);

        // Use setTimeout to ensure this runs after the current setFormData call
        setTimeout(() => {
          setFormData((prev) => {
            const updated = {
              ...prev,
              address: school.address,
            };
            console.log("🏫 Form data after address update:", updated);
            console.log("🏫 Address field value:", updated.address);
            console.log(
              "🏫 Full formData object:",
              JSON.stringify(updated, null, 2)
            );
            return updated;
          });
        }, 0);
      } else {
        console.log("❌ No school data found for:", schoolName);
      }
    } catch (error) {
      console.error("❌ Error fetching school data:", error);
    }
  };

  const fetchCoordinatorData = async (coordinatorName: string) => {
    try {
      console.log("👤 Fetching coordinator data for:", coordinatorName);

      // First try to find in the current coordinators array
      let coordinator = coordinators.find(
        (c) => c.coordinator_name === coordinatorName
      );

      // If not found, fetch from database
      if (!coordinator) {
        console.log("👤 Coordinator not in cache, fetching from database...");
        const { data, error } = await (supabase as any)
          .from("coordinators")
          .select("*")
          .eq("coordinator_name", coordinatorName)
          .single();

        if (error) {
          console.error("❌ Error fetching coordinator from database:", error);
          return;
        }
        coordinator = data;
      }

      if (coordinator) {
        console.log("✅ Coordinator data found:", coordinator);
        console.log(
          "👤 Setting coordinator number to:",
          coordinator.coordinator_number
        );

        // Use setTimeout to ensure this runs after the current setFormData call
        setTimeout(() => {
          setFormData((prev) => {
            const updated = {
              ...prev,
              coordinator_number: coordinator.coordinator_number,
            };
            console.log(
              "👤 Form data after coordinator number update:",
              updated
            );
            console.log(
              "👤 Coordinator number field value:",
              updated.coordinator_number
            );
            console.log(
              "👤 Full formData object:",
              JSON.stringify(updated, null, 2)
            );
            return updated;
          });
        }, 0);
      } else {
        console.log("❌ No coordinator data found for:", coordinatorName);
      }
    } catch (error) {
      console.error("❌ Error fetching coordinator data:", error);
    }
  };

  const fetchBlazerCurrentStock = async (gender: string, size: string) => {
    try {
      console.log("🔍 Fetching current blazer stock for:", gender, size);

      const { data, error } = await supabase
        .from("blazer_inventory")
        .select("quantity")
        .eq("gender", gender)
        .eq("size", size as any);

      if (error) {
        console.error("❌ Error fetching blazer stock:", error);
        return 0;
      }

      // Calculate current stock by summing all quantities for this gender/size
      const currentStock = (data || []).reduce(
        (sum, item) => sum + (item.quantity || 0),
        0
      );

      console.log("📊 Current stock for", gender, size, ":", currentStock);
      return currentStock;
    } catch (error) {
      console.error("❌ Error fetching blazer current stock:", error);
      return 0;
    }
  };

  const fetchKitStockData = async (kitName: string) => {
    try {
      console.log("📦 Fetching kit stock data for:", kitName);

      const { data, error } = await (supabase as any)
        .from("book_inventory")
        .select("*")
        .eq("kit_name", kitName)
        .single();

      if (error) {
        console.error("❌ Error fetching kit stock data:", error);
        return;
      }

      if (data) {
        console.log("✅ Kit stock data fetched:", data);

        // Calculate available stock (received - total_used_till_now)
        const received = Number((data as any).received) || 0;
        const totalUsed = Number((data as any).total_used_till_now) || 0;
        const available = received - totalUsed;

        console.log("📊 Stock calculation:", {
          received,
          totalUsed,
          available,
        });

        // Store current stock data for live updates
        setFormData((prev) => ({
          ...prev,
          _current_stock: {
            grade1: (data as any).grade1 || 0,
            grade2: (data as any).grade2 || 0,
            grade3: (data as any).grade3 || 0,
            grade4: (data as any).grade4 || 0,
            grade5: (data as any).grade5 || 0,
            grade6: (data as any).grade6 || 0,
            grade7: (data as any).grade7 || 0,
            grade7iot: (data as any).grade7iot || 0,
            grade8: (data as any).grade8 || 0,
            grade8iot: (data as any).grade8iot || 0,
            grade9: (data as any).grade9 || 0,
            grade9iot: (data as any).grade9iot || 0,
            grade10: (data as any).grade10 || 0,
            grade10iot: (data as any).grade10iot || 0,
          },
          _stock_info: {
            received,
            total_used_till_now: totalUsed,
            available,
          },
        }));
      }
    } catch (error) {
      console.error("❌ Error fetching kit stock data:", error);
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
    setIsAddingNewBookKit(false);
    setIsAddingNewSchool(false);
    setIsAddingNewCoordinator(false);

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
      // For expenses, initialize with the passed currentBalance and previous month carryover
      setFormData({
        current_balance: currentBalance ?? 0,
        expenses: 0,
        previous_month_overspend: previousMonthCarryover ?? 0,
        fixed_amount: 0,
      });
      console.log(
        "🔍 Module type changed to expenses - initialized with current balance:",
        currentBalance ?? 0,
        "and previous month carryover:",
        previousMonthCarryover ?? 0
      );
    } else if (value === "book_inventory") {
      // For book inventory, initialize with default values for grades only
      setFormData({
        total_used_till_now: 0, // This will be calculated automatically
        grade1: 0,
        grade2: 0,
        grade3: 0,
        grade4: 0,
        grade5: 0,
        grade6: 0,
        grade7: 0,
        grade7iot: 0,
        grade8: 0,
        grade8iot: 0,
        grade9: 0,
        grade9iot: 0,
        grade10: 0,
        grade10iot: 0,
      });
      console.log(
        "🔍 Module type changed to book_inventory - initialized with default values for grades"
      );
    } else if (value === "book_distribution") {
      // For book distribution, initialize with default values for grades
      setFormData({
        grade1: 0,
        grade2: 0,
        grade3: 0,
        grade4: 0,
        grade5: 0,
        grade6: 0,
        grade7: 0,
        grade7iot: 0,
        grade8: 0,
        grade8iot: 0,
        grade9: 0,
        grade9iot: 0,
        grade10: 0,
        grade10iot: 0,
      });
      console.log(
        "🔍 Module type changed to book_distribution - initialized with default values for grades"
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

      // For blazer module, preserve in_office_stock if it was set by user selection
      const updated = {
        ...prevFormData, // Keep all existing user input (including item_name)
        ...autoCarryValues, // Add the auto-carry values
      };

      // Special handling for blazer: preserve in_office_stock if it was manually set
      if (
        moduleType === "blazer" &&
        prevFormData.in_office_stock !== undefined &&
        prevFormData.in_office_stock !== null
      ) {
        updated.in_office_stock = prevFormData.in_office_stock;
        console.log(
          "🔄 Preserving manually set in_office_stock:",
          prevFormData.in_office_stock
        );
      }

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
        // For expenses, initialize with default values and use the passed currentBalance and carryover
        console.log(
          "🔍 AddRecordModal - currentBalance prop received:",
          currentBalance
        );
        console.log(
          "🔍 AddRecordModal - previousMonthCarryover prop received:",
          previousMonthCarryover
        );

        setFormData({
          current_balance: currentBalance ?? 0,
          expenses: 0,
          previous_month_overspend: previousMonthCarryover ?? 0,
          fixed_amount: 0,
        });
        console.log(
          "🔍 AddRecordModal - Expenses form initialized with current balance:",
          currentBalance ?? 0,
          "and previous month carryover:",
          previousMonthCarryover ?? 0
        );
      } else if (defaultModuleType === "book_inventory") {
        setFormData({
          total_used_till_now: 0, // This will be calculated automatically
          grade1: 0,
          grade2: 0,
          grade3: 0,
          grade4: 0,
          grade5: 0,
          grade6: 0,
          grade7: 0,
          grade7iot: 0,
          grade8: 0,
          grade8iot: 0,
          grade9: 0,
          grade9iot: 0,
          grade10: 0,
          grade10iot: 0,
        });
        console.log(
          "🔍 AddRecordModal - Book inventory form initialized with default values for grades"
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
      setIsAddingNewBookKit(false);
      setIsAddingNewSchool(false);
      setIsAddingNewCoordinator(false);
      console.log("🔍 AddRecordModal - Modal closed, form reset");
    }
  }, [open]);

  // Debug form data changes
  useEffect(() => {
    console.log("🔍 FormData changed:", formData);
    console.log("🔍 item_name in formData:", formData.item_name);
  }, [formData]);

  const handleFieldChange = (fieldName: string, value: any) => {
    console.log(
      `🔍 Field change: ${fieldName} = "${value}" (was: "${formData[fieldName]}")`
    );
    console.log(`🔍 Form data before change:`, formData);

    setFormData((prev) => {
      const updated: Record<string, any> = { ...prev, [fieldName]: value };

      // Handle kit_name selection for book_inventory
      if (
        moduleType === "book_inventory" &&
        fieldName === "kit_name" &&
        value &&
        value !== "ADD_NEW"
      ) {
        // Fetch existing kit data when a kit is selected
        fetchExistingKitData(value);
      }

      // Handle book_distribution dropdowns
      if (moduleType === "book_distribution") {
        if (fieldName === "school_name" && value && value !== "ADD_NEW") {
          fetchSchoolData(value);
        } else if (
          fieldName === "coordinator_name" &&
          value &&
          value !== "ADD_NEW"
        ) {
          fetchCoordinatorData(value);
        } else if (fieldName === "kit_name" && value && value !== "ADD_NEW") {
          fetchKitStockData(value);
        }
      }

      // Blazer auto-calc: fetch current stock when gender or size changes
      if (moduleType === "blazer") {
        if (fieldName === "gender" || fieldName === "size") {
          const gender = fieldName === "gender" ? value : updated.gender;
          const size = fieldName === "size" ? value : updated.size;

          if (gender && size) {
            console.log("🔍 Fetching current stock for blazer:", gender, size);
            fetchBlazerCurrentStock(gender, size).then((currentStock) => {
              setFormData((prev) => ({
                ...prev,
                in_office_stock: currentStock,
              }));
            });
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

      // Daily expenses: allow negative values for carryover while typing
      if (
        moduleType === "expenses" &&
        fieldName === "previous_month_overspend"
      ) {
        const parsed = Number(value);
        if (value === "" || value === "-" || !Number.isFinite(parsed)) {
          return updated;
        }
        updated.previous_month_overspend = parsed;
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
        book_inventory: "book_inventory",
        book_distribution: "books_distribution",
      };

      const tableName = tableMapping[moduleType as keyof typeof tableMapping];
      console.log("📍 Target table:", tableName);

      // Prepare data for insertion
      const insertData: Record<string, any> = {
        ...formData,
        // For company balance sheet, we don't need user_id filtering
        // user_id: user.id, // Removed for company-wide tracking
      };

      // Remove helper fields that shouldn't be sent to database
      delete insertData._current_stock;
      delete insertData._stock_info;

      console.log("📦 Insert data before processing:", insertData);

      // Handle special cases for different modules
      if (moduleType === "blazer") {
        // Normalize blazer fields
        insertData.gender = insertData.gender || "Male";

        // Map transaction_type to quantity with proper sign
        const qty = Number(insertData.quantity || 0);
        const tx = String(insertData.transaction_type || "");

        if (tx === "Sent (-)") {
          insertData.quantity = -qty; // Negative for sent
          insertData.added = 0; // No added for sent
          insertData.sent = qty; // Sent amount
        } else if (tx === "Received (+)") {
          insertData.quantity = qty; // Positive for received
          insertData.added = qty; // Added amount
          insertData.sent = 0; // No sent for received
        }

        // Remove helper fields
        delete insertData.transaction_type;
        delete insertData.in_office_stock; // This will be calculated by triggers
        delete insertData._prev_in_office_stock; // Remove auto-carry field
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

        // Set month_year from selectedMonth prop or current month
        if (selectedMonth) {
          insertData.month_year = selectedMonth;
        } else {
          insertData.month_year = new Date().toISOString().slice(0, 7);
        }

        // Log the cleaned data for debugging
        console.log("🧹 Daily expenses data after cleaning:", insertData);
        console.log("🔍 Month year set to:", insertData.month_year);
        console.log(
          "🔍 Previous month carryover:",
          insertData.previous_month_overspend
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

      if (moduleType === "book_inventory") {
        // Ensure all grade fields have default values
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

        gradeFields.forEach((field) => {
          if (
            insertData[field] === undefined ||
            insertData[field] === null ||
            insertData[field] === ""
          ) {
            insertData[field] = 0;
          }
        });

        // Ensure total_used_till_now has default value (will be calculated automatically)
        if (
          insertData.total_used_till_now === undefined ||
          insertData.total_used_till_now === null ||
          insertData.total_used_till_now === ""
        ) {
          insertData.total_used_till_now = 0;
        }

        // Handle nullable fields - convert empty strings to null
        if (
          insertData.ordered_from_printer === "" ||
          insertData.ordered_from_printer === undefined
        ) {
          insertData.ordered_from_printer = null;
        }
        if (insertData.received === "" || insertData.received === undefined) {
          insertData.received = null;
        }

        // Log the cleaned data for debugging
        console.log("📚 Book inventory data after cleaning:", insertData);
      }

      if (moduleType === "book_distribution") {
        // Calculate total books distributed across all grades
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
          const value = Number(insertData[grade]) || 0;
          totalDistributed += value;
        });

        insertData.total_used_till_now = totalDistributed;

        // Log the cleaned data for debugging
        console.log("📚 Book distribution data after cleaning:", insertData);
        console.log("📊 Total books distributed:", totalDistributed);
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
        book_inventory: "Book Inventory",
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
        const qty = Math.abs(insertData.quantity ?? 0);
        const action = (insertData.quantity ?? 0) > 0 ? "Added" : "Sent";
        summary = `${action} ${qty} ${
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
      } else if (tableName === "book_inventory") {
        summary = `Book inventory added for ${
          insertData.kit_type || "Unknown"
        } kit (Ordered: ${insertData.ordered_from_printer || 0}, Received: ${
          insertData.received || 0
        })`;
      }

      const { error: activityError } = await supabase
        .from("activity_logs")
        .insert({
          user_id: user.id, // Keep user_id for activity logs to track who made changes
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

      // Handle book distribution post-processing
      if (moduleType === "book_distribution") {
        console.log("🔄 Processing book distribution post-submission...");

        try {
          // Create school record if it doesn't exist
          if (insertData.school_name) {
            console.log("🏫 Checking/creating school:", insertData.school_name);

            const { data: existingSchool } = await (supabase as any)
              .from("schools")
              .select("id")
              .eq("school_name", insertData.school_name)
              .single();

            if (!existingSchool) {
              console.log("🏫 Creating new school record...");
              const { data: newSchool, error: schoolError } = await (
                supabase as any
              )
                .from("schools")
                .insert({
                  school_name: insertData.school_name,
                  address: insertData.address || "",
                })
                .select()
                .single();

              if (schoolError) {
                console.error("❌ Error creating school:", schoolError);
              } else {
                console.log("✅ School created successfully:", newSchool);
                insertData.school_id = newSchool.id;
              }
            } else {
              console.log("✅ School already exists:", existingSchool);
              insertData.school_id = existingSchool.id;

              // Update address if it's different (data integrity)
              if (
                insertData.address &&
                insertData.address !== existingSchool.address
              ) {
                console.log("🔄 Updating school address for data integrity...");
                const { error: updateError } = await (supabase as any)
                  .from("schools")
                  .update({ address: insertData.address })
                  .eq("id", existingSchool.id);

                if (updateError) {
                  console.error(
                    "❌ Error updating school address:",
                    updateError
                  );
                } else {
                  console.log("✅ School address updated for consistency");
                }
              }
            }
          }

          // Create coordinator record if it doesn't exist
          if (insertData.coordinator_name && insertData.school_name) {
            console.log(
              "👤 Checking/creating coordinator:",
              insertData.coordinator_name
            );

            const { data: existingCoordinator } = await (supabase as any)
              .from("coordinators")
              .select("id")
              .eq("coordinator_name", insertData.coordinator_name)
              .single();

            if (!existingCoordinator) {
              console.log("👤 Creating new coordinator record...");

              // Get school ID
              const { data: school } = await (supabase as any)
                .from("schools")
                .select("id")
                .eq("school_name", insertData.school_name)
                .single();

              if (school) {
                const { data: newCoordinator, error: coordinatorError } =
                  await (supabase as any)
                    .from("coordinators")
                    .insert({
                      coordinator_name: insertData.coordinator_name,
                      coordinator_number: insertData.coordinator_number || "",
                      school_id: school.id,
                    })
                    .select()
                    .single();

                if (coordinatorError) {
                  console.error(
                    "❌ Error creating coordinator:",
                    coordinatorError
                  );
                } else {
                  console.log(
                    "✅ Coordinator created successfully:",
                    newCoordinator
                  );
                  insertData.coordinator_id = newCoordinator.id;
                }
              }
            } else {
              console.log(
                "✅ Coordinator already exists:",
                existingCoordinator
              );
              insertData.coordinator_id = existingCoordinator.id;

              // Update coordinator number if it's different (data integrity)
              if (
                insertData.coordinator_number &&
                insertData.coordinator_number !==
                  existingCoordinator.coordinator_number
              ) {
                console.log(
                  "🔄 Updating coordinator number for data integrity..."
                );
                const { error: updateError } = await (supabase as any)
                  .from("coordinators")
                  .update({ coordinator_number: insertData.coordinator_number })
                  .eq("id", existingCoordinator.id);

                if (updateError) {
                  console.error(
                    "❌ Error updating coordinator number:",
                    updateError
                  );
                } else {
                  console.log("✅ Coordinator number updated for consistency");
                }
              }
            }
          }

          // Update book inventory
          if (insertData.kit_name) {
            console.log(
              "🔄 Updating book inventory for kit:",
              insertData.kit_name
            );

            // Get current book inventory data
            const { data: currentInventory, error: fetchError } = await (
              supabase as any
            )
              .from("book_inventory")
              .select("*")
              .eq("kit_name", insertData.kit_name)
              .single();

            if (fetchError) {
              console.error("❌ Error fetching current inventory:", fetchError);
            } else if (currentInventory) {
              // Calculate new total_used_till_now by adding the distributed amount
              const currentUsed =
                Number(currentInventory.total_used_till_now) || 0;
              const newUsed =
                currentUsed + (Number(insertData.total_used_till_now) || 0);

              // Calculate new grade-wise stock (subtract distributed from current stock)
              const gradeUpdates: any = {
                total_used_till_now: newUsed,
              };

              // Update each grade's stock
              const grades = [
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

              grades.forEach((grade) => {
                const currentStock = Number(currentInventory[grade]) || 0;
                const distributed = Number(insertData[grade]) || 0;
                const newStock = currentStock - distributed;

                if (distributed > 0) {
                  gradeUpdates[grade] = newStock;
                  console.log(
                    `📚 ${grade}: ${currentStock} - ${distributed} = ${newStock}`
                  );
                }
              });

              // Update the book inventory
              console.log("🔄 Updating book inventory with new values...");
              console.log("📊 Current used:", currentUsed);
              console.log("📊 Distributed:", insertData.total_used_till_now);
              console.log("📊 New total:", newUsed);
              console.log("📚 Grade updates:", gradeUpdates);

              const { error: updateError } = await (supabase as any)
                .from("book_inventory")
                .update(gradeUpdates)
                .eq("kit_name", insertData.kit_name);

              if (updateError) {
                console.error("❌ Error updating book inventory:", updateError);
              } else {
                console.log("✅ Book inventory updated successfully");
                console.log(
                  `📊 Updated total_used_till_now: ${currentUsed} + ${insertData.total_used_till_now} = ${newUsed}`
                );

                // Verify the update by fetching the updated record
                const { data: updatedInventory } = await (supabase as any)
                  .from("book_inventory")
                  .select("*")
                  .eq("kit_name", insertData.kit_name)
                  .single();

                console.log(
                  "🔍 Verification - Updated inventory:",
                  updatedInventory
                );
              }
            }
          }
        } catch (error) {
          console.error(
            "❌ Error in book distribution post-processing:",
            error
          );
        }
      }

      console.log("🎉 Record creation successful!");
      console.log("🔍 About to close modal and reset form...");

      // Refresh stock data if this was a book distribution
      if (moduleType === "book_distribution" && insertData.kit_name) {
        console.log("🔄 Refreshing stock data for live display...");
        // The stock data will be refreshed when the form is reopened
        // or when the kit is selected again
      }

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
      } else if (moduleType === "book_inventory") {
        setFormData({
          total_used_till_now: 0, // This will be calculated automatically
          grade1: 0,
          grade2: 0,
          grade3: 0,
          grade4: 0,
          grade5: 0,
          grade6: 0,
          grade7: 0,
          grade7iot: 0,
          grade8: 0,
          grade8iot: 0,
          grade9: 0,
          grade9iot: 0,
          grade10: 0,
          grade10iot: 0,
        });
        console.log(
          "🔍 Book inventory form reset with default values for grades"
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

    // Special handling for grade fields in book_distribution
    if (moduleType === "book_distribution" && field.name.startsWith("grade")) {
      const currentStock = formData._current_stock?.[field.name] || 0;
      const inputValue = Number(value) || 0;
      const remainingStock = currentStock - inputValue;

      return (
        <div key={`${moduleType}-${field.name}`} className="space-y-2">
          <Label htmlFor={field.name}>
            {field.label}{" "}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id={field.name}
            type="number"
            value={value}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "" || raw === "-") {
                handleFieldChange(field.name, raw);
              } else {
                handleFieldChange(field.name, Number(raw));
              }
            }}
            required={field.required}
            placeholder="Enter number of books to distribute"
            min="0"
          />
          <div className="text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Current Stock: {currentStock}</span>
              <span
                className={
                  remainingStock < 0
                    ? "text-red-600 font-medium"
                    : "text-green-600"
                }
              >
                Remaining: {remainingStock}
              </span>
            </div>
          </div>
        </div>
      );
    }

    // Special handling for current_balance field in expenses
    let displayValue = value;
    if (field.name === "current_balance" && moduleType === "expenses") {
      // Always show the passed currentBalance prop value with proper formatting
      const balance = currentBalance ?? 0;
      displayValue = `₹${balance.toFixed(2)}`;
    }

    // Special handling for in_office_stock field in blazer
    if (field.name === "in_office_stock" && moduleType === "blazer") {
      displayValue = value || 0;
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
                  Positive adds to fixed amount; negative deducts. Optional,
                  default 0.
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

            {/* Show helpful text for in-office stock field */}
            {field.name === "in_office_stock" && moduleType === "blazer" && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Current stock available for the selected size and gender
                </p>
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
        // Handle special case for kits, games, book_inventory, and book_distribution with "Add New" option
        if (
          (field.name === "item_name" && moduleType === "kits") ||
          (field.name === "game_details" && moduleType === "games") ||
          (field.name === "kit_name" &&
            (moduleType === "book_inventory" ||
              moduleType === "book_distribution")) ||
          (field.name === "school_name" &&
            moduleType === "book_distribution") ||
          (field.name === "coordinator_name" &&
            moduleType === "book_distribution")
        ) {
          const isAddingNew =
            field.name === "item_name"
              ? isAddingNewKit
              : field.name === "game_details"
              ? isAddingNewGame
              : field.name === "kit_name"
              ? isAddingNewBookKit
              : field.name === "school_name"
              ? isAddingNewSchool
              : isAddingNewCoordinator;
          const setIsAddingNew =
            field.name === "item_name"
              ? setIsAddingNewKit
              : field.name === "game_details"
              ? setIsAddingNewGame
              : field.name === "kit_name"
              ? setIsAddingNewBookKit
              : field.name === "school_name"
              ? setIsAddingNewSchool
              : setIsAddingNewCoordinator;
          const existingOptions =
            field.name === "item_name"
              ? kitNames
              : field.name === "game_details"
              ? gameNames
              : field.name === "kit_name"
              ? bookKitNames
              : field.name === "school_name"
              ? schools.map((s) => s.school_name)
              : coordinators.map((c) => c.coordinator_name);

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
                      field.name === "item_name"
                        ? "kit"
                        : field.name === "game_details"
                        ? "game"
                        : field.name === "kit_name"
                        ? "book kit"
                        : field.name === "school_name"
                        ? "school"
                        : "coordinator"
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
                      ➕ Add New{" "}
                      {field.name === "item_name"
                        ? "Kit"
                        : field.name === "game_details"
                        ? "Game"
                        : field.name === "kit_name"
                        ? "Book Kit"
                        : field.name === "school_name"
                        ? "School"
                        : "Coordinator"}
                    </SelectItem>

                    {/* Separator */}
                    {existingOptions.length > 0 && (
                      <div className="px-2 py-1 text-xs text-muted-foreground border-b">
                        Existing{" "}
                        {field.name === "item_name"
                          ? "Kits"
                          : field.name === "game_details"
                          ? "Games"
                          : field.name === "kit_name"
                          ? "Book Kits"
                          : field.name === "school_name"
                          ? "Schools"
                          : "Coordinators"}
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
                        {field.name === "item_name"
                          ? "kits"
                          : field.name === "game_details"
                          ? "games"
                          : field.name === "kit_name"
                          ? "book kits"
                          : field.name === "school_name"
                          ? "schools"
                          : "coordinators"}{" "}
                        found
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
