import { formatDate } from '@/lib/utils'
import { User, Building2, Clock } from 'lucide-react'

interface Session {
  id: string
  started_at: string
  ip_address: string
  is_active: boolean
  access_codes: {
    code: string
    name: string
    type: 'center' | 'individual'
  }
}

interface RecentActivityProps {
  sessions: Session[]
}

export function RecentActivity({ sessions }: RecentActivityProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <p className="text-sm text-gray-600">Latest user sessions and logins</p>
      </div>
      
      <div className="p-6">
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    session.access_codes.type === 'center' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-green-100 text-green-600'
                  }`}>
                    {session.access_codes.type === 'center' ? (
                      <Building2 className="w-4 h-4" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  
                  <div>
                    <p className="font-medium text-gray-900">
                      {session.access_codes.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Code: {session.access_codes.code} • IP: {session.ip_address}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      session.is_active ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <span className={`text-xs font-medium ${
                      session.is_active ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {session.is_active ? 'Active' : 'Ended'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatDate(session.started_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}