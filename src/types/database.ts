export interface AdminUser {
  id: string
  email: string
  name: string
  password_hash: string
  role: 'admin' | 'super_admin' | 'code_generator'
  permissions: {
    canManageUsers?: boolean
    canManageSettings?: boolean
    canManageEvents?: boolean
    canGenerateCodes?: boolean
    canViewAnalytics?: boolean
    canManageEmails?: boolean
  }
  last_login?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface AccessCode {
  id: string
  code: string
  type: 'center' | 'individual' | 'bulk'
  name: string
  email?: string
  max_concurrent_sessions: number
  usage_count?: number
  max_usage_count?: number
  event_id?: string
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

export interface BulkAccessCode extends AccessCode {
  type: 'bulk'
  usage_count: number
  max_usage_count: number
  expires_at: string
}

export interface BulkCodeUsage {
  code_id: string
  current_usage: number
  max_capacity: number
  active_sessions: number
  capacity_percentage: number
  is_near_capacity: boolean
  is_expired: boolean
  time_remaining_minutes: number
}

export interface EventAttendance {
  event_id: string
  event_title: string
  total_attendees: number
  bulk_code_attendees: number
  individual_attendees: number
  center_attendees: number
  active_sessions: number
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
  meta?: {
    total?: number
    limit?: number
    offset?: number
    hasMore?: boolean
  }
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
  bulkCodes: number
  activeBulkCodes: number
  nearCapacityBulkCodes: number
}

export interface BulkCodeAnalytics {
  code_id: string
  code_name: string
  created_at: string
  expires_at: string
  max_usage_count: number
  total_usage: number
  peak_concurrent_usage: number
  average_session_duration: number
  usage_by_hour: Array<{
    hour: number
    usage_count: number
  }>
  usage_by_day: Array<{
    date: string
    usage_count: number
  }>
  capacity_utilization: number
  time_to_peak: number
  is_expired: boolean
  event_title?: string
}

export interface BulkCodeUsageHistory {
  code_id: string
  session_id: string
  started_at: string
  ended_at?: string
  duration_minutes?: number
  ip_address: string
  user_agent: string
}

export interface BulkCodeCapacityMetrics {
  total_bulk_codes: number
  active_bulk_codes: number
  expired_bulk_codes: number
  average_capacity_utilization: number
  codes_at_full_capacity: number
  codes_near_capacity: number
  total_capacity_available: number
  total_capacity_used: number
}

export interface BulkCodeExportData {
  code_id: string
  code_name: string
  code_value: string
  type: string
  created_at: string
  expires_at: string
  max_usage_count: number
  current_usage: number
  capacity_utilization: number
  is_active: boolean
  is_expired: boolean
  event_title?: string
  created_by_email: string
  total_sessions: number
  active_sessions: number
  average_session_duration: number
  peak_concurrent_usage: number
  first_usage_at?: string
  last_usage_at?: string
}