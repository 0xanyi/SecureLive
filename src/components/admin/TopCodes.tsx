'use client'

import { Building2, User, TrendingUp } from 'lucide-react'

interface AttendanceLog {
  code_id: string
  access_codes: {
    code: string
    name: string
    type: 'center' | 'individual'
  }
}

interface TopCodesProps {
  attendanceData: AttendanceLog[]
}

export function TopCodes({ attendanceData }: TopCodesProps) {
  // Calculate usage by code
  const codeUsage = attendanceData.reduce((acc, log) => {
    const key = log.code_id
    if (!acc[key]) {
      acc[key] = {
        ...log.access_codes,
        count: 0
      }
    }
    acc[key].count++
    return acc
  }, {} as Record<string, any>)

  // Sort by usage and take top 5
  const topCodes = Object.values(codeUsage)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Top Access Codes</h3>
        <p className="text-sm text-gray-600">Most frequently used codes</p>
      </div>
      
      <div className="space-y-4">
        {topCodes.map((code: any, index) => (
          <div key={code.code} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                {index + 1}
              </div>
              
              <div className={`p-2 rounded-lg ${
                code.type === 'center' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-green-100 text-green-600'
              }`}>
                {code.type === 'center' ? (
                  <Building2 className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              
              <div>
                <p className="font-medium text-gray-900">{code.name}</p>
                <p className="text-sm text-gray-500 font-mono">{code.code}</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="font-semibold text-gray-900">{code.count}</p>
              <p className="text-xs text-gray-500">sessions</p>
            </div>
          </div>
        ))}
      </div>

      {topCodes.length === 0 && (
        <div className="text-center py-8">
          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No usage data available</p>
        </div>
      )}
    </div>
  )
}