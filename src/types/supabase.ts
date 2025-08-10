export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      admin_users: {
        Row: {
          id: string
          email: string
          password_hash: string
          role: 'admin' | 'super_admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          role?: 'admin' | 'super_admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          role?: 'admin' | 'super_admin'
          created_at?: string
          updated_at?: string
        }
      }
      access_codes: {
        Row: {
          id: string
          code: string
          type: 'center' | 'individual'
          name: string
          email: string | null
          max_concurrent_sessions: number
          is_active: boolean
          created_by: string
          created_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          code: string
          type: 'center' | 'individual'
          name: string
          email?: string | null
          max_concurrent_sessions?: number
          is_active?: boolean
          created_by: string
          created_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          code?: string
          type?: 'center' | 'individual'
          name?: string
          email?: string | null
          max_concurrent_sessions?: number
          is_active?: boolean
          created_by?: string
          created_at?: string
          expires_at?: string | null
        }
      }
      sessions: {
        Row: {
          id: string
          code_id: string
          session_token: string
          ip_address: string
          user_agent: string
          started_at: string
          last_activity: string
          ended_at: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          code_id: string
          session_token: string
          ip_address: string
          user_agent: string
          started_at?: string
          last_activity?: string
          ended_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          code_id?: string
          session_token?: string
          ip_address?: string
          user_agent?: string
          started_at?: string
          last_activity?: string
          ended_at?: string | null
          is_active?: boolean
        }
      }
      attendance_logs: {
        Row: {
          id: string
          code_id: string
          session_id: string
          date: string
          login_time: string
          logout_time: string | null
          duration_minutes: number | null
        }
        Insert: {
          id?: string
          code_id: string
          session_id: string
          date: string
          login_time: string
          logout_time?: string | null
          duration_minutes?: number | null
        }
        Update: {
          id?: string
          code_id?: string
          session_id?: string
          date?: string
          login_time?: string
          logout_time?: string | null
          duration_minutes?: number | null
        }
      }
      email_logs: {
        Row: {
          id: string
          code_id: string
          email_type: string
          recipient_email: string
          sent_at: string
          status: string
          brevo_message_id: string | null
        }
        Insert: {
          id?: string
          code_id: string
          email_type: string
          recipient_email: string
          sent_at?: string
          status: string
          brevo_message_id?: string | null
        }
        Update: {
          id?: string
          code_id?: string
          email_type?: string
          recipient_email?: string
          sent_at?: string
          status?: string
          brevo_message_id?: string | null
        }
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          start_date: string
          end_date: string
          is_active: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          start_date: string
          end_date: string
          is_active?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          start_date?: string
          end_date?: string
          is_active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
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