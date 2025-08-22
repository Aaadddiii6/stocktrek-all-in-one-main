// keep all your imports the same...
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { toast } from "sonner";

interface AddBlazerRecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddBlazerRecordModal: React.FC<AddBlazerRecordModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { logSuccess, logError } = useActivityLogger();
  const [formData, setFormData] = useState({
    gender: "",
    size: "",
    quantity: 0,
    in_office_stock: 0,
    remarks: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const femaleS = ["F-XS", "F-S", "F-M", "F-L", "F-XL", "F-XXL"];
  const maleSizes = [
    "M-36",
    "M-38",
    "M-40",
    "M-42",
    "M-44",
    "M-46",
    "M-48",
    "M-50",
  ];

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setFormData({
        gender: "",
        size: "",
        quantity: 0,
        in_office_stock: 0,
        remarks: "",
      });
    }
  }, [open]);

  const getAvailableSizes = () => {
    return formData.gender === "Female"
      ? femaleS
      : formData.gender === "Male"
      ? maleSizes
      : [];
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleGenderChange = (value: string) => {
    console.log("Gender selected:", value);
    setFormData((prev) => ({
      ...prev,
      gender: value,
      size: "", // Reset size when gender changes
    }));
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!formData.gender) {
      toast.error("Gender is required");
      return;
    }
    if (!formData.size) {
      toast.error("Size is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: insertedData, error } = await supabase
        .from("blazer_inventory")
        .insert({
          gender: formData.gender,
          size: formData.size as any,
          quantity: formData.quantity,
          in_office_stock: formData.in_office_stock,
          remarks: formData.remarks || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        await logError("blazer_inventory", "INSERT", error, formData);
        throw error;
      }

      await logSuccess(
        "blazer_inventory",
        "INSERT",
        formData,
        insertedData?.id
      );
      toast.success("Blazer record added successfully");

      onOpenChange(false);
      setFormData({
        gender: "",
        size: "",
        quantity: 0,
        in_office_stock: 0,
        remarks: "",
      });
      onSuccess();
    } catch (err: any) {
      let userMessage = `Error: ${
        err.message || "Failed to add blazer record"
      }`;
      if (err.code === "42501")
        userMessage = "Permission denied. Please contact an administrator.";
      if (err.code === "23505")
        userMessage =
          "This record already exists. Please check for duplicates.";
      toast.error(userMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Blazer Record</DialogTitle>
          <DialogDescription>
            Add a new blazer inventory record by size.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Gender <span className="text-destructive">*</span>
              </Label>

              {/* Use buttons instead of Select component */}
              <div className="flex gap-2 p-2 border-2 border-red-500 bg-yellow-100">
                <Button
                  type="button"
                  variant={formData.gender === "Male" ? "default" : "outline"}
                  onClick={() => handleGenderChange("Male")}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Male
                </Button>
                <Button
                  type="button"
                  variant={formData.gender === "Female" ? "default" : "outline"}
                  onClick={() => handleGenderChange("Female")}
                  className="flex-1 bg-pink-500 hover:bg-pink-600 text-white"
                >
                  Female
                </Button>
              </div>

              {/* Show selected value for debugging */}
              <div className="text-xs text-muted-foreground">
                Selected: {formData.gender || "None"}
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Size <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.size}
                onValueChange={(value) => handleFieldChange("size", value)}
                disabled={!formData.gender}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      formData.gender ? "Select size" : "Select gender first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSizes().map((size) => (
                    <SelectItem key={size} value={size}>
                      {size.replace("F-", "").replace("M-", "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Show available sizes for debugging */}
              <div className="text-xs text-muted-foreground">
                Available: {getAvailableSizes().length} options
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantity <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  handleFieldChange("quantity", Number(e.target.value))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="in_office_stock">In Office Stock</Label>
              <Input
                id="in_office_stock"
                type="number"
                value={formData.in_office_stock}
                onChange={(e) =>
                  handleFieldChange("in_office_stock", Number(e.target.value))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => handleFieldChange("remarks", e.target.value)}
              placeholder="Add any additional notes..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Blazer Record"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddBlazerRecordModal;
