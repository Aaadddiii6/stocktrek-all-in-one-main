import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { toast } from 'sonner';

interface AddGameRecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddGameRecordModal({ open, onOpenChange, onSuccess }: AddGameRecordModalProps) {
  const { user } = useAuth();
  const { logSuccess, logError } = useActivityLogger();
  const [formData, setFormData] = useState({
    game_details: '',
    previous_stock: 0,
    adding: 0,
    sent: 0,
    sent_by: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchPrev = async () => {
      if (!formData.game_details) return;
      const { data, error } = await supabase
        .from('games_stock')
        .select('current_stock')
        .eq('game_details', formData.game_details)
        .limit(1);
      if (!error && data && data.length > 0) {
        setFormData(prev => ({ ...prev, previous_stock: Number(data[0].current_stock) || 0 }));
      }
    };
    fetchPrev();
  }, [formData.game_details]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validate required fields
    if (!formData.game_details) {
      toast.error('Game details are required');
      return;
    }

    setIsSubmitting(true);

    try {
      const inStock = formData.previous_stock + formData.adding - formData.sent;
      
      const { data: insertedData, error } = await supabase
        .from('games_inventory')
        .insert({
          game_details: formData.game_details,
          previous_stock: formData.previous_stock,
          adding: formData.adding,
          sent: formData.sent,
          in_stock: inStock,
          sent_by: formData.sent_by || null,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        await logError('games_inventory', 'INSERT', error, formData);
        throw error;
      }

      await logSuccess('games_inventory', 'INSERT', formData, insertedData?.id);
      toast.success('Game record added successfully');
      
      onOpenChange(false);
      setFormData({
        game_details: '',
        previous_stock: 0,
        adding: 0,
        sent: 0,
        sent_by: ''
      });
      onSuccess();
    } catch (error: any) {
      console.error('Error adding game record:', error);
      const errorMessage = error?.message || 'Failed to add game record';
      const errorCode = error?.code;
      
      let userMessage = `Error: ${errorMessage}`;
      if (errorCode === '42501') {
        userMessage = 'Permission denied. Please check your user role or contact an administrator.';
      } else if (errorCode === '23505') {
        userMessage = 'This record already exists. Please check for duplicates.';
      }
      
      toast.error(userMessage);
      await logError('games_inventory', 'INSERT', error, formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Game Record</DialogTitle>
          <DialogDescription>
            Add a new game inventory record with stock tracking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="game_details">
                Game Details <span className="text-destructive">*</span>
              </Label>
              <Input
                id="game_details"
                value={formData.game_details}
                onChange={(e) => handleFieldChange('game_details', e.target.value)}
                placeholder="Describe the game..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="previous_stock">Previous Stock</Label>
              <Input
                id="previous_stock"
                type="number"
                value={formData.previous_stock}
                onChange={(e) => handleFieldChange('previous_stock', Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adding">Adding</Label>
              <Input
                id="adding"
                type="number"
                value={formData.adding}
                onChange={(e) => handleFieldChange('adding', Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sent">Sent</Label>
              <Input
                id="sent"
                type="number"
                value={formData.sent}
                onChange={(e) => handleFieldChange('sent', Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>In Stock</Label>
              <Input
                value={formData.previous_stock + formData.adding - formData.sent}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="sent_by">Sent By</Label>
              <Input
                id="sent_by"
                value={formData.sent_by}
                onChange={(e) => handleFieldChange('sent_by', e.target.value)}
                placeholder="Who sent the games..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Game Record'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}