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
      detailed_expenses: {
        Row: {
          category_id: string | null
          created_at: string | null
          id: string
          name: string
          search_keywords: string[] | null
          status: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
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
      nationalities: {
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
      tour_allowances: {
        Row: {
          amount: number | null
          created_at: string | null
          date: string
          id: string
          notes: string | null
          tour_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          tour_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
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
          destination_id: string | null
          id: string
          tour_id: string
        }
        Insert: {
          created_at?: string | null
          destination_id?: string | null
          id?: string
          tour_id: string
        }
        Update: {
          created_at?: string | null
          destination_id?: string | null
          id?: string
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_destinations_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "tourist_destinations"
            referencedColumns: ["id"]
          },
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
          amount: number | null
          created_at: string | null
          expense_id: string | null
          id: string
          notes: string | null
          tour_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          expense_id?: string | null
          id?: string
          notes?: string | null
          tour_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          expense_id?: string | null
          id?: string
          notes?: string | null
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_expenses_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "detailed_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_expenses_tour_id_fkey"
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
          meal_type: string
          price: number | null
          shopping_id: string | null
          tour_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          meal_type: string
          price?: number | null
          shopping_id?: string | null
          tour_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          meal_type?: string
          price?: number | null
          shopping_id?: string | null
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_meals_shopping_id_fkey"
            columns: ["shopping_id"]
            isOneToOne: false
            referencedRelation: "shoppings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_meals_tour_id_fkey"
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
          province_id: string | null
          search_keywords: string[] | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          province_id?: string | null
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          province_id?: string | null
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
          company_id: string | null
          created_at: string | null
          end_date: string
          guide_id: string | null
          id: string
          nationality_id: string | null
          notes: string | null
          number_of_guests: number | null
          start_date: string
          tour_code: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          end_date: string
          guide_id?: string | null
          id?: string
          nationality_id?: string | null
          notes?: string | null
          number_of_guests?: number | null
          start_date: string
          tour_code: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          end_date?: string
          guide_id?: string | null
          id?: string
          nationality_id?: string | null
          notes?: string | null
          number_of_guests?: number | null
          start_date?: string
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
