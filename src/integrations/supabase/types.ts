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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          note: string | null
          phone: string | null
          search_keywords: string[] | null
          status: string
          updated_at: string | null
        }
        Insert: {
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          note?: string | null
          phone?: string | null
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          note?: string | null
          phone?: string | null
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      detailed_expenses: {
        Row: {
          category_id: string | null
          category_name_at_booking: string | null
          created_at: string | null
          id: string
          name: string
          price: number | null
          search_keywords: string[] | null
          status: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          category_name_at_booking?: string | null
          created_at?: string | null
          id?: string
          name: string
          price?: number | null
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          category_name_at_booking?: string | null
          created_at?: string | null
          id?: string
          name?: string
          price?: number | null
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detailed_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          search_keywords: string[] | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      guides: {
        Row: {
          created_at: string | null
          id: string
          name: string
          note: string | null
          phone: string | null
          search_keywords: string[] | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          note?: string | null
          phone?: string | null
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          note?: string | null
          phone?: string | null
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      nationalities: {
        Row: {
          created_at: string | null
          emoji: string | null
          id: string
          iso2: string | null
          name: string
          search_keywords: string[] | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          emoji?: string | null
          id?: string
          iso2?: string | null
          name: string
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          emoji?: string | null
          id?: string
          iso2?: string | null
          name?: string
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      provinces: {
        Row: {
          created_at: string | null
          id: string
          name: string
          search_keywords: string[] | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shoppings: {
        Row: {
          created_at: string | null
          id: string
          name: string
          price: number | null
          search_keywords: string[] | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          price?: number | null
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          price?: number | null
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tour_allowances: {
        Row: {
          created_at: string | null
          date: string
          id: string
          name: string
          price: number | null
          quantity: number
          tour_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          name: string
          price?: number | null
          quantity?: number
          tour_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          name?: string
          price?: number | null
          quantity?: number
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_allowances_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_destinations: {
        Row: {
          created_at: string | null
          date: string
          id: string
          name: string
          price: number | null
          tour_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          name: string
          price?: number | null
          tour_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          name?: string
          price?: number | null
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_destinations_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_expenses: {
        Row: {
          created_at: string | null
          date: string
          guests: number | null
          id: string
          name: string
          price: number | null
          tour_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          guests?: number | null
          id?: string
          name: string
          price?: number | null
          tour_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          guests?: number | null
          id?: string
          name?: string
          price?: number | null
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_expenses_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_images: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          storage_path: string
          tour_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path: string
          tour_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path?: string
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tour"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_meals: {
        Row: {
          created_at: string | null
          date: string
          id: string
          name: string
          price: number | null
          tour_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          name: string
          price?: number | null
          tour_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          name?: string
          price?: number | null
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_meals_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_shoppings: {
        Row: {
          created_at: string
          date: string
          id: string
          name: string
          price: number
          tour_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          name: string
          price?: number
          tour_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          name?: string
          price?: number
          tour_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_shoppings_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tourist_destinations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          price: number | null
          province_id: string | null
          province_name_at_booking: string | null
          search_keywords: string[] | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          price?: number | null
          province_id?: string | null
          province_name_at_booking?: string | null
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          price?: number | null
          province_id?: string | null
          province_name_at_booking?: string | null
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tourist_destinations_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      tours: {
        Row: {
          adults: number | null
          advance_payment: number | null
          children: number | null
          client_name: string | null
          client_phone: string | null
          collections_for_company: number | null
          company_id: string | null
          company_name_at_booking: string | null
          company_tip: number | null
          created_at: string | null
          driver_name: string | null
          end_date: string
          final_total: number | null
          guide_id: string | null
          guide_name_at_booking: string | null
          id: string
          nationality_id: string | null
          nationality_name_at_booking: string | null
          notes: string | null
          number_of_guests: number | null
          start_date: string
          total_after_advance: number | null
          total_after_collections: number | null
          total_after_tip: number | null
          total_days: number | null
          total_guests: number | null
          total_tabs: number | null
          tour_code: string
          updated_at: string | null
        }
        Insert: {
          adults?: number | null
          advance_payment?: number | null
          children?: number | null
          client_name?: string | null
          client_phone?: string | null
          collections_for_company?: number | null
          company_id?: string | null
          company_name_at_booking?: string | null
          company_tip?: number | null
          created_at?: string | null
          driver_name?: string | null
          end_date: string
          final_total?: number | null
          guide_id?: string | null
          guide_name_at_booking?: string | null
          id?: string
          nationality_id?: string | null
          nationality_name_at_booking?: string | null
          notes?: string | null
          number_of_guests?: number | null
          start_date: string
          total_after_advance?: number | null
          total_after_collections?: number | null
          total_after_tip?: number | null
          total_days?: number | null
          total_guests?: number | null
          total_tabs?: number | null
          tour_code: string
          updated_at?: string | null
        }
        Update: {
          adults?: number | null
          advance_payment?: number | null
          children?: number | null
          client_name?: string | null
          client_phone?: string | null
          collections_for_company?: number | null
          company_id?: string | null
          company_name_at_booking?: string | null
          company_tip?: number | null
          created_at?: string | null
          driver_name?: string | null
          end_date?: string
          final_total?: number | null
          guide_id?: string | null
          guide_name_at_booking?: string | null
          id?: string
          nationality_id?: string | null
          nationality_name_at_booking?: string | null
          notes?: string | null
          number_of_guests?: number | null
          start_date?: string
          total_after_advance?: number | null
          total_after_collections?: number | null
          total_after_tip?: number | null
          total_days?: number | null
          total_guests?: number | null
          total_tabs?: number | null
          tour_code?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tours_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tours_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tours_nationality_id_fkey"
            columns: ["nationality_id"]
            isOneToOne: false
            referencedRelation: "nationalities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
