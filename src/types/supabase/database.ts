export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          role: 'admin' | 'technician' | 'client' | 'workshop'
          avatar: string | null
          password: string | null
          phone: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
        }
        Insert: {
          id?: string
          name: string
          email: string
          role: 'admin' | 'technician' | 'client' | 'workshop'
          avatar?: string | null
          password?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: 'admin' | 'technician' | 'client' | 'workshop'
          avatar?: string | null
          password?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          role: 'admin' | 'technician' | 'client' | 'workshop'
          avatar: string | null
          phone: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          role: 'admin' | 'technician' | 'client' | 'workshop'
          avatar?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: 'admin' | 'technician' | 'client' | 'workshop'
          avatar?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          user_id?: string | null
        }
      }
      technicians: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          specialties: string[] | null
          location: { lat: number; lng: number } | null
          user_id: string | null
          is_active: boolean | null
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          specialties?: string[] | null
          location?: { lat: number; lng: number } | null
          user_id?: string | null
          is_active?: boolean | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          specialties?: string[] | null
          location?: { lat: number; lng: number } | null
          user_id?: string | null
          is_active?: boolean | null
        }
      }
      service_orders: {
        Row: {
          id: string
          order_number: string | null
          client_id: string | null
          client_name: string
          technician_id: string | null
          technician_name: string | null
          status: 'pending' | 'scheduled' | 'in_progress' | 'on_the_way' | 'collected' | 'at_workshop' | 'collected_for_delivery' | 'on_the_way_to_deliver' | 'payment_pending' | 'completed' | 'cancelled'
          created_at: string
          scheduled_date: string | null
          completed_date: string | null
          description: string
          equipment_type: string
          equipment_model: string | null
          equipment_serial: string | null
          needs_pickup: boolean
          pickup_address: string | null
          pickup_city: string | null
          pickup_state: string | null
          pickup_zip_code: string | null
          current_location: 'client' | 'transit' | 'workshop' | 'delivered' | null
          service_attendance_type: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico'
          workshop_id: string | null
          workshop_name: string | null
        }
        Insert: {
          id?: string
          client_id?: string | null
          client_name: string
          technician_id?: string | null
          technician_name?: string | null
          status: 'pending' | 'scheduled' | 'in_progress' | 'on_the_way' | 'collected' | 'at_workshop' | 'collected_for_delivery' | 'on_the_way_to_deliver' | 'payment_pending' | 'completed' | 'cancelled'
          created_at?: string
          scheduled_date?: string | null
          completed_date?: string | null
          description: string
          equipment_type: string
          equipment_model?: string | null
          equipment_serial?: string | null
          needs_pickup?: boolean
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_state?: string | null
          pickup_zip_code?: string | null
          current_location?: 'client' | 'transit' | 'workshop' | 'delivered' | null
          service_attendance_type?: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico'
          workshop_id?: string | null
          workshop_name?: string | null
        }
        Update: {
          id?: string
          client_id?: string | null
          client_name?: string
          technician_id?: string | null
          technician_name?: string | null
          status?: 'pending' | 'scheduled' | 'in_progress' | 'on_the_way' | 'collected' | 'at_workshop' | 'collected_for_delivery' | 'on_the_way_to_deliver' | 'payment_pending' | 'completed' | 'cancelled'
          created_at?: string
          scheduled_date?: string | null
          completed_date?: string | null
          description?: string
          equipment_type?: string
          equipment_model?: string | null
          equipment_serial?: string | null
          needs_pickup?: boolean
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_state?: string | null
          pickup_zip_code?: string | null
          current_location?: 'client' | 'transit' | 'workshop' | 'delivered' | null
          service_attendance_type?: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico' | null
          workshop_id?: string | null
          workshop_name?: string | null
        }
      }
      service_events: {
        Row: {
          id: string
          service_order_id: string
          type: 'status_change' | 'note' | 'pickup' | 'delivery' | 'diagnosis' | 'repair'
          description: string
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          service_order_id: string
          type: 'status_change' | 'note' | 'pickup' | 'delivery' | 'diagnosis' | 'repair'
          description: string
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          service_order_id?: string
          type?: 'status_change' | 'note' | 'pickup' | 'delivery' | 'diagnosis' | 'repair'
          description?: string
          created_at?: string
          created_by?: string
        }
      }
      equipment_qr_codes: {
        Row: {
          id: string
          qr_code: string
          service_order_id: string
          equipment_serial: string | null
          generated_at: string
          generated_by: string | null
          status: 'active' | 'damaged' | 'replaced' | 'inactive'
          print_count: number
          last_scanned_at: string | null
          last_scanned_by: string | null
          current_location: 'client' | 'transit' | 'workshop' | 'delivered'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          qr_code: string
          service_order_id: string
          equipment_serial?: string | null
          generated_at?: string
          generated_by?: string | null
          status?: 'active' | 'damaged' | 'replaced' | 'inactive'
          print_count?: number
          last_scanned_at?: string | null
          last_scanned_by?: string | null
          current_location?: 'client' | 'transit' | 'workshop' | 'delivered'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          qr_code?: string
          service_order_id?: string
          equipment_serial?: string | null
          generated_at?: string
          generated_by?: string | null
          status?: 'active' | 'damaged' | 'replaced' | 'inactive'
          print_count?: number
          last_scanned_at?: string | null
          last_scanned_by?: string | null
          current_location?: 'client' | 'transit' | 'workshop' | 'delivered'
          created_at?: string
          updated_at?: string
        }
      }
      qr_tracking_events: {
        Row: {
          id: string
          qr_code_id: string
          service_order_id: string
          event_type: 'generated' | 'printed' | 'scanned' | 'location_update' | 'status_change'
          checkpoint: 'collection' | 'workshop_arrival' | 'workshop_departure' | 'delivery' | 'manual' | null
          location: string | null
          coordinates: string | null
          scanned_by: string | null
          scanned_at: string
          notes: string | null
          metadata: any | null
          created_at: string
        }
        Insert: {
          id?: string
          qr_code_id: string
          service_order_id: string
          event_type: 'generated' | 'printed' | 'scanned' | 'location_update' | 'status_change'
          checkpoint?: 'collection' | 'workshop_arrival' | 'workshop_departure' | 'delivery' | 'manual' | null
          location?: string | null
          coordinates?: string | null
          scanned_by?: string | null
          scanned_at?: string
          notes?: string | null
          metadata?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          qr_code_id?: string
          service_order_id?: string
          event_type?: 'generated' | 'printed' | 'scanned' | 'location_update' | 'status_change'
          checkpoint?: 'collection' | 'workshop_arrival' | 'workshop_departure' | 'delivery' | 'manual' | null
          location?: string | null
          coordinates?: string | null
          scanned_by?: string | null
          scanned_at?: string
          notes?: string | null
          metadata?: any | null
          created_at?: string
        }
      }
      scheduled_services: {
        Row: {
          id: string
          service_order_id: string
          technician_id: string
          technician_name: string
          client_id: string
          client_name: string
          scheduled_start_time: string
          scheduled_end_time: string
          address: string
          description: string
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
        }
        Insert: {
          id?: string
          service_order_id: string
          technician_id: string
          technician_name: string
          client_id: string
          client_name: string
          scheduled_start_time: string
          scheduled_end_time: string
          address: string
          description: string
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
        }
        Update: {
          id?: string
          service_order_id?: string
          technician_id?: string
          technician_name?: string
          client_id?: string
          client_name?: string
          scheduled_start_time?: string
          scheduled_end_time?: string
          address?: string
          description?: string
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
        }
      }
      financial_transactions: {
        Row: {
          id: string
          service_order_id: string | null
          type: 'income' | 'expense'
          amount: number
          description: string
          category: string
          date: string
          paid_status: 'pending' | 'paid' | 'overdue'
        }
        Insert: {
          id?: string
          service_order_id?: string | null
          type: 'income' | 'expense'
          amount: number
          description: string
          category: string
          date: string
          paid_status: 'pending' | 'paid' | 'overdue'
        }
        Update: {
          id?: string
          service_order_id?: string | null
          type?: 'income' | 'expense'
          amount?: number
          description?: string
          category?: string
          date?: string
          paid_status?: 'pending' | 'paid' | 'overdue'
        }
      }
      service_order_images: {
        Row: {
          id: string
          service_order_id: string
          url: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          service_order_id: string
          url: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          service_order_id?: string
          url?: string
          name?: string
          created_at?: string
        }
      }
    }
  }
}
