import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModuleActivityLogs } from "@/components/ModuleActivityLogs";
import { AddRecordModal } from "@/components/AddRecordModal";
import { DailyExpensesTable } from "@/components/DailyExpensesTable";
import {
  DollarSign,
  Plus,
  TrendingUp,
  Calculator,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

export default function DailyExpenses() {
  const { user } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [availableMonths, setAvailableMonths] = useState<
    Array<{ month_year: string; display_name: string }>
  >([]);
  const [stats, setStats] = useState({
    totalExpenses: 0,
    monthlyExpenses: 0,
    averageDaily: 0,
    fixedAmount: 0,
    remainingBalance: 0,
    previousMonthCarryover: 0,
    entryCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchAvailableMonths = async () => {
    try {
      // Try to use the RPC function first (if migration is applied)
      let monthsData = [];
      try {
        const { data, error } = await supabase.rpc("get_available_months", {
          target_user_id: null, // Company balance sheet - no user filtering
        });

        if (!error && data) {
          monthsData = data;
          console.log("🔍 Using RPC function for available months");
        } else {
          throw new Error("RPC function not available");
        }
      } catch (e) {
        console.log("🔍 RPC function not found, using fallback method");

        // Fallback: Get months from daily_expenses table (company-wide)
        const { data: expensesData, error: expensesError } = await supabase
          .from("daily_expenses")
          .select("date");

        if (expensesError) {
          console.error("Error fetching expenses for months:", expensesError);
          return;
        }

        // Extract unique months
        const uniqueMonths = new Set();
        expensesData?.forEach((expense) => {
          const expenseDate = new Date(expense.date);
          const monthYear = expenseDate.toISOString().slice(0, 7);
          uniqueMonths.add(monthYear);
        });

        // Convert to array with display names
        monthsData = Array.from(uniqueMonths)
          .sort()
          .reverse()
          .map((monthYear) => ({
            month_year: monthYear,
            display_name: new Date(monthYear + "-01").toLocaleDateString(
              "en-US",
              {
                month: "short",
                year: "numeric",
              }
            ),
          }));
      }

      // If no months found, add current month as fallback
      if (monthsData.length === 0) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        monthsData = [
          {
            month_year: currentMonth,
            display_name: new Date().toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            }),
          },
        ];
        console.log(
          "🔍 No months found, added current month as fallback:",
          currentMonth
        );
      }

      console.log("🔍 Available months data:", monthsData);
      setAvailableMonths(monthsData);

      // Set current month as default if no month is selected
      if (!selectedMonth && monthsData.length > 0) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const hasCurrentMonth = monthsData.some(
          (m: any) => m.month_year === currentMonth
        );
        setSelectedMonth(
          hasCurrentMonth ? currentMonth : monthsData[0].month_year
        );
        console.log(
          "🔍 Auto-selected month:",
          hasCurrentMonth ? currentMonth : monthsData[0].month_year
        );
      }
    } catch (error) {
      console.error("Error fetching available months:", error);
    }
  };

  const fetchExpenseStats = async () => {
    if (!selectedMonth) {
      console.log("❌ No selected month, skipping fetch");
      return;
    }

    try {
      setLoading(true);
      console.log("🔍 Fetching stats for month:", selectedMonth);

      // Try to fetch monthly summary first (if migration is applied)
      let monthlySummary = null;
      try {
        const { data, error } = await supabase
          .from("monthly_expenses_summary")
          .select("*")
          .eq("month_year", selectedMonth)
          .is("user_id", null) // Company balance sheet - no user filtering
          .single();

        if (!error) {
          monthlySummary = data;
          console.log("🔍 Monthly summary data:", monthlySummary);
        } else {
          console.log(
            "🔍 Monthly summary table not found, using fallback method"
          );
        }
      } catch (e) {
        console.log(
          "🔍 Monthly summary table not found, using fallback method"
        );
      }

      // Fetch all expenses for total calculation (company-wide)
      const { data: allExpenses, error: allError } = await supabase
        .from("daily_expenses")
        .select("*")
        .order("created_at", { ascending: false });

      if (allError) throw allError;

      if (monthlySummary) {
        // Use monthly summary data (migration applied)
        const totalExpenses = allExpenses.reduce(
          (sum, expense) => sum + Number(expense.expenses),
          0
        );

        const uniqueDays = new Set(allExpenses.map((expense) => expense.date))
          .size;
        const averageDaily = uniqueDays > 0 ? totalExpenses / uniqueDays : 0;

        setStats({
          totalExpenses,
          monthlyExpenses: monthlySummary.total_expenses || 0,
          averageDaily,
          fixedAmount: monthlySummary.total_fixed_amount || 0,
          remainingBalance: monthlySummary.current_balance || 0,
          previousMonthCarryover: monthlySummary.previous_month_carryover || 0,
          entryCount: monthlySummary.entry_count || 0,
        });
      } else {
        // Fallback: Calculate from daily_expenses table directly
        console.log("🔍 Using fallback calculation from daily_expenses");
        console.log("🔍 All expenses count:", allExpenses.length);
        console.log("🔍 Selected month:", selectedMonth);

        // Get current month's expense records
        const currentMonthExpenses = allExpenses.filter((expense) => {
          const expenseDate = new Date(expense.date);
          const expenseMonth = expenseDate.toISOString().slice(0, 7);
          console.log(
            "🔍 Expense date:",
            expense.date,
            "Month:",
            expenseMonth,
            "Matches:",
            expenseMonth === selectedMonth
          );
          return expenseMonth === selectedMonth;
        });

        console.log(
          "🔍 Current month expenses count:",
          currentMonthExpenses.length
        );

        if (currentMonthExpenses.length > 0) {
          // Calculate current month totals
          const totalFixedAmountThisMonth = currentMonthExpenses
            .filter(
              (expense) => expense.fixed_amount && expense.fixed_amount > 0
            )
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

          // Calculate total expenses (all time)
          const totalExpenses = allExpenses.reduce(
            (sum, expense) => sum + Number(expense.expenses),
            0
          );

          // Calculate average daily (based on days with expenses)
          const uniqueDays = new Set(allExpenses.map((expense) => expense.date))
            .size;
          const averageDaily = uniqueDays > 0 ? totalExpenses / uniqueDays : 0;

          const finalStats = {
            totalExpenses,
            monthlyExpenses: totalExpensesThisMonth,
            averageDaily,
            fixedAmount: totalFixedAmountThisMonth,
            remainingBalance,
            previousMonthCarryover,
            entryCount: currentMonthExpenses.length,
          };

          console.log("🔍 Final stats calculated:", finalStats);
          setStats(finalStats);
        } else {
          // No data for this month
          console.log("🔍 No data found for month:", selectedMonth);
          setStats({
            totalExpenses: 0,
            monthlyExpenses: 0,
            averageDaily: 0,
            fixedAmount: 0,
            remainingBalance: 0,
            previousMonthCarryover: 0,
            entryCount: 0,
          });
        }
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
    onRefresh: () => {
      fetchExpenseStats();
      fetchAvailableMonths();
    },
    enabled: true, // Always enabled for company balance sheet
  });

  useEffect(() => {
    fetchAvailableMonths();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      console.log("🔄 Month changed to:", selectedMonth);
      fetchExpenseStats();
    }
  }, [selectedMonth]);

  const handleSuccessfulAdd = () => {
    fetchExpenseStats();
    fetchAvailableMonths();
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

        {/* Month Selector */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Select Month:</span>
            </div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.length > 0 ? (
                  availableMonths.map((month) => (
                    <SelectItem key={month.month_year} value={month.month_year}>
                      {month.display_name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value={new Date().toISOString().slice(0, 7)}>
                    {new Date().toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              {selectedMonth
                ? `Selected: ${new Date(
                    selectedMonth + "-01"
                  ).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}`
                : "No month selected"}
            </div>
          </div>
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log("🔄 Manual refresh triggered");
                fetchExpenseStats();
              }}
            >
              Refresh Data
            </Button>
          </div>
        </Card>

        {/* Balance Sheet Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                This Month Entries
              </CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {loading ? "-" : stats.entryCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Total entries this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                This Month Expenses
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
                This Month Fixed Amount
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
                Previous Month Carryover
              </CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  stats.previousMonthCarryover < 0
                    ? "text-red-600"
                    : stats.previousMonthCarryover > 0
                    ? "text-green-600"
                    : "text-gray-600"
                }`}
              >
                {loading ? "-" : `₹${stats.previousMonthCarryover.toFixed(2)}`}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.previousMonthCarryover > 0
                  ? "Available from last month"
                  : stats.previousMonthCarryover < 0
                  ? "Overspent from last month"
                  : "No carryover"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Current Balance
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
              <p className="text-xs text-muted-foreground">
                {stats.remainingBalance < 0 ? "Overspent" : "Available budget"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Expense Table */}
        <DailyExpensesTable
          onDataChange={handleSuccessfulAdd}
          selectedMonth={selectedMonth}
        />

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
        currentBalance={stats.remainingBalance}
        selectedMonth={selectedMonth}
        previousMonthCarryover={stats.previousMonthCarryover}
      />
    </>
  );
}
