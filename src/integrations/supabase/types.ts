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
          created_by: string | null
          email: string | null
          id: string
          is_default: boolean
          is_shared: boolean
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
          created_by?: string | null
          email?: string | null
          id?: string
          is_default?: boolean
          is_shared?: boolean
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
          created_by?: string | null
          email?: string | null
          id?: string
          is_default?: boolean
          is_shared?: boolean
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
          created_by: string | null
          guide_id: string | null
          id: string
          is_shared: boolean
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
          created_by?: string | null
          guide_id?: string | null
          id?: string
          is_shared?: boolean
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
          created_by?: string | null
          guide_id?: string | null
          id?: string
          is_shared?: boolean
          name?: string
          price?: number | null
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      diary_types: {
        Row: {
          created_at: string | null
          data_type: string
          id: string
          name: string
          search_keywords: string[] | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_type?: string
          id?: string
          name: string
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_type?: string
          id?: string
          name?: string
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string | null
          created_by: string | null
          guide_id: string | null
          id: string
          is_shared: boolean
          name: string
          search_keywords: string[] | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          guide_id?: string | null
          id?: string
          is_shared?: boolean
          name: string
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          guide_id?: string | null
          id?: string
          is_shared?: boolean
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
          created_by: string | null
          id: string
          is_default: boolean
          is_shared: boolean
          name: string
          note: string | null
          phone: string | null
          search_keywords: string[] | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean
          is_shared?: boolean
          name: string
          note?: string | null
          phone?: string | null
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean
          is_shared?: boolean
          name?: string
          note?: string | null
          phone?: string | null
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      guide_languages: {
        Row: {
          created_at: string | null
          guide_id: string
          id: string
          language_id: string
          proficiency: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          guide_id: string
          id?: string
          language_id: string
          proficiency?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          guide_id?: string
          id?: string
          language_id?: string
          proficiency?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guide_languages_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_languages_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          name: string
          note: string | null
          owner_name: string
          owner_phone: string
          price_per_night: number
          province_id: string | null
          province_name_at_booking: string | null
          room_type: string
          search_keywords: string[] | null
          status: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          name: string
          note?: string | null
          owner_name: string
          owner_phone: string
          price_per_night?: number
          province_id?: string | null
          province_name_at_booking?: string | null
          room_type: string
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          name?: string
          note?: string | null
          owner_name?: string
          owner_phone?: string
          price_per_night?: number
          province_id?: string | null
          province_name_at_booking?: string | null
          room_type?: string
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotels_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      languages: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          id: string
          is_shared: boolean
          name: string
          native_name: string | null
          search_keywords: string[] | null
          status: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_shared?: boolean
          name: string
          native_name?: string | null
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_shared?: boolean
          name?: string
          native_name?: string | null
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      nationalities: {
        Row: {
          created_at: string | null
          created_by: string | null
          emoji: string | null
          id: string
          iso2: string | null
          is_shared: boolean
          name: string
          search_keywords: string[] | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          emoji?: string | null
          id?: string
          iso2?: string | null
          is_shared?: boolean
          name: string
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          emoji?: string | null
          id?: string
          iso2?: string | null
          is_shared?: boolean
          name?: string
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      nationality_languages: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean
          language_id: string
          nationality_id: string
          priority: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean
          language_id: string
          nationality_id: string
          priority?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean
          language_id?: string
          nationality_id?: string
          priority?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nationality_languages_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nationality_languages_nationality_id_fkey"
            columns: ["nationality_id"]
            isOneToOne: false
            referencedRelation: "nationalities"
            referencedColumns: ["id"]
          },
        ]
      }
      provinces: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_shared: boolean
          name: string
          search_keywords: string[] | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_shared?: boolean
          name: string
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_shared?: boolean
          name?: string
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          address: string | null
          commission_for_guide: number | null
          created_at: string | null
          id: string
          name: string
          note: string | null
          phone: string | null
          province_id: string | null
          province_name_at_booking: string | null
          restaurant_type: string
          search_keywords: string[] | null
          status: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          commission_for_guide?: number | null
          created_at?: string | null
          id?: string
          name: string
          note?: string | null
          phone?: string | null
          province_id?: string | null
          province_name_at_booking?: string | null
          restaurant_type: string
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          commission_for_guide?: number | null
          created_at?: string | null
          id?: string
          name?: string
          note?: string | null
          phone?: string | null
          province_id?: string | null
          province_name_at_booking?: string | null
          restaurant_type?: string
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_places: {
        Row: {
          address: string | null
          commission_for_guide: number | null
          created_at: string | null
          id: string
          name: string
          note: string | null
          phone: string | null
          province_id: string | null
          province_name_at_booking: string | null
          search_keywords: string[] | null
          shop_type: string
          status: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          commission_for_guide?: number | null
          created_at?: string | null
          id?: string
          name: string
          note?: string | null
          phone?: string | null
          province_id?: string | null
          province_name_at_booking?: string | null
          search_keywords?: string[] | null
          shop_type: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          commission_for_guide?: number | null
          created_at?: string | null
          id?: string
          name?: string
          note?: string | null
          phone?: string | null
          province_id?: string | null
          province_name_at_booking?: string | null
          search_keywords?: string[] | null
          shop_type?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_places_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      shoppings: {
        Row: {
          address: string | null
          commission_rate: number | null
          created_at: string | null
          created_by: string | null
          guide_id: string | null
          id: string
          is_shared: boolean
          name: string
          phone: string | null
          pit_rate: number | null
          price: number | null
          search_keywords: string[] | null
          status: string
          updated_at: string | null
          withholds_pit: boolean
        }
        Insert: {
          address?: string | null
          commission_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          guide_id?: string | null
          id?: string
          is_shared?: boolean
          name: string
          phone?: string | null
          pit_rate?: number | null
          price?: number | null
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
          withholds_pit?: boolean
        }
        Update: {
          address?: string | null
          commission_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          guide_id?: string | null
          id?: string
          is_shared?: boolean
          name?: string
          phone?: string | null
          pit_rate?: number | null
          price?: number | null
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
          withholds_pit?: boolean
        }
        Relationships: []
      }
      tour_allowances: {
        Row: {
          category_id: string | null
          created_at: string | null
          date: string | null
          id: string
          line_comment: string | null
          line_status: string
          name: string
          price: number | null
          quantity: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          tour_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          line_comment?: string | null
          line_status?: string
          name: string
          price?: number | null
          quantity?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tour_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          line_comment?: string | null
          line_status?: string
          name?: string
          price?: number | null
          quantity?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tour_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_allowances_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_allowances_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
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
          date: string | null
          guests: number | null
          id: string
          line_comment: string | null
          line_status: string
          name: string
          price: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          tour_id: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          guests?: number | null
          id?: string
          line_comment?: string | null
          line_status?: string
          name: string
          price?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tour_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          guests?: number | null
          id?: string
          line_comment?: string | null
          line_status?: string
          name?: string
          price?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tour_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_destinations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
      tour_diaries: {
        Row: {
          content_text: string | null
          content_type: string
          content_urls: string[] | null
          created_at: string | null
          diary_type_data_type: string | null
          diary_type_id: string | null
          diary_type_name_at_booking: string | null
          id: string
          tour_code_at_booking: string | null
          tour_id: string | null
          updated_at: string | null
        }
        Insert: {
          content_text?: string | null
          content_type: string
          content_urls?: string[] | null
          created_at?: string | null
          diary_type_data_type?: string | null
          diary_type_id?: string | null
          diary_type_name_at_booking?: string | null
          id?: string
          tour_code_at_booking?: string | null
          tour_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content_text?: string | null
          content_type?: string
          content_urls?: string[] | null
          created_at?: string | null
          diary_type_data_type?: string | null
          diary_type_id?: string | null
          diary_type_name_at_booking?: string | null
          id?: string
          tour_code_at_booking?: string | null
          tour_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_diaries_tour_id_fkey"
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
          date: string | null
          guests: number | null
          id: string
          line_comment: string | null
          line_status: string
          name: string
          price: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          tour_id: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          guests?: number | null
          id?: string
          line_comment?: string | null
          line_status?: string
          name: string
          price?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tour_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          guests?: number | null
          id?: string
          line_comment?: string | null
          line_status?: string
          name?: string
          price?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tour_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_expenses_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
      tour_images: {
        Row: {
          created_at: string | null
          file_name: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          storage_path: string | null
          tour_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path?: string | null
          tour_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path?: string | null
          tour_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_images_tour_id_fkey"
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
          date: string | null
          guests: number | null
          id: string
          line_comment: string | null
          line_status: string
          name: string
          price: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          tour_id: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          guests?: number | null
          id?: string
          line_comment?: string | null
          line_status?: string
          name: string
          price?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tour_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          guests?: number | null
          id?: string
          line_comment?: string | null
          line_status?: string
          name?: string
          price?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tour_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_meals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
      tour_nationalities: {
        Row: {
          created_at: string | null
          id: string
          nationality_id: string
          nationality_name_at_booking: string
          pax_count: number
          tour_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nationality_id: string
          nationality_name_at_booking: string
          pax_count?: number
          tour_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nationality_id?: string
          nationality_name_at_booking?: string
          pax_count?: number
          tour_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_nationalities_nationality_id_fkey"
            columns: ["nationality_id"]
            isOneToOne: false
            referencedRelation: "nationalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_nationalities_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          note: string | null
          paid_at: string
          paid_by: string | null
          payment_method: string
          tour_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          note?: string | null
          paid_at?: string
          paid_by?: string | null
          payment_method: string
          tour_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          note?: string | null
          paid_at?: string
          paid_by?: string | null
          payment_method?: string
          tour_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_payments_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_payments_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_commission_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          note: string | null
          paid_at: string
          payment_method: string
          tour_shopping_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          note?: string | null
          paid_at: string
          payment_method: string
          tour_shopping_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          note?: string | null
          paid_at?: string
          payment_method?: string
          tour_shopping_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_commission_payments_tour_shopping_id_fkey"
            columns: ["tour_shopping_id"]
            isOneToOne: false
            referencedRelation: "tour_shoppings"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_shoppings: {
        Row: {
          created_at: string | null
          date: string | null
          id: string
          line_comment: string | null
          line_status: string
          name: string
          net_commission: number | null
          pit_amount: number | null
          pit_rate: number | null
          price: number
          reviewed_at: string | null
          reviewed_by: string | null
          tour_id: string | null
          updated_at: string | null
          withholds_pit: boolean | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          id?: string
          line_comment?: string | null
          line_status?: string
          name: string
          net_commission?: number | null
          pit_amount?: number | null
          pit_rate?: number | null
          price?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          tour_id?: string | null
          updated_at?: string | null
          withholds_pit?: boolean | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          id?: string
          line_comment?: string | null
          line_status?: string
          name?: string
          net_commission?: number | null
          pit_amount?: number | null
          pit_rate?: number | null
          price?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          tour_id?: string | null
          updated_at?: string | null
          withholds_pit?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_shoppings_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_shoppings_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_submission_history: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          created_at: string
          event: string
          id: string
          note: string | null
          tour_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          event: string
          id?: string
          note?: string | null
          tour_id: string
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          event?: string
          id?: string
          note?: string | null
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_submission_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_submission_history_tour_id_fkey"
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
          created_by: string | null
          id: string
          is_shared: boolean
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
          created_by?: string | null
          id?: string
          is_shared?: boolean
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
          created_by?: string | null
          id?: string
          is_shared?: boolean
          name?: string
          price?: number | null
          province_id?: string | null
          province_name_at_booking?: string | null
          search_keywords?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tours: {
        Row: {
          adults: number | null
          advance_payment: number | null
          approved_at: string | null
          approved_by: string | null
          children: number | null
          client_name: string | null
          client_phone: string | null
          collections_for_company: number | null
          company_id: string | null
          company_name_at_booking: string | null
          company_tip: number | null
          created_at: string | null
          created_by_user_id: string | null
          driver_name: string | null
          end_date: string | null
          final_total: number | null
          guide_id: string | null
          guide_name_at_booking: string | null
          id: string
          land_operator_id: string | null
          land_operator_name_at_booking: string | null
          last_paid_at: string | null
          last_payment_method: string | null
          locked_at: string | null
          nationality_id: string | null
          nationality_name_at_booking: string | null
          note: string | null
          notes: string | null
          number_of_guests: number | null
          payment_status: string
          payment_total: number
          settlement_status: string
          start_date: string | null
          submission_count: number
          submitted_at: string | null
          summary: Json | null
          total_after_advance: number | null
          total_after_collections: number | null
          total_after_tip: number | null
          total_days: number | null
          total_guests: number | null
          total_tabs: number | null
          tour_code: string
          updated_at: string | null
          water_warning_dismissed: boolean | null
        }
        Insert: {
          adults?: number | null
          advance_payment?: number | null
          approved_at?: string | null
          approved_by?: string | null
          children?: number | null
          client_name?: string | null
          client_phone?: string | null
          collections_for_company?: number | null
          company_id?: string | null
          company_name_at_booking?: string | null
          company_tip?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          driver_name?: string | null
          end_date?: string | null
          final_total?: number | null
          guide_id?: string | null
          guide_name_at_booking?: string | null
          id?: string
          land_operator_id?: string | null
          land_operator_name_at_booking?: string | null
          last_paid_at?: string | null
          last_payment_method?: string | null
          locked_at?: string | null
          nationality_id?: string | null
          nationality_name_at_booking?: string | null
          note?: string | null
          notes?: string | null
          number_of_guests?: number | null
          payment_status?: string
          payment_total?: number
          settlement_status?: string
          start_date?: string | null
          submission_count?: number
          submitted_at?: string | null
          summary?: Json | null
          total_after_advance?: number | null
          total_after_collections?: number | null
          total_after_tip?: number | null
          total_days?: number | null
          total_guests?: number | null
          total_tabs?: number | null
          tour_code: string
          updated_at?: string | null
          water_warning_dismissed?: boolean | null
        }
        Update: {
          adults?: number | null
          advance_payment?: number | null
          approved_at?: string | null
          approved_by?: string | null
          children?: number | null
          client_name?: string | null
          client_phone?: string | null
          collections_for_company?: number | null
          company_id?: string | null
          company_name_at_booking?: string | null
          company_tip?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          driver_name?: string | null
          end_date?: string | null
          final_total?: number | null
          guide_id?: string | null
          guide_name_at_booking?: string | null
          id?: string
          land_operator_id?: string | null
          land_operator_name_at_booking?: string | null
          last_paid_at?: string | null
          last_payment_method?: string | null
          locked_at?: string | null
          nationality_id?: string | null
          nationality_name_at_booking?: string | null
          note?: string | null
          notes?: string | null
          number_of_guests?: number | null
          payment_status?: string
          payment_total?: number
          settlement_status?: string
          start_date?: string | null
          submission_count?: number
          submitted_at?: string | null
          summary?: Json | null
          total_after_advance?: number | null
          total_after_collections?: number | null
          total_after_tip?: number | null
          total_days?: number | null
          total_guests?: number | null
          total_tabs?: number | null
          tour_code?: string
          updated_at?: string | null
          water_warning_dismissed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tours_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tours_land_operator_id_fkey"
            columns: ["land_operator_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string
          full_name: string | null
          id: string
          permissions: string[] | null
          role: string
          settlement_role: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email: string
          full_name?: string | null
          id: string
          permissions?: string[] | null
          role?: string
          settlement_role?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string
          full_name?: string | null
          id?: string
          permissions?: string[] | null
          role?: string
          settlement_role?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_user_permission: {
        Args: { required_permissions: string[]; user_id: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      refresh_tour_payment_summary: {
        Args: { p_tour: string }
        Returns: undefined
      }
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
