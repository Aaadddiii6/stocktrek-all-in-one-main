import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ModuleField, useDependentOptions } from "@/hooks/useModuleConfig";

interface DynamicFieldProps {
  field: ModuleField;
  value: any;
  onChange: (value: any) => void;
  dependentValues?: Record<string, any>;
  disabled?: boolean;
}

export function DynamicField({
  field,
  value,
  onChange,
  dependentValues = {},
  disabled = false,
}: DynamicFieldProps) {
  const [date, setDate] = useState<Date | undefined>(() => {
    if (field.field_type === "date" && value) {
      const parsedDate = new Date(value);
      return isNaN(parsedDate.getTime()) ? undefined : parsedDate;
    }
    return undefined;
  });

  // Get dependent options if this field depends on another
  const parentValue =
    field.field_name === "size" ? dependentValues.gender : null;
  const { data: dependentOptions } = useDependentOptions(
    parentValue,
    field.field_name
  );

  const getOptions = () => {
    if (dependentOptions && dependentOptions.length > 0) {
      return dependentOptions;
    }
    return field.option_sets?.[0]?.option_values || [];
  };

  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate);
    if (newDate) {
      // Create a date in local timezone to avoid timezone shifts
      const localDate = new Date(
        newDate.getFullYear(),
        newDate.getMonth(),
        newDate.getDate()
      );
      onChange(format(localDate, "yyyy-MM-dd"));
    } else {
      onChange("");
    }
  };

  const renderField = () => {
    switch (field.field_type) {
      case "text":
      case "email":
      case "phone":
      case "url":
        return (
          <Input
            id={field.field_name}
            name={field.field_name}
            type={
              field.field_type === "email"
                ? "email"
                : field.field_type === "phone"
                ? "tel"
                : field.field_type === "url"
                ? "url"
                : "text"
            }
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ""}
            disabled={disabled}
          />
        );

      case "number":
        return (
          <Input
            id={field.field_name}
            name={field.field_name}
            type="number"
            value={value || ""}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            placeholder={field.placeholder || ""}
            disabled={disabled}
          />
        );

      case "decimal":
        return (
          <Input
            id={field.field_name}
            name={field.field_name}
            type="number"
            step="0.01"
            value={value || ""}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            placeholder={field.placeholder || ""}
            disabled={disabled}
          />
        );

      case "textarea": {
        return (
          <Textarea
            id={field.field_name}
            name={field.field_name}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ""}
            disabled={disabled}
          />
        );
      }

      case "boolean": {
        return (
          <Checkbox
            id={field.field_name}
            name={field.field_name}
            checked={value || false}
            onCheckedChange={onChange}
            disabled={disabled}
          />
        );
      }

      case "date": {
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id={field.field_name}
                name={field.field_name}
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
                disabled={disabled}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date && !isNaN(date.getTime()) ? (
                  format(date, "PPP")
                ) : (
                  <span>{field.placeholder || "Pick a date"}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateChange}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        );
      }

      case "select": {
        const options = getOptions();

        // Debug logging for gender field
        if (field.field_name === "gender") {
          console.log("🔍 Gender field debug:", {
            fieldName: field.field_name,
            currentValue: value,
            options: options,
            onChange: onChange,
          });
        }

        return (
          <Select
            key={`${field.field_name}-${value}`}
            value={value || ""}
            onValueChange={(newValue) => {
              console.log(
                `🔄 ${field.field_name} changed from "${value}" to "${newValue}"`
              );
              onChange(newValue);
            }}
          >
            <SelectTrigger id={field.field_name} name={field.field_name}>
              <SelectValue placeholder={`Select ${field.display_name}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option: any) => (
                <SelectItem
                  key={option.value || option}
                  value={option.value || option}
                >
                  {option.display_value || option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case "multiselect": {
        const options = getOptions();
        const currentValues = Array.isArray(value) ? value : [];

        const handleMultiSelectChange = (
          optionValue: string,
          checked: boolean
        ) => {
          if (checked) {
            onChange([...currentValues, optionValue]);
          } else {
            onChange(currentValues.filter((v) => v !== optionValue));
          }
        };

        return (
          <div className="space-y-2">
            {options.map((option: any) => {
              const optionValue = option.value || option;
              const isChecked = currentValues.includes(optionValue);

              return (
                <div key={optionValue} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.field_name}-${optionValue}`}
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      handleMultiSelectChange(optionValue, checked as boolean)
                    }
                    disabled={disabled}
                  />
                  <Label htmlFor={`${field.field_name}-${optionValue}`}>
                    {option.display_value || option}
                  </Label>
                </div>
              );
            })}
          </div>
        );
      }

      default: {
        return (
          <Input
            id={field.field_name}
            name={field.field_name}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ""}
            disabled={disabled}
          />
        );
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={field.field_name}>
        {field.display_name}
        {field.is_required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {renderField()}
      {field.help_text && (
        <p className="text-sm text-muted-foreground">{field.help_text}</p>
      )}
    </div>
  );
}
