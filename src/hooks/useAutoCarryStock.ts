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
  },
  games_inventory: {
    stockFields: ["previous_stock"],
  },
  blazer_inventory: {
    stockFields: ["quantity", "in_office_stock"],
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

  const shouldAutoCarry = useCallback(
    (fieldName: string): boolean => {
      const mapping = STOCK_FIELD_MAPPINGS[tableName];
      if (!mapping) return false;

      return mapping.stockFields.includes(fieldName);
    },
    [tableName]
  );

  const getAutoCarryValue = (fieldName: string): any => {
    return autoCarryValues[fieldName];
  };

  const canEditField = (fieldName: string): boolean => {
    // For now, allow editing of all fields
    // In the future, you could implement logic to prevent editing of auto-carried fields
    return true;
  };

  const inFlightRef = useRef(false);
  const lastKeyRef = useRef<string | null>(null);

  const identifierField = useMemo(() => {
    return STOCK_FIELD_MAPPINGS[tableName]?.identifierField;
  }, [tableName]);

  const identifierValue = useMemo(() => {
    return identifierField ? formData[identifierField] : undefined;
  }, [identifierField, formData]);

  const genderValue = useMemo(() => {
    return tableName === "blazer_inventory" ? formData.gender : undefined;
  }, [tableName, formData]);

  const fetchPreviousStock = useCallback(
    async (idValue: any, gender: any) => {
      if (!tableName) return;

      const mapping = STOCK_FIELD_MAPPINGS[tableName];
      if (!mapping) {
        setAutoCarryValues({});
        return;
      }

      try {
        // First try to get from the stock table
        if (mapping.stockTable) {
          let stockQuery = (supabase as any)
            .from(mapping.stockTable)
            .select("*");

          if (mapping.identifierField && idValue) {
            stockQuery = stockQuery.eq(mapping.identifierField, idValue);
          }

          if (tableName === "blazer_inventory" && gender) {
            stockQuery = stockQuery.eq("gender", gender);
          }

          const { data: stockData, error: stockError } = await stockQuery
            .order("updated_at", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(1);

          if (stockError) throw stockError;

          if (stockData && stockData.length > 0) {
            const latestStock = stockData[0];
            const newAutoCarryValues: Record<string, any> = {};

            mapping.stockFields.forEach((field) => {
              if (
                latestStock[field] !== undefined &&
                latestStock[field] !== null
              ) {
                newAutoCarryValues[field] = latestStock[field];
              }
            });

            setAutoCarryValues(newAutoCarryValues);
            return;
          }
        }

        // Fallback: get from the main table
        let query = (supabase as any).from(tableName).select("*");

        if (mapping.identifierField && idValue) {
          query = query.eq(mapping.identifierField, idValue);
        }

        if (tableName === "blazer_inventory" && gender) {
          query = query.eq("gender", gender);
        }

        const { data: tableData, error: tableError } = await query
          .order("updated_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1);

        if (tableError) throw tableError;

        if (tableData && tableData.length > 0) {
          const latestRecord = tableData[0];
          const newAutoCarryValues: Record<string, any> = {};

          mapping.stockFields.forEach((field) => {
            if (
              latestRecord[field] !== undefined &&
              latestRecord[field] !== null
            ) {
              newAutoCarryValues[field] = latestRecord[field];
            }
          });

          setAutoCarryValues(newAutoCarryValues);
        } else {
          setAutoCarryValues({});
        }
      } catch (error) {
        console.error("Error fetching previous stock:", error);
        setAutoCarryValues({});
      }
    },
    [tableName]
  );

  // Trigger fetch only when key inputs change (avoid spamming on every keystroke)
  useEffect(() => {
    if (!tableName) return;
    const key = JSON.stringify({ tableName, identifierValue, genderValue });
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    fetchPreviousStock(identifierValue, genderValue).finally(() => {
      inFlightRef.current = false;
    });
  }, [tableName, identifierValue, genderValue, fetchPreviousStock]);

  return {
    autoCarryValues,
    shouldAutoCarry,
    getAutoCarryValue,
    canEditField,
    isLoading,
  };
}
