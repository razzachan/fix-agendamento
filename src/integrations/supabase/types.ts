export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agendamentos_ai: {
        Row: {
          created_at: string | null
          endereco: string
          equipamento: string
          id: string
          nome: string
          problema: string
          status: string
          tecnico: string | null
          urgente: boolean | null
          data_agendada: string | null
          telefone: string | null
          cpf: string | null
          email: string | null
          origem: string | null
        }
        Insert: {
          created_at?: string | null
          endereco: string
          equipamento: string
          id?: string
          nome: string
          problema: string
          status?: string
          tecnico?: string | null
          urgente?: boolean | null
          data_agendada?: string | null
          telefone?: string | null
          cpf?: string | null
          email?: string | null
          origem?: string | null
        }
        Update: {
          created_at?: string | null
          endereco?: string
          equipamento?: string
          id?: string
          nome?: string
          problema?: string
          status?: string
          tecnico?: string | null
          urgente?: boolean | null
          data_agendada?: string | null
          telefone?: string | null
          cpf?: string | null
          email?: string | null
          origem?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          address_complement: string | null
          address_reference: string | null
          city: string | null
          cpf_cnpj: string | null
          email: string
          id: string
          name: string
          phone: string | null
          state: string | null
          user_id: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          address_reference?: string | null
          city?: string | null
          cpf_cnpj?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          state?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          address_reference?: string | null
          city?: string | null
          cpf_cnpj?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          state?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_diagnostics: {
        Row: {
          created_at: string | null
          diagnosis_details: string
          estimated_completion_date: string | null
          estimated_cost: number | null
          id: string
          parts_purchase_link: string | null
          recommended_service: string | null
          service_order_id: string
          updated_at: string | null
          workshop_user_id: string
        }
        Insert: {
          created_at?: string | null
          diagnosis_details: string
          estimated_completion_date?: string | null
          estimated_cost?: number | null
          id?: string
          parts_purchase_link?: string | null
          recommended_service?: string | null
          service_order_id: string
          updated_at?: string | null
          workshop_user_id: string
        }
        Update: {
          created_at?: string | null
          diagnosis_details?: string
          estimated_completion_date?: string | null
          estimated_cost?: number | null
          id?: string
          parts_purchase_link?: string | null
          recommended_service?: string | null
          service_order_id?: string
          updated_at?: string | null
          workshop_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_diagnostics_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string
          date: string
          description: string
          id: string
          paid_status: string
          service_order_id: string | null
          type: string
        }
        Insert: {
          amount: number
          category: string
          date: string
          description: string
          id?: string
          paid_status: string
          service_order_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          category?: string
          date?: string
          description?: string
          id?: string
          paid_status?: string
          service_order_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          description: string
          id: string
          read: boolean | null
          time: string | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          description: string
          id?: string
          read?: boolean | null
          time?: string | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          description?: string
          id?: string
          read?: boolean | null
          time?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar: string | null
          city: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          role: string
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          avatar?: string | null
          city?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          phone?: string | null
          role: string
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          avatar?: string | null
          city?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role?: string
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      scheduled_services: {
        Row: {
          address: string
          client_id: string | null
          client_name: string
          description: string
          id: string
          scheduled_end_time: string
          scheduled_start_time: string
          service_order_id: string | null
          status: string
          technician_id: string | null
          technician_name: string
        }
        Insert: {
          address: string
          client_id?: string | null
          client_name: string
          description: string
          id?: string
          scheduled_end_time: string
          scheduled_start_time: string
          service_order_id?: string | null
          status: string
          technician_id?: string | null
          technician_name: string
        }
        Update: {
          address?: string
          client_id?: string | null
          client_name?: string
          description?: string
          id?: string
          scheduled_end_time?: string
          scheduled_start_time?: string
          service_order_id?: string | null
          status?: string
          technician_id?: string | null
          technician_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_services_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_services_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      service_events: {
        Row: {
          created_at: string | null
          created_by: string
          description: string
          id: string
          service_order_id: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description: string
          id?: string
          service_order_id?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string
          id?: string
          service_order_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_events_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_images: {
        Row: {
          created_at: string
          id: string
          name: string
          service_order_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          service_order_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          service_order_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_images_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          archived: boolean | null
          client_email: string | null
          client_id: string | null
          client_name: string
          client_phone: string | null
          completed_date: string | null
          created_at: string | null
          current_location: string | null
          description: string
          equipment_model: string | null
          equipment_serial: string | null
          equipment_type: string
          id: string
          needs_pickup: boolean | null
          pickup_address: string | null
          pickup_city: string | null
          pickup_state: string | null
          pickup_zip_code: string | null
          scheduled_date: string | null
          service_attendance_type: string | null
          status: string
          technician_id: string | null
          technician_name: string | null
        }
        Insert: {
          archived?: boolean | null
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          completed_date?: string | null
          created_at?: string | null
          current_location?: string | null
          description: string
          equipment_model?: string | null
          equipment_serial?: string | null
          equipment_type: string
          id?: string
          needs_pickup?: boolean | null
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_state?: string | null
          pickup_zip_code?: string | null
          scheduled_date?: string | null
          service_attendance_type?: string | null
          status: string
          technician_id?: string | null
          technician_name?: string | null
        }
        Update: {
          archived?: boolean | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          completed_date?: string | null
          created_at?: string | null
          current_location?: string | null
          description?: string
          equipment_model?: string | null
          equipment_serial?: string | null
          equipment_type?: string
          id?: string
          needs_pickup?: boolean | null
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_state?: string | null
          pickup_zip_code?: string | null
          scheduled_date?: string | null
          service_attendance_type?: string | null
          status?: string
          technician_id?: string | null
          technician_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      technicians: {
        Row: {
          email: string
          id: string
          location: Json | null
          name: string
          phone: string | null
          specialties: string[] | null
          user_id: string | null
        }
        Insert: {
          email: string
          id?: string
          location?: Json | null
          name: string
          phone?: string | null
          specialties?: string[] | null
          user_id?: string | null
        }
        Update: {
          email?: string
          id?: string
          location?: Json | null
          name?: string
          phone?: string | null
          specialties?: string[] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technicians_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          avatar: string | null
          city: string | null
          email: string
          id: string
          name: string
          password: string | null
          phone: string | null
          role: string
          state: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          avatar?: string | null
          city?: string | null
          email: string
          id?: string
          name: string
          password?: string | null
          phone?: string | null
          role: string
          state?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          avatar?: string | null
          city?: string | null
          email?: string
          id?: string
          name?: string
          password?: string | null
          phone?: string | null
          role?: string
          state?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_service_order: {
        Args: { order_id: string }
        Returns: boolean
      }
      create_client: {
        Args: {
          client_name: string
          client_email: string
          client_phone: string
          client_address: string
          client_city: string
          client_state: string
          client_zip_code: string
        }
        Returns: {
          address: string | null
          address_complement: string | null
          address_reference: string | null
          city: string | null
          cpf_cnpj: string | null
          email: string
          id: string
          name: string
          phone: string | null
          state: string | null
          user_id: string | null
          zip_code: string | null
        }[]
      }
      get_all_clients: {
        Args: Record<PropertyKey, never>
        Returns: {
          address: string | null
          address_complement: string | null
          address_reference: string | null
          city: string | null
          cpf_cnpj: string | null
          email: string
          id: string
          name: string
          phone: string | null
          state: string | null
          user_id: string | null
          zip_code: string | null
        }[]
      }
      get_client_by_id: {
        Args: { client_id: string }
        Returns: {
          address: string | null
          address_complement: string | null
          address_reference: string | null
          city: string | null
          cpf_cnpj: string | null
          email: string
          id: string
          name: string
          phone: string | null
          state: string | null
          user_id: string | null
          zip_code: string | null
        }[]
      }
      get_diagnosis_events: {
        Args: { p_service_order_id: string }
        Returns: {
          created_at: string | null
          created_by: string
          description: string
          id: string
          service_order_id: string | null
          type: string
        }[]
      }
      insert_equipment_diagnosis: {
        Args: {
          p_service_order_id: string
          p_workshop_user_id: string
          p_diagnosis_details: string
          p_recommended_service: string
          p_estimated_cost: number
          p_estimated_completion_date: string
          p_parts_purchase_link: string
        }
        Returns: {
          created_at: string | null
          diagnosis_details: string
          estimated_completion_date: string | null
          estimated_cost: number | null
          id: string
          parts_purchase_link: string | null
          recommended_service: string | null
          service_order_id: string
          updated_at: string | null
          workshop_user_id: string
        }[]
      }
      insert_service_event: {
        Args: {
          p_service_order_id: string
          p_type: string
          p_created_by: string
          p_description: string
        }
        Returns: string
      }
      update_client: {
        Args: {
          client_id: string
          client_name: string
          client_email: string
          client_phone: string
          client_address: string
          client_city: string
          client_state: string
          client_zip_code: string
        }
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
