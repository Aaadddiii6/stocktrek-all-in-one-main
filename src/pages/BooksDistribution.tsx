import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModuleActivityLogs } from "@/components/ModuleActivityLogs";
import { AddRecordModal } from "@/components/AddRecordModal";
import { BookInventoryTable } from "@/components/BookInventoryTable";
import { BookDistributionTable } from "@/components/BookDistributionTable";
import {
  BookOpen,
  Plus,
  TrendingUp,
  GraduationCap,
  Package,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

export default function BooksDistribution() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddInventoryModalOpen, setIsAddInventoryModalOpen] = useState(false);
  const [booksData, setBooksData] = useState([]);
  const [bookInventoryData, setBookInventoryData] = useState([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [stats, setStats] = useState({
    totalBooks: 0,
    schoolsReached: 0,
    thisMonth: 0,
  });

  const fetchBooksStats = async () => {
    try {
      const { data, error } = await supabase
        .from("books_distribution")
        .select("*");

      if (error) throw error;

      const totalBooks =
        data?.reduce((sum, item) => {
          const gradeTotal =
            (item.grade1 || 0) +
            (item.grade2 || 0) +
            (item.grade3 || 0) +
            (item.grade4 || 0) +
            (item.grade5 || 0) +
            (item.grade6 || 0) +
            (item.grade7 || 0) +
            (item.grade8 || 0) +
            (item.grade9 || 0) +
            (item.grade10 || 0) +
            (item.grade10iot || 0);
          return sum + gradeTotal;
        }, 0) || 0;
      const schoolsReached =
        new Set(data?.map((item) => item.school_name)).size || 0;

      // Calculate this month's distribution
      const thisMonth = new Date().toISOString().substring(0, 7);
      const monthlyData =
        data?.filter((item) => item.created_at?.startsWith(thisMonth)) || [];
      const thisMonthDistribution = monthlyData.reduce((sum, item) => {
        const gradeTotal =
          (item.grade1 || 0) +
          (item.grade2 || 0) +
          (item.grade3 || 0) +
          (item.grade4 || 0) +
          (item.grade5 || 0) +
          (item.grade6 || 0) +
          (item.grade7 || 0) +
          (item.grade8 || 0) +
          (item.grade9 || 0) +
          (item.grade10 || 0) +
          (item.grade10iot || 0);
        return sum + gradeTotal;
      }, 0);

      setStats({
        totalBooks,
        schoolsReached,
        thisMonth: thisMonthDistribution,
      });

      // Also set the books data for the table
      setBooksData(data || []);
      setIsLoadingBooks(false);
    } catch (error) {
      console.error("Error fetching books stats:", error);
      setIsLoadingBooks(false);
    }
  };

  const fetchBooksData = async () => {
    try {
      setIsLoadingBooks(true);
      const { data, error } = await supabase
        .from("books_distribution")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBooksData(data || []);
    } catch (error) {
      console.error("Error fetching books data:", error);
    } finally {
      setIsLoadingBooks(false);
    }
  };

  const fetchBookInventoryData = async () => {
    try {
      setIsLoadingInventory(true);
      const { data, error } = await (supabase as any)
        .from("book_inventory")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBookInventoryData(data || []);
    } catch (error) {
      console.error("Error fetching book inventory data:", error);
    } finally {
      setIsLoadingInventory(false);
    }
  };

  useRealtimeRefresh({
    table: "books_distribution",
    onRefresh: () => {
      fetchBooksStats();
      fetchBooksData();
    },
  });

  useRealtimeRefresh({
    table: "book_inventory",
    onRefresh: () => {
      fetchBookInventoryData();
    },
  });

  useEffect(() => {
    fetchBooksStats();
    fetchBooksData();
    fetchBookInventoryData();
  }, []);

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Books Management
            </h1>
            <p className="text-muted-foreground">
              Manage book inventory and distribution to schools
            </p>
          </div>
        </div>

        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Book Inventory
            </TabsTrigger>
            <TabsTrigger
              value="distribution"
              className="flex items-center gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Book Distribution
            </TabsTrigger>
          </TabsList>

          {/* Book Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Book Inventory</h2>
                <p className="text-muted-foreground">
                  Manage book stock by kit type and grades
                </p>
              </div>
              <Button
                onClick={() => setIsAddInventoryModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Book Inventory
              </Button>
            </div>

            {/* Book Inventory Table */}
            <BookInventoryTable onDataChange={fetchBookInventoryData} />
          </TabsContent>

          {/* Book Distribution Tab */}
          <TabsContent value="distribution" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Book Distribution</h2>
                <p className="text-muted-foreground">
                  Track book distribution to schools
                </p>
              </div>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Distribution Record
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Books
                  </CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalBooks}</div>
                  <p className="text-xs text-muted-foreground">
                    All distributed books
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Schools Reached
                  </CardTitle>
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.schoolsReached}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Educational institutions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    This Month
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.thisMonth}</div>
                  <p className="text-xs text-muted-foreground">
                    Recent distributions
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Books Distribution Table */}
            <BookDistributionTable onDataChange={fetchBooksData} />

            {/* Activity Logs */}
            <ModuleActivityLogs
              moduleType="books_distribution"
              moduleName="Books Distribution"
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Record Modal */}
      <AddRecordModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchBooksData();
        }}
        defaultModuleType="book_distribution"
      />

      {/* Add Book Inventory Modal - We'll create this next */}
      <AddRecordModal
        open={isAddInventoryModalOpen}
        onOpenChange={setIsAddInventoryModalOpen}
        onSuccess={() => {
          setIsAddInventoryModalOpen(false);
          fetchBookInventoryData();
        }}
        defaultModuleType="book_inventory"
      />
    </>
  );
}
