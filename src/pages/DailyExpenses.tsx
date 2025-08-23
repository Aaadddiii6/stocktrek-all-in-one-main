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

      // Fetch all expense records
      const { data: expenses, error } = await supabase
        .from("daily_expenses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (expenses && expenses.length > 0) {
        // Calculate total expenses
        const totalExpenses = expenses.reduce(
          (sum, expense) => sum + Number(expense.expenses),
          0
        );

        // Get the most recent fixed amount
        const fixedAmount = Number(expenses[0].fixed_amount) || 0;

        // Calculate remaining balance
        const remainingBalance = fixedAmount - totalExpenses;

        // Calculate current month expenses
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyExpenses = expenses
          .filter((expense) => {
            const expenseDate = new Date(expense.date);
            return (
              expenseDate.getMonth() === currentMonth &&
              expenseDate.getFullYear() === currentYear
            );
          })
          .reduce((sum, expense) => sum + Number(expense.expenses), 0);

        // Calculate average daily (based on days with expenses)
        const uniqueDays = new Set(expenses.map((expense) => expense.date))
          .size;
        const averageDaily = uniqueDays > 0 ? totalExpenses / uniqueDays : 0;

        setStats({
          totalExpenses,
          monthlyExpenses,
          averageDaily,
          fixedAmount,
          remainingBalance,
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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Expenses
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "-" : `₹${stats.totalExpenses.toFixed(2)}`}
              </div>
              <p className="text-xs text-muted-foreground">
                All recorded expenses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
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
                Average Daily
              </CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "-" : `₹${stats.averageDaily.toFixed(2)}`}
              </div>
              <p className="text-xs text-muted-foreground">Daily average</p>
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
              <p className="text-xs text-muted-foreground">
                Fixed Amount - Total Expenses
              </p>
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
