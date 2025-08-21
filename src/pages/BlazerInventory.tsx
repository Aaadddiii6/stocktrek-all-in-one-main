import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ModuleActivityLogs } from '@/components/ModuleActivityLogs';
import AddBlazerRecordModal from '@/components/AddBlazerRecordModal';
import { BlazerInventoryTable } from '@/components/BlazerInventoryTable';
import { HardHat, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

export default function BlazerInventory() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalBlazers: 0,
    inOfficeStock: 0,
    maleBlazers: 0,
    femaleBlazers: 0
  });

  const fetchBlazerStats = async () => {
    try {
      const { data, error } = await supabase
        .from('blazer_inventory')
        .select('*');
      
      if (error) throw error;
      
      const blazerData = data as any[];
      const totalBlazers = blazerData?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      const inOfficeStock = blazerData?.reduce((sum, item) => sum + item.in_office_stock, 0) || 0;
      const maleBlazers = blazerData?.filter(item => item.gender === 'Male').reduce((sum, item) => sum + item.quantity, 0) || 0;
      const femaleBlazers = blazerData?.filter(item => item.gender === 'Female').reduce((sum, item) => sum + item.quantity, 0) || 0;
      
      setStats({
        totalBlazers,
        inOfficeStock,
        maleBlazers,
        femaleBlazers
      });
    } catch (error) {
      console.error('Error fetching blazer stats:', error);
    }
  };

  useRealtimeRefresh({ 
    table: 'blazer_inventory', 
    onRefresh: fetchBlazerStats 
  });

  useEffect(() => {
    fetchBlazerStats();
  }, []);

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Blazer Inventory</h1>
            <p className="text-muted-foreground">Manage uniform blazer stock by sizes</p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Blazer Record
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Blazers</CardTitle>
              <HardHat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBlazers}</div>
              <p className="text-xs text-muted-foreground">
                All sizes combined
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Male Blazers</CardTitle>
              <HardHat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.maleBlazers}</div>
              <p className="text-xs text-muted-foreground">
                All male sizes
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Female Blazers</CardTitle>
              <HardHat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.femaleBlazers}</div>
              <p className="text-xs text-muted-foreground">
                All female sizes
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Office Stock</CardTitle>
              <HardHat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inOfficeStock}</div>
              <p className="text-xs text-muted-foreground">
                Available inventory
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Blazer Records Table */}
        <BlazerInventoryTable onDataChange={fetchBlazerStats} />

        {/* Activity Logs */}
        <ModuleActivityLogs moduleType="blazer_inventory" moduleName="Blazer Inventory" />
      </div>

      {/* Add Record Modal */}
      <AddBlazerRecordModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchBlazerStats();
        }}
      />
    </>
  );
}