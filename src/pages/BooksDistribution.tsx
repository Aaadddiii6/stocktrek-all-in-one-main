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
import { AddBookRecordModal } from "@/components/AddBookRecordModal";
import { BookOpen, Plus, TrendingUp, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

export default function BooksDistribution() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [booksData, setBooksData] = useState([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
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

  useRealtimeRefresh({
    table: "books_distribution",
    onRefresh: () => {
      fetchBooksStats();
      fetchBooksData();
    },
  });

  useEffect(() => {
    fetchBooksStats();
    fetchBooksData();
  }, []);

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Books Distribution
            </h1>
            <p className="text-muted-foreground">
              Manage book distribution to schools
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
              <CardTitle className="text-sm font-medium">Total Books</CardTitle>
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
              <div className="text-2xl font-bold">{stats.schoolsReached}</div>
              <p className="text-xs text-muted-foreground">
                Educational institutions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
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
        <Card>
          <CardHeader>
            <CardTitle>Books Distribution Records</CardTitle>
            <CardDescription>
              Recent book distribution records to schools
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBooks ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">
                  Loading books distribution records...
                </div>
              </div>
            ) : booksData.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">
                  No books distribution records found
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">School Name</th>
                      <th className="text-left p-2 font-medium">Coordinator</th>
                      <th className="text-left p-2 font-medium">Kit Type</th>
                      <th className="text-left p-2 font-medium">Total Books</th>
                      <th className="text-left p-2 font-medium">
                        Delivery Date
                      </th>
                      <th className="text-left p-2 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {booksData.map((book: any, index: number) => {
                      const totalBooks =
                        (book.grade1 || 0) +
                        (book.grade2 || 0) +
                        (book.grade3 || 0) +
                        (book.grade4 || 0) +
                        (book.grade5 || 0) +
                        (book.grade6 || 0) +
                        (book.grade7 || 0) +
                        (book.grade8 || 0) +
                        (book.grade9 || 0) +
                        (book.grade10 || 0) +
                        (book.grade10iot || 0);
                      return (
                        <tr
                          key={book.id || index}
                          className="border-b hover:bg-muted/50"
                        >
                          <td className="p-2">{book.school_name || "N/A"}</td>
                          <td className="p-2">
                            {book.coordinator_name || "N/A"}
                          </td>
                          <td className="p-2">{book.kit_type || "N/A"}</td>
                          <td className="p-2 font-medium">{totalBooks}</td>
                          <td className="p-2">
                            {book.delivery_date
                              ? new Date(
                                  book.delivery_date
                                ).toLocaleDateString()
                              : "N/A"}
                          </td>
                          <td className="p-2">
                            {book.created_at
                              ? new Date(book.created_at).toLocaleDateString()
                              : "N/A"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Logs */}
        <ModuleActivityLogs
          moduleType="books_distribution"
          moduleName="Books Distribution"
        />
      </div>

      {/* Add Record Modal */}
      <AddBookRecordModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchBooksStats();
          fetchBooksData();
        }}
      />
    </>
  );
}
