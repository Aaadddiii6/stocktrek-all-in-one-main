import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ModuleDefinition {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  table_name: string;
  is_active: boolean;
  sort_order: number;
}

export interface ModuleField {
  id: string;
  module_id: string;
  field_name: string;
  display_name: string;
  field_type: 'text' | 'number' | 'decimal' | 'date' | 'select' | 'multiselect' | 'textarea' | 'boolean' | 'email' | 'phone' | 'url';
  is_required: boolean;
  is_searchable: boolean;
  is_editable: boolean;
  is_visible: boolean;
  sort_order: number;
  default_value: string | null;
  placeholder: string | null;
  help_text: string | null;
  option_sets?: OptionSet[];
  validations?: FieldValidation[];
}

export interface OptionSet {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  option_values: OptionValue[];
}

export interface OptionValue {
  id: string;
  value: string;
  display_value: string;
  is_active: boolean;
  sort_order: number;
  metadata: any;
}

export interface FieldValidation {
  id: string;
  rule_type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'email' | 'phone' | 'url';
  rule_value: string | null;
  error_message: string | null;
}

export function useModuleDefinitions() {
  return useQuery({
    queryKey: ['module-definitions'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('module_definitions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as ModuleDefinition[];
    }
  });
}

export function useModuleDefinition(moduleName: string) {
  return useQuery({
    queryKey: ['module-definition', moduleName],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('module_definitions')
        .select('*')
        .eq('name', moduleName)
        .eq('is_active', true)
        .single();
      
      if (error) throw error;
      return data as ModuleDefinition;
    },
    enabled: !!moduleName
  });
}

// Alias for backward compatibility
export const useModuleByName = useModuleDefinition;

export function useModuleFields(moduleName: string) {
  return useQuery({
    queryKey: ['module-fields', moduleName],
    queryFn: async () => {
      const { data: moduleData, error: moduleError } = await (supabase as any)
        .from('module_definitions')
        .select('id')
        .eq('name', moduleName)
        .single();
      
      if (moduleError) throw moduleError;
      
      const { data, error } = await (supabase as any)
        .from('module_fields')
        .select(`
          *,
          field_option_sets(
            option_sets(
              *,
              option_values(*)
            )
          ),
          field_validations(*)
        `)
        .eq('module_id', moduleData.id)
        .eq('is_visible', true)
        .order('sort_order');
      
      if (error) throw error;
      
      // Transform the data to include option sets directly on fields
      const transformedData = data?.map((field: any) => ({
        ...field,
        option_sets: field.field_option_sets?.map((fos: any) => ({
          ...fos.option_sets,
          option_values: fos.option_sets.option_values?.filter((ov: any) => ov.is_active)
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
        })) || [],
        validations: field.field_validations || []
      }));
      
      return transformedData as ModuleField[];
    },
    enabled: !!moduleName
  });
}

export function useOptionSet(optionSetName: string) {
  return useQuery({
    queryKey: ['option-set', optionSetName],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('option_sets')
        .select(`
          *,
          option_values(*)
        `)
        .eq('name', optionSetName)
        .eq('is_active', true)
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        option_values: data.option_values?.filter((ov: any) => ov.is_active)
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
      } as OptionSet;
    },
    enabled: !!optionSetName
  });
}

// Hook to get dependent option sets (like sizes based on gender)
export function useDependentOptions(parentFieldValue: string, dependentFieldName: string) {
  return useQuery({
    queryKey: ['dependent-options', parentFieldValue, dependentFieldName],
    queryFn: async () => {
      if (!parentFieldValue) return [];
      
      // For blazer sizes based on gender
      if (dependentFieldName === 'size' && parentFieldValue) {
        const optionSetName = parentFieldValue === 'Male' ? 'male_blazer_sizes' : 'female_blazer_sizes';
        
        const { data, error } = await (supabase as any)
          .from('option_sets')
          .select(`
            *,
            option_values(*)
          `)
          .eq('name', optionSetName)
          .eq('is_active', true)
          .single();
        
        if (error) throw error;
        
        return data.option_values?.filter((ov: any) => ov.is_active)
          .sort((a: any, b: any) => a.sort_order - b.sort_order) || [];
      }
      
      return [];
    },
    enabled: !!parentFieldValue && !!dependentFieldName
  });
}