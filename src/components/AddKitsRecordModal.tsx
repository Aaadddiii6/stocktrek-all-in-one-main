import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { toast } from 'sonner';

interface AddKitsRecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddKitsRecordModal({ open, onOpenChange, onSuccess }: AddKitsRecordModalProps) {
  const { user } = useAuth();
  const { logSuccess, logError } = useActivityLogger();
  const [formData, setFormData] = useState({
    item_name: '',
    date: '',
    opening_balance: 0,
    addins: 0,
    takeouts: 0,
    remarks: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validate required fields
    if (!formData.item_name || !formData.date) {
      toast.error('Item name and date are required');
      return;
    }

    setIsSubmitting(true);

    try {
      const closingBalance = (formData.opening_balance || 0) + (formData.addins || 0) - (formData.takeouts || 0);

      const { data: insertedData, error } = await supabase
        .from('kits_inventory')
        .insert({
          item_name: formData.item_name,
          date: formData.date,
          opening_balance: formData.opening_balance || 0,
          addins: formData.addins || 0,
          takeouts: formData.takeouts || 0,
          closing_balance: closingBalance,
          remarks: formData.remarks || null,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        await logError('kits_inventory', 'INSERT', error, formData);
        throw error;
      }

      await logSuccess('kits_inventory', 'INSERT', { ...formData, closing_balance: closingBalance }, insertedData?.id);
      toast.success('Kit record added successfully');
      
      onOpenChange(false);
      setFormData({
        item_name: '',
        date: '',
        opening_balance: 0,
        addins: 0,
        takeouts: 0,
        remarks: ''
      });
      onSuccess();
    } catch (error: any) {
      console.error('Error adding kit record:', error);
      const errorMessage = error?.message || 'Failed to add kit record';
      const errorCode = error?.code;
      
      let userMessage = `Error: ${errorMessage}`;
      if (errorCode === '42501') {
        userMessage = 'Permission denied. Please check your user role or contact an administrator.';
      } else if (errorCode === '23505') {
        userMessage = 'This record already exists. Please check for duplicates.';
      }
      
      toast.error(userMessage);
      await logError('kits_inventory', 'INSERT', error, formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Kit Record</DialogTitle>
          <DialogDescription>
            Add a new kit inventory record with opening balance, addins, and takeouts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item_name">
                Item Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="item_name"
                value={formData.item_name}
                onChange={(e) => handleFieldChange('item_name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Date <span className="text-destructive">*</span></Label>
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
                    {formData.date ? format(new Date(formData.date), 'PPP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date ? new Date(formData.date) : undefined}
                    onSelect={(date) => handleFieldChange('date', date?.toISOString().split('T')[0])}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="opening_balance">
                Opening Balance
              </Label>
              <Input
                id="opening_balance"
                type="number"
                value={formData.opening_balance}
                onChange={(e) => handleFieldChange('opening_balance', Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addins">
                Add-ins
              </Label>
              <Input
                id="addins"
                type="number"
                value={formData.addins}
                onChange={(e) => handleFieldChange('addins', Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="takeouts">
                Take-outs
              </Label>
              <Input
                id="takeouts"
                type="number"
                value={formData.takeouts}
                onChange={(e) => handleFieldChange('takeouts', Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Closing Balance</Label>
              <Input
                value={formData.opening_balance + formData.addins - formData.takeouts}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => handleFieldChange('remarks', e.target.value)}
              placeholder="Add any additional notes..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Kit Record'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}