import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { toast } from 'sonner';

interface AddBookRecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddBookRecordModal({ open, onOpenChange, onSuccess }: AddBookRecordModalProps) {
  const { user } = useAuth();
  const { logSuccess, logError } = useActivityLogger();
  const [formData, setFormData] = useState({
    school_name: '',
    coordinator_name: '',
    coordinator_number: '',
    address: '',
    kit_type: 'Lab',
    ordered_from_printer: 0,
    received: 0,
    total_used_till_now: 0,
    delivery_date: '',
    grade1: 0,
    grade2: 0,
    grade3: 0,
    grade4: 0,
    grade5: 0,
    grade6: 0,
    grade7: 0,
    grade7iot: 0,
    grade8: 0,
    grade8iot: 0,
    grade9: 0,
    grade9iot: 0,
    grade10: 0,
    grade10iot: 0,
    additional: ''
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

    // All fields optional; ensure defaults where needed
    // Kit type will default to 'Lab' if not provided

    setIsSubmitting(true);

    try {
      const { data: insertedData, error } = await supabase
        .from('books_distribution')
        .insert({
          school_name: formData.school_name,
          coordinator_name: formData.coordinator_name,
          coordinator_number: formData.coordinator_number,
          address: formData.address,
          kit_type: (formData.kit_type || 'Lab') as any,
          ordered_from_printer: formData.ordered_from_printer,
          received: formData.received,
          total_used_till_now: formData.total_used_till_now,
          delivery_date: formData.delivery_date || null,
          grade1: formData.grade1,
          grade2: formData.grade2,
          grade3: formData.grade3,
          grade4: formData.grade4,
          grade5: formData.grade5,
          grade6: formData.grade6,
          grade7: formData.grade7,
          grade7iot: formData.grade7iot,
          grade8: formData.grade8,
          grade8iot: formData.grade8iot,
          grade9: formData.grade9,
          grade9iot: formData.grade9iot,
          grade10: formData.grade10,
          grade10iot: formData.grade10iot,
          additional: formData.additional || null,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        await logError('books_distribution', 'INSERT', error, formData);
        throw error;
      }

      await logSuccess('books_distribution', 'INSERT', formData, insertedData?.id);
      toast.success('Book distribution record added successfully');
      
      onOpenChange(false);
      setFormData({
        school_name: '',
        coordinator_name: '',
        coordinator_number: '',
        address: '',
        kit_type: '',
        ordered_from_printer: 0,
        received: 0,
        total_used_till_now: 0,
        delivery_date: '',
        grade1: 0,
        grade2: 0,
        grade3: 0,
        grade4: 0,
        grade5: 0,
        grade6: 0,
        grade7: 0,
        grade7iot: 0,
        grade8: 0,
        grade8iot: 0,
        grade9: 0,
        grade9iot: 0,
        grade10: 0,
        grade10iot: 0,
        additional: ''
      });
      onSuccess();
    } catch (error: any) {
      console.error('Error adding book record:', error);
      const errorMessage = error?.message || 'Failed to add book distribution record';
      const errorCode = error?.code;
      
      let userMessage = `Error: ${errorMessage}`;
      if (errorCode === '42501') {
        userMessage = 'Permission denied. Please check your user role or contact an administrator.';
      } else if (errorCode === '23505') {
        userMessage = 'This record already exists. Please check for duplicates.';
      }
      
      toast.error(userMessage);
      await logError('books_distribution', 'INSERT', error, formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Book Distribution Record</DialogTitle>
          <DialogDescription>
            Add a new book distribution record with school and grade details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* School Information */}
          <div>
            <h3 className="text-lg font-medium mb-4">School Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
              <Label htmlFor="school_name">School Name</Label>
              <Input
                id="school_name"
                value={formData.school_name}
                onChange={(e) => handleFieldChange('school_name', e.target.value)}
              />
              </div>

              <div className="space-y-2">
              <Label htmlFor="coordinator_name">Coordinator Name</Label>
              <Input
                id="coordinator_name"
                value={formData.coordinator_name}
                onChange={(e) => handleFieldChange('coordinator_name', e.target.value)}
              />
              </div>

              <div className="space-y-2">
              <Label htmlFor="coordinator_number">Coordinator Number</Label>
              <Input
                id="coordinator_number"
                value={formData.coordinator_number}
                onChange={(e) => handleFieldChange('coordinator_number', e.target.value)}
              />
              </div>

              <div className="space-y-2">
              <Label>Kit Type</Label>
              <Select value={formData.kit_type} onValueChange={(value) => handleFieldChange('kit_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select kit type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lab">Lab</SelectItem>
                  <SelectItem value="Individual">Individual</SelectItem>
                  <SelectItem value="Returnable">Returnable</SelectItem>
                </SelectContent>
              </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Distribution Details */}
          <div>
            <h3 className="text-lg font-medium mb-4">Distribution Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ordered_from_printer">Ordered from Printer</Label>
                <Input
                  id="ordered_from_printer"
                  type="number"
                  value={formData.ordered_from_printer}
                  onChange={(e) => handleFieldChange('ordered_from_printer', Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="received">Received</Label>
                <Input
                  id="received"
                  type="number"
                  value={formData.received}
                  onChange={(e) => handleFieldChange('received', Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_used_till_now">Total Used Till Now</Label>
                <Input
                  id="total_used_till_now"
                  type="number"
                  value={formData.total_used_till_now}
                  onChange={(e) => handleFieldChange('total_used_till_now', Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>Delivery Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.delivery_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.delivery_date ? format(new Date(formData.delivery_date), 'PPP') : 'Pick delivery date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.delivery_date ? new Date(formData.delivery_date) : undefined}
                      onSelect={(date) => handleFieldChange('delivery_date', date?.toISOString().split('T')[0])}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Grade Distribution */}
          <div>
            <h3 className="text-lg font-medium mb-4">Grade Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: 'grade1', label: 'Grade 1' },
                { key: 'grade2', label: 'Grade 2' },
                { key: 'grade3', label: 'Grade 3' },
                { key: 'grade4', label: 'Grade 4' },
                { key: 'grade5', label: 'Grade 5' },
                { key: 'grade6', label: 'Grade 6' },
                { key: 'grade7', label: 'Grade 7' },
                { key: 'grade7iot', label: 'Grade 7 IoT' },
                { key: 'grade8', label: 'Grade 8' },
                { key: 'grade8iot', label: 'Grade 8 IoT' },
                { key: 'grade9', label: 'Grade 9' },
                { key: 'grade9iot', label: 'Grade 9 IoT' },
                { key: 'grade10', label: 'Grade 10' },
                { key: 'grade10iot', label: 'Grade 10 IoT' }
              ].map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    type="number"
                    value={formData[key as keyof typeof formData] as number}
                    onChange={(e) => handleFieldChange(key, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additional">Additional Notes</Label>
            <Textarea
              id="additional"
              value={formData.additional}
              onChange={(e) => handleFieldChange('additional', e.target.value)}
              placeholder="Any additional information..."
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
              {isSubmitting ? 'Adding...' : 'Add Distribution Record'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}