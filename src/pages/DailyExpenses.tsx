import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModuleActivityLogs } from "@/components/ModuleActivityLogs";
import { AddRecordModal } from "@/components/AddRecordModal";
import { DailyExpensesTable } from "@/components/DailyExpensesTable";
import { DollarSign, Plus, TrendingUp, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

export default function DailyExpenses() {
  const { user } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalExpenses: 0,
    monthlyExpenses: 0,
    averageDaily: 0,
    fixedAmount: 0,
    remainingBalance: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchExpenseStats = async () => {
    try {
      setLoading(true);

      // Get current month
      const currentMonth = new Date().toISOString().slice(0, 7);
      console.log("🔍 Fetching stats for month:", currentMonth);

      // Also try to fetch all records to see what month_year values exist
      const { data: allRecords, error: allRecordsError } = await supabase
        .from("daily_expenses")
        .select("month_year, date, fixed_amount, expenses")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!allRecordsError && allRecords) {
        console.log(
          "🔍 All records month_year values:",
          allRecords.map((r) => ({
            month_year: r.month_year,
            date: r.date,
            fixed_amount: r.fixed_amount,
            expenses: r.expenses,
          }))
        );
      }

      // Fetch current month's expense records
      let currentMonthExpenses = null;
      let monthError = null;

      // Try to fetch by month_year first
      const { data: monthYearData, error: monthYearError } = await supabase
        .from("daily_expenses")
        .select("*")
        .eq("month_year", currentMonth);

      if (monthYearError) {
        console.log("❌ Month year query failed, trying date-based filtering");
        monthError = monthYearError;
      } else if (monthYearData && monthYearData.length > 0) {
        currentMonthExpenses = monthYearData;
        console.log("✅ Found records by month_year:", monthYearData.length);
      } else {
        console.log(
          "⚠️ No records found by month_year, trying date-based filtering"
        );
      }

      // Fallback: If month_year filtering didn't work, use date-based filtering
      if (!currentMonthExpenses || currentMonthExpenses.length === 0) {
        const currentDate = new Date();
        const startOfMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1
        );
        const endOfMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0
        );

        const { data: dateFilteredData, error: dateFilterError } =
          await supabase
            .from("daily_expenses")
            .select("*")
            .gte("date", startOfMonth.toISOString().split("T")[0])
            .lte("date", endOfMonth.toISOString().split("T")[0]);

        if (dateFilterError) {
          console.log("❌ Date-based filtering also failed:", dateFilterError);
          monthError = dateFilterError;
        } else {
          currentMonthExpenses = dateFilteredData;
          console.log(
            "✅ Found records by date filtering:",
            dateFilteredData?.length || 0
          );
        }
      }

      console.log("🔍 Final month query result:", {
        currentMonth,
        queryResult: currentMonthExpenses,
        error: monthError,
        recordCount: currentMonthExpenses?.length || 0,
      });

      if (monthError) throw monthError;

      // Fetch all expenses for total calculation
      const { data: allExpenses, error: allError } = await supabase
        .from("daily_expenses")
        .select("*")
        .order("created_at", { ascending: false });

      if (allError) throw allError;

      if (currentMonthExpenses && currentMonthExpenses.length > 0) {
        // Calculate current month totals
        const totalFixedAmountThisMonth = currentMonthExpenses
          .filter((expense) => expense.fixed_amount && expense.fixed_amount > 0)
          .reduce((sum, expense) => sum + Number(expense.fixed_amount), 0);

        const totalExpensesThisMonth = currentMonthExpenses.reduce(
          (sum, expense) => sum + Number(expense.expenses),
          0
        );

        // Get previous month carryover from the first record
        const previousMonthCarryover =
          currentMonthExpenses[0]?.previous_month_overspend || 0;

        // Calculate adjusted fixed amount and balance
        const adjustedFixedAmount =
          totalFixedAmountThisMonth - previousMonthCarryover;
        const remainingBalance = adjustedFixedAmount - totalExpensesThisMonth;

        console.log("🔍 Raw data for calculation:", {
          allRecords: currentMonthExpenses.map((e) => ({
            id: e.id,
            date: e.date,
            fixed_amount: e.fixed_amount,
            expenses: e.expenses,
            previous_month_overspend: e.previous_month_overspend,
          })),
        });

        console.log("🔍 Detailed calculation:", {
          records: currentMonthExpenses.map((e) => ({
            fixed_amount: e.fixed_amount,
            expenses: e.expenses,
            previous_month_overspend: e.previous_month_overspend,
          })),
          totalFixedAmountThisMonth,
          totalExpensesThisMonth,
          previousMonthCarryover,
          adjustedFixedAmount,
          remainingBalance,
        });

        // Calculate total expenses (all time)
        const totalExpenses = allExpenses.reduce(
          (sum, expense) => sum + Number(expense.expenses),
          0
        );

        // Calculate average daily (based on days with expenses)
        const uniqueDays = new Set(allExpenses.map((expense) => expense.date))
          .size;
        const averageDaily = uniqueDays > 0 ? totalExpenses / uniqueDays : 0;

        console.log("🔍 Stats calculated:", {
          totalFixedAmountThisMonth,
          totalExpensesThisMonth,
          previousMonthCarryover,
          adjustedFixedAmount,
          remainingBalance,
        });

        setStats({
          totalExpenses,
          monthlyExpenses: totalExpensesThisMonth,
          averageDaily,
          fixedAmount: totalFixedAmountThisMonth,
          remainingBalance,
        });
      } else {
        // No current month data
        setStats({
          totalExpenses: 0,
          monthlyExpenses: 0,
          averageDaily: 0,
          fixedAmount: 0,
          remainingBalance: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching expense stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Enable real-time refresh for daily expenses
  useRealtimeRefresh({
    table: "daily_expenses",
    onRefresh: fetchExpenseStats,
    enabled: !!user,
  });

  useEffect(() => {
    if (user) {
      fetchExpenseStats();
    }
  }, [user]);

  const handleSuccessfulAdd = () => {
    fetchExpenseStats();
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Daily Expenses
            </h1>
            <p className="text-muted-foreground">
              Track daily operational expenses
            </p>
          </div>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Expense Record
          </Button>
        </div>

        {/* Balance Sheet Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Fixed Amount
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {loading ? "-" : `₹${stats.fixedAmount.toFixed(2)}`}
              </div>
              <p className="text-xs text-muted-foreground">
                This month's allocation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Expenses
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {loading ? "-" : `₹${stats.monthlyExpenses.toFixed(2)}`}
              </div>
              <p className="text-xs text-muted-foreground">
                Current month total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Remaining Balance
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  stats.remainingBalance < 0
                    ? "text-destructive"
                    : "text-green-600"
                }`}
              >
                {loading ? "-" : `₹${stats.remainingBalance.toFixed(2)}`}
              </div>
              <p className="text-xs text-muted-foreground">Available budget</p>
            </CardContent>
          </Card>
        </div>

        {/* Expense Table */}
        <DailyExpensesTable onDataChange={handleSuccessfulAdd} />

        {/* Activity Logs */}
        <ModuleActivityLogs
          moduleType="daily_expenses"
          moduleName="Daily Expenses"
        />
      </div>

      {/* Add Record Modal */}
      <AddRecordModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={handleSuccessfulAdd}
        defaultModuleType="expenses"
      />
    </>
  );
}
