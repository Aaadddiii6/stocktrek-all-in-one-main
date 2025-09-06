import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Stock field mappings for different tables
const STOCK_FIELD_MAPPINGS: Record<
  string,
  {
    stockTable?: string;
    identifierField?: string;
    stockFields: string[];
  }
> = {
  kits_inventory: {
    stockFields: ["opening_balance"],
    identifierField: "item_name",
  },
  games_inventory: {
    stockFields: ["previous_stock"],
    identifierField: "item_name",
  },
  blazer_inventory: {
    stockFields: ["quantity", "in_office_stock"],
  },
  daily_expenses: {
    stockFields: ["fixed_amount"],
    identifierField: "expense_category",
  },
};

export function useAutoCarryStock(
  tableName: string,
  formData: Record<string, any>
) {
  const [autoCarryValues, setAutoCarryValues] = useState<Record<string, any>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  const latestKeyRef = useRef<string | null>(null);

  // 🚀 THE COMPLETE SOLUTION: Create a single, stable trigger value
  const triggerValue = useMemo(() => {
    if (tableName === "blazer_inventory") {
      return formData?.gender && formData?.size
        ? `${formData.gender}-${formData.size}`
        : null;
    } else if (
      tableName === "kits_inventory" ||
      tableName === "games_inventory"
    ) {
      return tableName === "kits_inventory"
        ? formData?.item_name || null
        : formData?.game_details || null;
    } else if (tableName === "daily_expenses") {
      return formData?.expense_category || null;
    }
    return null;
  }, [
    tableName,
    formData?.gender,
    formData?.size,
    formData?.item_name,
    formData?.game_details,
    formData?.expense_category,
  ]);

  const shouldAutoCarry = useCallback(
    (fieldName: string): boolean => {
      if (!tableName) return false;

      const mapping = STOCK_FIELD_MAPPINGS[tableName];
      if (!mapping) return false;

      if (tableName === "blazer_inventory") {
        return (
          formData.gender && formData.size && fieldName === "in_office_stock"
        );
      } else if (tableName === "kits_inventory") {
        return formData.item_name && fieldName === "opening_balance";
      } else if (tableName === "games_inventory") {
        return formData.game_details && fieldName === "previous_stock";
      } else if (tableName === "daily_expenses") {
        return formData.expense_category && fieldName === "fixed_amount";
      }

      return mapping.stockFields.includes(fieldName);
    },
    [tableName, formData]
  );

  const getAutoCarryValue = useCallback(
    (fieldName: string): any => {
      return autoCarryValues[fieldName];
    },
    [autoCarryValues]
  );

  const canEditField = useCallback(
    (fieldName: string): boolean => {
      if (!tableName) return false;

      const mapping = STOCK_FIELD_MAPPINGS[tableName];
      if (!mapping) return false;

      if (tableName === "blazer_inventory") {
        return (
          formData.gender && formData.size && fieldName === "in_office_stock"
        );
      } else if (tableName === "kits_inventory") {
        return formData.item_name && fieldName === "opening_balance";
      } else if (tableName === "games_inventory") {
        return formData.game_details && fieldName === "previous_stock";
      } else if (tableName === "daily_expenses") {
        return formData.expense_category && fieldName === "fixed_amount";
      }

      return mapping.stockFields.includes(fieldName);
    },
    [tableName, formData]
  );

  const sizeValue = useMemo(() => {
    return formData?.size || null;
  }, [formData?.size]);

  const fetchPreviousStock = useCallback(
    async (
      tableName: string,
      formData: Record<string, any>,
      triggerValue: string | null,
      requestKey: string
    ) => {
      latestKeyRef.current = requestKey;
      console.log("🚀 fetchPreviousStock STARTED:", {
        tableName,
        formData,
        triggerValue,
      });

      try {
        const mapping = STOCK_FIELD_MAPPINGS[tableName];
        if (!mapping) {
          console.log("❌ No mapping found for table:", tableName);
          return;
        }

        console.log("✅ Mapping found:", mapping);

        let latestRecord: any = null;
        const newAutoCarryValues: Record<string, any> = {};

        if (tableName === "blazer_inventory") {
          // Validate required fields before querying
          if (!formData.gender || !formData.size) {
            console.log("🔍 Skipping blazer query - missing required fields:", {
              gender: formData.gender,
              size: formData.size,
            });
            return;
          }

          // For blazer inventory, get the latest record for the same gender and size
          console.log("🔍 Fetching blazer inventory data for:", {
            gender: formData.gender,
            size: formData.size,
          });

          const { data, error } = await supabase
            .from(tableName as any)
            .select("*")
            .eq("gender", formData.gender)
            .eq("size", formData.size)
            .order("created_at", { ascending: false })
            .limit(1);

          if (error) {
            console.error("❌ Supabase error:", error);
            throw error;
          }

          latestRecord = data?.[0];
          console.log("🔍 Latest blazer record found:", latestRecord);

          if (latestRecord) {
            const previousOfficeStock = latestRecord.in_office_stock || 0;
            // For blazer, auto-carry the PREVIOUS stock snapshot.
            // The form will compute the new post-entry stock based on quantity and transaction type.
            // Set in_office_stock to previous stock for new records
            newAutoCarryValues.in_office_stock = Math.max(
              0,
              previousOfficeStock
            );
            newAutoCarryValues._prev_in_office_stock = Math.max(
              0,
              previousOfficeStock
            );
            newAutoCarryValues.quantity = 0; // Reset quantity for new record

            console.log("🔍 Auto-carry values calculated:", {
              previousOfficeStock,
              newOfficeStock: newAutoCarryValues.in_office_stock,
            });
          } else {
            console.log(
              "🔍 No previous blazer record found for this gender/size combination"
            );
          }
        } else if (tableName === "kits_inventory") {
          // Validate required fields before querying
          if (!formData.item_name) {
            console.log(
              "🔍 Skipping kits query - missing item_name:",
              formData.item_name
            );
            return;
          }

          // For kits inventory, get the latest record for the same item_name
          console.log(
            "🔍 Fetching kits inventory data for item:",
            formData.item_name
          );

          const { data, error } = await supabase
            .from(tableName as any)
            .select("*")
            .eq("item_name", formData.item_name)
            .order("created_at", { ascending: false })
            .limit(1);

          if (error) {
            console.error("❌ Supabase error:", error);
            throw error;
          }

          latestRecord = data?.[0];
          console.log("🔍 Latest kits record found:", latestRecord);

          if (latestRecord) {
            // Auto-carry the closing_balance as opening_balance for the new record
            newAutoCarryValues.opening_balance =
              latestRecord.closing_balance || 0;
            newAutoCarryValues.addins = 0; // Reset for new record
            newAutoCarryValues.takeouts = 0; // Reset for new record

            console.log("🔍 Auto-carry values calculated:", newAutoCarryValues);
          } else {
            console.log("🔍 No previous kits record found for this item");
          }
        } else if (tableName === "games_inventory") {
          // Validate required fields before querying
          if (!formData.game_details) {
            console.log(
              "🔍 Skipping games query - missing game_details:",
              formData.game_details
            );
            return;
          }

          // For games inventory, get the latest record for the same game_details
          console.log(
            "🔍 Fetching games inventory data for item:",
            formData.game_details
          );

          const { data, error } = await supabase
            .from(tableName as any)
            .select("*")
            .eq("game_details", formData.game_details)
            .order("created_at", { ascending: false })
            .limit(1);

          if (error) {
            console.error("❌ Supabase error:", error);
            throw error;
          }

          latestRecord = data?.[0];
          console.log("🔍 Latest games record found:", latestRecord);

          if (latestRecord) {
            // Calculate the previous stock based on the latest record
            const previousStock = latestRecord.previous_stock || 0;
            const adding = latestRecord.adding || 0;
            const sent = latestRecord.sent || 0;
            const calculatedStock = previousStock + adding - sent;

            newAutoCarryValues.previous_stock = calculatedStock;
            newAutoCarryValues.addins = 0; // Reset for new record
            newAutoCarryValues.sent = 0; // Reset for new record

            console.log("🔍 Auto-carry values calculated:", newAutoCarryValues);
          } else {
            console.log("🔍 No previous games record found for this item");
          }
        } else if (tableName === "daily_expenses") {
          // Validate required fields before querying
          if (!formData.expense_category) {
            console.log(
              "🔍 Skipping expenses query - missing expense_category:",
              formData.expense_category
            );
            return;
          }

          // For daily expenses, get the latest record for the same expense_category
          console.log(
            "🔍 Fetching daily expenses data for category:",
            formData.expense_category
          );

          const { data, error } = await supabase
            .from(tableName as any)
            .select("*")
            .eq("expense_category", formData.expense_category)
            .order("created_at", { ascending: false })
            .limit(1);

          if (error) {
            console.error("❌ Supabase error:", error);
            throw error;
          }

          latestRecord = data?.[0];
          console.log("🔍 Latest expenses record found:", latestRecord);

          if (latestRecord) {
            // Auto-carry the remaining_balance as fixed_amount for the new record
            newAutoCarryValues.fixed_amount =
              latestRecord.remaining_balance || 0;
            newAutoCarryValues.expense_amount = 0; // Reset for new record

            console.log("🔍 Auto-carry values calculated:", newAutoCarryValues);
          } else {
            console.log(
              "🔍 No previous expenses record found for this category"
            );
          }
        }

        console.log("🎯 Final auto-carry values to set:", newAutoCarryValues);

        // Filter out fields that should preserve user input
        const fieldsToPreserve = [
          "item_name",
          "expense_category",
          "in_office_stock", // Preserve in-office stock when it's been set by user selection
          "gender",
          "size",
        ];
        const filteredAutoCarryValues = Object.keys(newAutoCarryValues).reduce(
          (acc, key) => {
            if (!fieldsToPreserve.includes(key)) {
              acc[key] = newAutoCarryValues[key];
            } else {
              console.log(`🔄 Skipping auto-carry for preserved field: ${key}`);
            }
            return acc;
          },
          {} as Record<string, any>
        );

        if (Object.keys(filteredAutoCarryValues).length > 0) {
          // Last-wins: only apply if this is for the latest key
          if (latestKeyRef.current === requestKey) {
            setAutoCarryValues(filteredAutoCarryValues);
            console.log(
              "✅ Auto-carry values set successfully:",
              filteredAutoCarryValues
            );
          } else {
            console.log(
              "⏭️ Skipping stale auto-carry result for key",
              requestKey
            );
          }
        } else {
          console.log("ℹ️ No auto-carry values to set after filtering");
        }
      } catch (error) {
        console.error("❌ Error in fetchPreviousStock:", error);
      } finally {
        console.log("🏁 fetchPreviousStock COMPLETED");
        isProcessingRef.current = false;
      }
    },
    [tableName] // ✅ THE FIX: Only depend on tableName, not empty array
  );

  // 🚀 THE COMPLETE SOLUTION: Use stable identifiers to prevent unnecessary re-runs
  useEffect(() => {
    if (!tableName || !triggerValue || isProcessingRef.current) return;

    console.log("🔍 useAutoCarryStock useEffect - triggerValue:", triggerValue);
    console.log("🔍 useAutoCarryStock useEffect - tableName:", tableName);

    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce for all modules so rapid gender/size changes don't race
    const requestKey = `${tableName}:${triggerValue}:${Date.now()}`;
    console.log("🔍 Debouncing auto-carry for", tableName, "(250ms delay)");
    debounceTimeoutRef.current = setTimeout(() => {
      console.log("🔍 Triggering auto-carry fetch (debounced)");
      fetchPreviousStock(tableName, formData, triggerValue, requestKey);
    }, 250);

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [
    tableName,
    triggerValue, // 🎯 Only this dependency changes when field values actually change
    fetchPreviousStock,
  ]); // Removed formData dependency to prevent loops

  return {
    autoCarryValues,
    shouldAutoCarry,
    getAutoCarryValue,
    canEditField,
    isLoading,
  };
}
