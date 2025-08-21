export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          created_at: string
          data: Json
          id: string
          module_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          module_type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          module_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blazer_inventory: {
        Row: {
          created_at: string | null
          gender: string | null
          id: string
          in_office_stock: number
          quantity: number
          remarks: string | null
          size: Database["public"]["Enums"]["blazer_size"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          gender?: string | null
          id?: string
          in_office_stock?: number
          quantity?: number
          remarks?: string | null
          size?: Database["public"]["Enums"]["blazer_size"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          gender?: string | null
          id?: string
          in_office_stock?: number
          quantity?: number
          remarks?: string | null
          size?: Database["public"]["Enums"]["blazer_size"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blazer_stock: {
        Row: {
          created_at: string | null
          current_stock: number
          gender: string
          id: string
          opening_stock: number
          size: string
          total_distributed: number
          total_received: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_stock?: number
          gender: string
          id?: string
          opening_stock?: number
          size: string
          total_distributed?: number
          total_received?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_stock?: number
          gender?: string
          id?: string
          opening_stock?: number
          size?: string
          total_distributed?: number
          total_received?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      books_distribution: {
        Row: {
          additional: string | null
          address: string | null
          coordinator_name: string | null
          coordinator_number: string | null
          created_at: string | null
          delivery_date: string | null
          grade1: number | null
          grade10: number | null
          grade10iot: number | null
          grade2: number | null
          grade3: number | null
          grade4: number | null
          grade5: number | null
          grade6: number | null
          grade7: number | null
          grade7iot: number | null
          grade8: number | null
          grade8iot: number | null
          grade9: number | null
          grade9iot: number | null
          id: string
          kit_type: Database["public"]["Enums"]["kit_type"]
          ordered_from_printer: number
          received: number
          school_name: string | null
          total_used_till_now: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          additional?: string | null
          address?: string | null
          coordinator_name?: string | null
          coordinator_number?: string | null
          created_at?: string | null
          delivery_date?: string | null
          grade1?: number | null
          grade10?: number | null
          grade10iot?: number | null
          grade2?: number | null
          grade3?: number | null
          grade4?: number | null
          grade5?: number | null
          grade6?: number | null
          grade7?: number | null
          grade7iot?: number | null
          grade8?: number | null
          grade8iot?: number | null
          grade9?: number | null
          grade9iot?: number | null
          id?: string
          kit_type: Database["public"]["Enums"]["kit_type"]
          ordered_from_printer?: number
          received?: number
          school_name?: string | null
          total_used_till_now?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          additional?: string | null
          address?: string | null
          coordinator_name?: string | null
          coordinator_number?: string | null
          created_at?: string | null
          delivery_date?: string | null
          grade1?: number | null
          grade10?: number | null
          grade10iot?: number | null
          grade2?: number | null
          grade3?: number | null
          grade4?: number | null
          grade5?: number | null
          grade6?: number | null
          grade7?: number | null
          grade7iot?: number | null
          grade8?: number | null
          grade8iot?: number | null
          grade9?: number | null
          grade9iot?: number | null
          id?: string
          kit_type?: Database["public"]["Enums"]["kit_type"]
          ordered_from_printer?: number
          received?: number
          school_name?: string | null
          total_used_till_now?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      books_stock: {
        Row: {
          created_at: string | null
          current_stock: number
          grade: string
          id: string
          kit_type: string
          opening_stock: number
          total_distributed: number
          total_received: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_stock?: number
          grade: string
          id?: string
          kit_type: string
          opening_stock?: number
          total_distributed?: number
          total_received?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_stock?: number
          grade?: string
          id?: string
          kit_type?: string
          opening_stock?: number
          total_distributed?: number
          total_received?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      courier_tracking: {
        Row: {
          address: string | null
          courier_details: string | null
          created_at: string | null
          date: string | null
          delivery_date: string | null
          id: string
          name: string | null
          phone_number: string | null
          sr_no: number
          status: Database["public"]["Enums"]["courier_status"]
          tracking_number: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          courier_details?: string | null
          created_at?: string | null
          date?: string | null
          delivery_date?: string | null
          id?: string
          name?: string | null
          phone_number?: string | null
          sr_no?: number
          status?: Database["public"]["Enums"]["courier_status"]
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          courier_details?: string | null
          created_at?: string | null
          date?: string | null
          delivery_date?: string | null
          id?: string
          name?: string | null
          phone_number?: string | null
          sr_no?: number
          status?: Database["public"]["Enums"]["courier_status"]
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      daily_expenses: {
        Row: {
          created_at: string | null
          date: string
          expenses: number
          fixed_amount: number
          id: string
          remarks: string
          sr_no: number
          total: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          expenses?: number
          fixed_amount?: number
          id?: string
          remarks: string
          sr_no?: number
          total?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          expenses?: number
          fixed_amount?: number
          id?: string
          remarks?: string
          sr_no?: number
          total?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      field_option_sets: {
        Row: {
          created_at: string
          field_id: string
          id: string
          option_set_id: string
        }
        Insert: {
          created_at?: string
          field_id: string
          id?: string
          option_set_id: string
        }
        Update: {
          created_at?: string
          field_id?: string
          id?: string
          option_set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_option_sets_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "module_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_option_sets_option_set_id_fkey"
            columns: ["option_set_id"]
            isOneToOne: false
            referencedRelation: "option_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      field_validations: {
        Row: {
          created_at: string
          error_message: string | null
          field_id: string
          id: string
          rule_type: Database["public"]["Enums"]["validation_rule"]
          rule_value: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          field_id: string
          id?: string
          rule_type: Database["public"]["Enums"]["validation_rule"]
          rule_value?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          field_id?: string
          id?: string
          rule_type?: Database["public"]["Enums"]["validation_rule"]
          rule_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_validations_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "module_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      games_inventory: {
        Row: {
          adding: number
          created_at: string | null
          game_details: string | null
          id: string
          in_stock: number | null
          previous_stock: number
          sent: number
          sent_by: string | null
          sr_no: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          adding?: number
          created_at?: string | null
          game_details?: string | null
          id?: string
          in_stock?: number | null
          previous_stock?: number
          sent?: number
          sent_by?: string | null
          sr_no?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          adding?: number
          created_at?: string | null
          game_details?: string | null
          id?: string
          in_stock?: number | null
          previous_stock?: number
          sent?: number
          sent_by?: string | null
          sr_no?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      games_stock: {
        Row: {
          created_at: string | null
          current_stock: number
          game_details: string
          id: string
          opening_stock: number
          total_distributed: number
          total_received: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_stock?: number
          game_details: string
          id?: string
          opening_stock?: number
          total_distributed?: number
          total_received?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_stock?: number
          game_details?: string
          id?: string
          opening_stock?: number
          total_distributed?: number
          total_received?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      kits_inventory: {
        Row: {
          addins: number
          closing_balance: number | null
          created_at: string | null
          date: string | null
          id: string
          item_name: string | null
          opening_balance: number
          remarks: string | null
          takeouts: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          addins?: number
          closing_balance?: number | null
          created_at?: string | null
          date?: string | null
          id?: string
          item_name?: string | null
          opening_balance?: number
          remarks?: string | null
          takeouts?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          addins?: number
          closing_balance?: number | null
          created_at?: string | null
          date?: string | null
          id?: string
          item_name?: string | null
          opening_balance?: number
          remarks?: string | null
          takeouts?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      kits_stock: {
        Row: {
          created_at: string | null
          current_stock: number
          id: string
          item_name: string
          opening_stock: number
          total_distributed: number
          total_received: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_stock?: number
          id?: string
          item_name: string
          opening_stock?: number
          total_distributed?: number
          total_received?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_stock?: number
          id?: string
          item_name?: string
          opening_stock?: number
          total_distributed?: number
          total_received?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      module_definitions: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          table_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          table_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      module_fields: {
        Row: {
          created_at: string
          default_value: string | null
          display_name: string
          field_name: string
          field_type: Database["public"]["Enums"]["field_type"]
          help_text: string | null
          id: string
          is_editable: boolean
          is_required: boolean
          is_searchable: boolean
          is_visible: boolean
          module_id: string
          placeholder: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_value?: string | null
          display_name: string
          field_name: string
          field_type: Database["public"]["Enums"]["field_type"]
          help_text?: string | null
          id?: string
          is_editable?: boolean
          is_required?: boolean
          is_searchable?: boolean
          is_visible?: boolean
          module_id: string
          placeholder?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_value?: string | null
          display_name?: string
          field_name?: string
          field_type?: Database["public"]["Enums"]["field_type"]
          help_text?: string | null
          id?: string
          is_editable?: boolean
          is_required?: boolean
          is_searchable?: boolean
          is_visible?: boolean
          module_id?: string
          placeholder?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_fields_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      module_relationships: {
        Row: {
          cascade_updates: boolean
          child_field: string
          child_module_id: string
          created_at: string
          id: string
          parent_field: string
          parent_module_id: string
          relationship_type: string
        }
        Insert: {
          cascade_updates?: boolean
          child_field: string
          child_module_id: string
          created_at?: string
          id?: string
          parent_field: string
          parent_module_id: string
          relationship_type?: string
        }
        Update: {
          cascade_updates?: boolean
          child_field?: string
          child_module_id?: string
          created_at?: string
          id?: string
          parent_field?: string
          parent_module_id?: string
          relationship_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_relationships_child_module_id_fkey"
            columns: ["child_module_id"]
            isOneToOne: false
            referencedRelation: "module_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_relationships_parent_module_id_fkey"
            columns: ["parent_module_id"]
            isOneToOne: false
            referencedRelation: "module_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      option_sets: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      option_values: {
        Row: {
          created_at: string
          display_value: string
          id: string
          is_active: boolean
          metadata: Json | null
          option_set_id: string
          sort_order: number
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          display_value: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          option_set_id: string
          sort_order?: number
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          display_value?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          option_set_id?: string
          sort_order?: number
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "option_values_option_set_id_fkey"
            columns: ["option_set_id"]
            isOneToOne: false
            referencedRelation: "option_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "inventory_manager" | "viewer"
      blazer_size:
        | "F-XS"
        | "F-S"
        | "F-M"
        | "F-L"
        | "F-XL"
        | "F-XXL"
        | "M-36"
        | "M-38"
        | "M-40"
        | "M-42"
        | "M-44"
        | "M-46"
        | "M-48"
        | "M-50"
      courier_status:
        | "Dispatched"
        | "In Transit"
        | "Delivered"
        | "Delayed"
        | "Failed"
      field_type:
        | "text"
        | "number"
        | "decimal"
        | "date"
        | "select"
        | "multiselect"
        | "textarea"
        | "boolean"
        | "email"
        | "phone"
        | "url"
      kit_type: "Lab" | "Individual" | "Returnable"
      validation_rule:
        | "required"
        | "min"
        | "max"
        | "minLength"
        | "maxLength"
        | "pattern"
        | "email"
        | "phone"
        | "url"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "inventory_manager", "viewer"],
      blazer_size: [
        "F-XS",
        "F-S",
        "F-M",
        "F-L",
        "F-XL",
        "F-XXL",
        "M-36",
        "M-38",
        "M-40",
        "M-42",
        "M-44",
        "M-46",
        "M-48",
        "M-50",
      ],
      courier_status: [
        "Dispatched",
        "In Transit",
        "Delivered",
        "Delayed",
        "Failed",
      ],
      field_type: [
        "text",
        "number",
        "decimal",
        "date",
        "select",
        "multiselect",
        "textarea",
        "boolean",
        "email",
        "phone",
        "url",
      ],
      kit_type: ["Lab", "Individual", "Returnable"],
      validation_rule: [
        "required",
        "min",
        "max",
        "minLength",
        "maxLength",
        "pattern",
        "email",
        "phone",
        "url",
      ],
    },
  },
} as const
