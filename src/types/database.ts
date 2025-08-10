export interface AdminUser {
  id: string
  email: string
  name: string
  password_hash: string
  role: 'admin' | 'super_admin'
  last_login?: string
  created_at: string
  updated_at: string
}

export interface AccessCode {
  id: string
  code: string
  type: 'center' | 'individual'
  name: string
  email?: string
  max_concurrent_sessions: number
  is_active: boolean
  created_by: string
  created_at: string
  expires_at?: string
}

export interface Session {
  id: string
  code_id: string
  session_token: string
  ip_address: string
  user_agent: string
  started_at: string
  last_activity: string
  ended_at?: string
  is_active: boolean
}

export interface AttendanceLog {
  id: string
  code_id: string
  session_id: string
  date: string
  login_time: string
  logout_time?: string
  duration_minutes?: number
}

export interface EmailLog {
  id: string
  code_id: string
  email_type: string
  recipient_email: string
  sent_at: string
  status: string
  brevo_message_id?: string
}

export interface Event {
  id: string
  title: string
  description?: string
  start_date: string
  end_date: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface CurrentEvent {
  id: string
  title: string
  description?: string
  start_date: string
  end_date: string
  duration_minutes: number
  time_remaining_minutes: number
}

// Database table names
export type Tables = {
  admin_users: AdminUser
  access_codes: AccessCode
  sessions: Session
  attendance_logs: AttendanceLog
  email_logs: EmailLog
  events: Event
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface SessionValidationResponse {
  valid: boolean
  session?: Session
  accessCode?: AccessCode
  error?: string
}

export interface AttendanceStats {
  date: string
  centers: number
  individuals: number
  total: number
}

export interface DashboardStats {
  totalCodes: number
  activeCodes: number
  totalSessions: number
  activeSessions: number
  todayAttendance: number
  centerCodes: number
  individualCodes: number
}