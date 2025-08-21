import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Search, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import AddBlazerRecordModal from "@/components/AddBlazerRecordModal";
import { toast } from 'sonner';

interface BlazerRecord {
  id: string;
  gender: string;
  size: string;
  quantity: number;
  in_office_stock: number;
  remarks: string | null;
  created_at: string;
  user_id: string;
}

interface BlazerInventoryTableProps {
  onDataChange: () => void;
}

export function BlazerInventoryTable({ onDataChange }: BlazerInventoryTableProps) {
  const [records, setRecords] = useState<BlazerRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<BlazerRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { logSuccess, logError } = useActivityLogger();

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('blazer_inventory')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setRecords((data as unknown) as BlazerRecord[] || []);
      setFilteredRecords((data as unknown) as BlazerRecord[] || []);
    } catch (error) {
      console.error('Error fetching blazer records:', error);
      toast.error('Failed to load blazer records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    const filtered = records.filter(record => 
      record.gender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.size.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.quantity.toString().includes(searchTerm) ||
      record.in_office_stock.toString().includes(searchTerm)
    );
    setFilteredRecords(filtered);
  }, [searchTerm, records]);

  const handleDelete = async (record: BlazerRecord) => {
    if (!confirm('Are you sure you want to delete this blazer record?')) return;

    try {
      const { error } = await supabase
        .from('blazer_inventory')
        .delete()
        .eq('id', record.id);

      if (error) throw error;

      await logSuccess('blazer_inventory', 'DELETE', {
        size: record.size,
        gender: record.gender,
        remarks: record.remarks,
        quantity: record.quantity,
        in_office_stock: record.in_office_stock
      }, record.id);

      toast.success('Blazer record deleted successfully');
      fetchRecords();
      onDataChange();
    } catch (error: any) {
      console.error('Error deleting blazer record:', error);
      await logError('blazer_inventory', 'DELETE', error, {
        size: record.size,
        gender: record.gender,
        remarks: record.remarks,
        quantity: record.quantity,
        in_office_stock: record.in_office_stock
      });
      toast.error('Failed to delete blazer record');
    }
  };

  const exportToCSV = () => {
    const headers = ['Gender', 'Size', 'Quantity', 'In Office Stock', 'Remarks', 'Created At'];
    const csvData = filteredRecords.map(record => [
      record.gender,
      record.size.replace('F-', '').replace('M-', ''),
      record.quantity,
      record.in_office_stock,
      record.remarks || '',
      new Date(record.created_at).toLocaleDateString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blazer-inventory-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('CSV export completed');
  };

  const formatSize = (size: string) => {
    return size.replace('F-', '').replace('M-', '');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading blazer records...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>Blazer Records</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search blazers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredRecords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'No blazer records found matching your search.' : 'No blazer records found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gender</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>In Office Stock</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Badge variant={record.gender === 'Male' ? 'default' : 'secondary'}>
                        {record.gender}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatSize(record.size)}
                    </TableCell>
                    <TableCell>{record.quantity}</TableCell>
                    <TableCell>{record.in_office_stock}</TableCell>
                    <TableCell className="max-w-48 truncate">
                      {record.remarks || '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(record.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(record)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}