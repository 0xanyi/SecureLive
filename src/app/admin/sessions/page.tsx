import { SessionsManagement } from '@/components/admin/SessionsManagement'

export default function SessionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Active Sessions</h1>
        <p className="text-gray-600">
          Monitor and manage live user sessions
        </p>
      </div>

      <SessionsManagement />
    </div>
  )
}