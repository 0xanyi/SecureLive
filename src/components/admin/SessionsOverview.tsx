'use client'

import { formatDate } from '@/lib/utils'
import { Building2, User, Globe, Clock } from 'lucide-react'

interface ActiveSession {
  id: string
  code: string
  name: string
  type: 'center' | 'individual'
  max_concurrent_sessions: number
  session_token: string
  ip_address: string
  started_at: string
  last_activity: string
}

interface SessionsOverviewProps {
  sessions: ActiveSession[]
}

export function SessionsOverview({ sessions }: SessionsOverviewProps) {
  const getSessionDuration = (startTime: string) => {
    const start = new Date(startTime)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 60) {
      return `${diffMins}m`
    }
    
    const hours = Math.floor(diffMins / 60)
    const minutes = diffMins % 60
    return `${hours}h ${minutes}m`
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Active Sessions</h3>
            <p className="text-sm text-gray-600">Currently connected users</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-600">
              {sessions.length} active
            </span>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              No active sessions
            </h4>
            <p className="text-gray-500">
              Sessions will appear here when users are connected
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">User</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Code</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Location</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Duration</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          session.type === 'center' 
                            ? 'bg-blue-100 text-blue-600' 
                            : 'bg-green-100 text-green-600'
                        }`}>
                          {session.type === 'center' ? (
                            <Building2 className="w-4 h-4" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{session.name}</p>
                          <p className="text-sm text-gray-500 capitalize">{session.type}</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {session.code}
                      </span>
                    </td>
                    
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{session.ip_address}</span>
                      </div>
                    </td>
                    
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-900">
                        {getSessionDuration(session.started_at)}
                      </span>
                    </td>
                    
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">
                        {formatDate(session.last_activity)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}