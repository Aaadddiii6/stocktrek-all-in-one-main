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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { toast } from "sonner";

interface AddExpenseRecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddExpenseRecordModal({
  open,
  onOpenChange,
  onSuccess,
}: AddExpenseRecordModalProps) {
  const { user } = useAuth();
  const { logSuccess, logError } = useActivityLogger();
  const [formData, setFormData] = useState({
    date: "",
    expenses: 0,
    fixed_amount: 0,
    remarks: "",
  });
  const [currentFixedAmount, setCurrentFixedAmount] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [isEditingFixedAmount, setIsEditingFixedAmount] = useState(true); // Always allow editing
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCurrentFixedAmount();
    }
  }, [open]);

  const fetchCurrentFixedAmount = async () => {
    try {
      // Fetch the most recent fixed amount and calculate total expenses
      const { data: expenseData, error } = await supabase
        .from("daily_expenses")
        .select("fixed_amount, expenses")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (expenseData && expenseData.length > 0) {
        const latestFixedAmount = expenseData[0].fixed_amount || 0;
        const totalExpensesSum = expenseData.reduce(
          (sum, expense) => sum + Number(expense.expenses),
          0
        );

        setCurrentFixedAmount(latestFixedAmount);
        setTotalExpenses(totalExpensesSum);
        setFormData((prev) => ({ ...prev, fixed_amount: latestFixedAmount }));
      }
    } catch (error) {
      console.error("Error fetching fixed amount:", error);
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    // Validate required fields
    if (
      !formData.date ||
      formData.expenses === undefined ||
      formData.expenses === null
    ) {
      toast.error("Date and expenses are required");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: insertedData, error } = await supabase
        .from("daily_expenses")
        .insert({
          date: formData.date,
          expenses: formData.expenses,
          fixed_amount: formData.fixed_amount,
          remarks: formData.remarks,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase error:", error);
        await logError("daily_expenses", "INSERT", error, formData);
        throw error;
      }

      await logSuccess("daily_expenses", "INSERT", formData, insertedData?.id);
      toast.success("Expense record added successfully");

      onOpenChange(false);
      setFormData({
        date: "",
        expenses: 0,
        fixed_amount: currentFixedAmount,
        remarks: "",
      });
      setIsEditingFixedAmount(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error adding expense record:", error);
      const errorMessage = error?.message || "Failed to add expense record";
      const errorCode = error?.code;

      // Enhanced error messaging
      let userMessage = `Error: ${errorMessage}`;
      if (errorCode === "42501") {
        userMessage =
          "Permission denied. Please check your user role or contact an administrator.";
      } else if (errorCode === "23505") {
        userMessage =
          "This record already exists. Please check for duplicates.";
      } else if (errorCode === "PGRST116") {
        userMessage = "Database connection error. Please try again.";
      }

      toast.error(userMessage);
      await logError("daily_expenses", "INSERT", error, formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Expense Record</DialogTitle>
          <DialogDescription>
            Add a new daily expense record. Fixed amount can only be updated
            when additional funds are received.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Date <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date
                      ? format(new Date(formData.date), "PPP")
                      : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      formData.date ? new Date(formData.date) : undefined
                    }
                    onSelect={(date) =>
                      handleFieldChange(
                        "date",
                        date?.toISOString().split("T")[0]
                      )
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenses">
                Expenses <span className="text-destructive">*</span>
              </Label>
              <Input
                id="expenses"
                type="number"
                value={formData.expenses}
                onChange={(e) =>
                  handleFieldChange("expenses", Number(e.target.value))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fixed_amount" className="flex items-center gap-2">
                Fixed Amount
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingFixedAmount(!isEditingFixedAmount)}
                  className="h-6 w-6 p-0"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </Label>
              <Input
                id="fixed_amount"
                type="number"
                value={formData.fixed_amount}
                onChange={(e) =>
                  handleFieldChange("fixed_amount", Number(e.target.value))
                }
                disabled={false}
                className=""
              />
              <p className="text-xs text-muted-foreground">
                Fixed amount is editable - update when additional funds are
                received
              </p>
            </div>

            <div className="space-y-2">
              <Label>Remaining Balance (Global)</Label>
              <Input
                value={`₹${(
                  formData.fixed_amount +
                  (totalExpenses + formData.expenses)
                ).toFixed(2)}`}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Fixed Amount + (Total Expenses + Current Expense)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Input
              id="remarks"
              value={formData.remarks}
              onChange={(e) => handleFieldChange("remarks", e.target.value)}
              placeholder="Describe the expense..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Expense Record"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
