import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Eye, Download, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface LogData {
  summary?: string;
  action?: string;
  record_id?: string;
  [key: string]: any;
}

const MODULE_COLORS = {
  courier_tracking: 'bg-blue-500',
  kits_inventory: 'bg-green-500', 
  daily_expenses: 'bg-orange-500',
  blazer_inventory: 'bg-purple-500',
  games_inventory: 'bg-pink-500',
  books_distribution: 'bg-indigo-500'
};

const MODULE_LABELS = {
  courier_tracking: 'Courier Tracking',
  kits_inventory: 'Kits Inventory',
  daily_expenses: 'Daily Expenses', 
  blazer_inventory: 'Blazer Inventory',
  games_inventory: 'Games Inventory',
  books_distribution: 'Books Distribution'
};

export function ActivityLogsTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          profiles(full_name, email)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Set up real-time refresh for activity logs
  React.useEffect(() => {
    const channel = supabase
      .channel('activity-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_logs'
        },
        (payload) => {
          console.log('Real-time change in activity_logs:', payload);
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const logData = log.data as LogData;
      const matchesSearch = searchTerm === '' || 
        logData?.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.module_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(log.data).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesModule = filterModule === 'all' || log.module_type === filterModule;
      
      const logDate = new Date(log.created_at);
      const matchesDateRange = (!startDate || logDate >= startDate) && 
                              (!endDate || logDate <= endDate);
      
      return matchesSearch && matchesModule && matchesDateRange;
    });
  }, [logs, searchTerm, filterModule, startDate, endDate]);

  const exportToCSV = () => {
    const headers = ['Date/Time', 'Module', 'Summary', 'User', 'Email', 'Action', 'Record ID'];
    const csvData = filteredLogs.map(log => {
      const logData = log.data as LogData;
      return [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        MODULE_LABELS[log.module_type as keyof typeof MODULE_LABELS] || log.module_type,
        logData?.summary || '',
        log.profiles?.full_name || '',
        log.profiles?.email || '',
        logData?.action || '',
        logData?.record_id || ''
      ];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `activity_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Logs</CardTitle>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by module, user, summary, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {Object.entries(MODULE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date Range
                  {(startDate || endDate) && <Badge variant="secondary" className="ml-1">Active</Badge>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      className="rounded-md border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">End Date</label>
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      className="rounded-md border"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={clearDateFilters}>
                      Clear
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No logs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge 
                        className={`${MODULE_COLORS[log.module_type as keyof typeof MODULE_COLORS]} text-white`}
                      >
                        {MODULE_LABELS[log.module_type as keyof typeof MODULE_LABELS]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="font-medium">
                        {(log.data as LogData)?.summary || 'No summary available'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{log.profiles?.full_name || 'Unknown'}</div>
                        <div className="text-muted-foreground">{log.profiles?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(log.created_at), 'MMM dd, yyyy')}</div>
                        <div className="text-muted-foreground">{format(new Date(log.created_at), 'HH:mm:ss')}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>
                              {MODULE_LABELS[log.module_type as keyof typeof MODULE_LABELS]} Details
                            </DialogTitle>
                            <DialogDescription>
                              Record created on {format(new Date(log.created_at), 'PPP')} at {format(new Date(log.created_at), 'HH:mm:ss')} by {log.profiles?.full_name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            {log.data && typeof log.data === 'object' && Object.entries(log.data).map(([key, value]) => (
                              <div key={key} className="grid grid-cols-3 gap-4">
                                <div className="font-medium capitalize">
                                  {key.replace(/_/g, ' ')}:
                                </div>
                                <div className="col-span-2">
                                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredLogs.length} of {logs.length} log entries
        </div>
      </CardContent>
    </Card>
  );
}