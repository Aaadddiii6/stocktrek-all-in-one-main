import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ActivityLogData {
  module_type: string;
  action: string;
  record_id?: string;
  record_data?: any;
  error_details?: any;
}

// Module name mapping for better log display
const MODULE_NAMES = {
  'daily_expenses': 'Daily Expenses',
  'kits_inventory': 'Kits Inventory', 
  'blazer_inventory': 'Blazer Inventory',
  'games_inventory': 'Games Inventory',
  'books_distribution': 'Books Distribution',
  'courier_tracking': 'Courier Tracking'
};

export function useActivityLogger() {
  const { user } = useAuth();

  const logActivity = async (data: ActivityLogData) => {
    if (!user) return;

    try {
      const moduleName = MODULE_NAMES[data.module_type as keyof typeof MODULE_NAMES] || data.module_type;
      let actionSummary = data.action.includes('SUCCESS') ? 'Record Added Successfully' : 
                         data.action.includes('ERROR') ? 'Record Addition Failed' : 
                         data.action;

      // Enhanced summary for blazer inventory
      if (data.module_type === 'blazer_inventory' && data.record_data) {
        const { gender, size, quantity } = data.record_data;
        if (gender && size && quantity) {
          const displaySize = size.replace('F-', '').replace('M-', '');
          actionSummary = data.action.includes('SUCCESS') 
            ? `Added ${quantity} ${gender} - ${displaySize} Blazers`
            : `Failed to add ${quantity} ${gender} - ${displaySize} Blazers`;
        }
      }
      
      const logEntry = {
        user_id: user.id,
        module_type: data.module_type,
        data: {
          module_name: moduleName,
          action: data.action,
          summary: `Module: ${moduleName} | Summary: ${actionSummary} | User: ${user.email} | Date/Time: ${new Date().toLocaleString()}`,
          record_id: data.record_id,
          record_data: data.record_data,
          error_details: data.error_details,
          timestamp: new Date().toISOString(),
          user_email: user.email
        }
      };

      const { error } = await supabase
        .from('activity_logs')
        .insert(logEntry);

      if (error) {
        console.error('Failed to log activity:', error);
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const logSuccess = (module_type: string, action: string, record_data?: any, record_id?: string) => {
    logActivity({
      module_type,
      action: `${action}_SUCCESS`,
      record_id,
      record_data
    });
  };

  const logError = (module_type: string, action: string, error: any, record_data?: any) => {
    logActivity({
      module_type,
      action: `${action}_ERROR`,
      record_data,
      error_details: {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      }
    });
  };

  return { logActivity, logSuccess, logError };
}