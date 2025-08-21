import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ModuleActivityLogs } from '@/components/ModuleActivityLogs';
import { AddBookRecordModal } from '@/components/AddBookRecordModal';
import { BookOpen, Plus, TrendingUp, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

export default function BooksDistribution() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalBooks: 0,
    schoolsReached: 0,
    thisMonth: 0
  });

  const fetchBooksStats = async () => {
    try {
      const { data, error } = await supabase
        .from('books_distribution')
        .select('*');
      
      if (error) throw error;
      
      const totalBooks = data?.reduce((sum, item) => {
        const gradeTotal = (item.grade1 || 0) + (item.grade2 || 0) + (item.grade3 || 0) + 
                          (item.grade4 || 0) + (item.grade5 || 0) + (item.grade6 || 0) + 
                          (item.grade7 || 0) + (item.grade8 || 0) + (item.grade9 || 0) + 
                          (item.grade10 || 0) + (item.grade10iot || 0);
        return sum + gradeTotal;
      }, 0) || 0;
      const schoolsReached = new Set(data?.map(item => item.school_name)).size || 0;
      
      // Calculate this month's distribution
      const thisMonth = new Date().toISOString().substring(0, 7);
      const monthlyData = data?.filter(item => item.created_at?.startsWith(thisMonth)) || [];
      const thisMonthDistribution = monthlyData.reduce((sum, item) => {
        const gradeTotal = (item.grade1 || 0) + (item.grade2 || 0) + (item.grade3 || 0) + 
                          (item.grade4 || 0) + (item.grade5 || 0) + (item.grade6 || 0) + 
                          (item.grade7 || 0) + (item.grade8 || 0) + (item.grade9 || 0) + 
                          (item.grade10 || 0) + (item.grade10iot || 0);
        return sum + gradeTotal;
      }, 0);
      
      setStats({
        totalBooks,
        schoolsReached,
        thisMonth: thisMonthDistribution
      });
    } catch (error) {
      console.error('Error fetching books stats:', error);
    }
  };

  useRealtimeRefresh({ 
    table: 'books_distribution', 
    onRefresh: fetchBooksStats 
  });

  useEffect(() => {
    fetchBooksStats();
  }, []);

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Books Distribution</h1>
            <p className="text-muted-foreground">Manage book distribution to schools</p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
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
              <CardTitle className="text-sm font-medium">Schools Reached</CardTitle>
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

        {/* Activity Logs */}
        <ModuleActivityLogs moduleType="books_distribution" moduleName="Books Distribution" />
      </div>

      {/* Add Record Modal */}
      <AddBookRecordModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchBooksStats();
        }}
      />
    </>
  );
}