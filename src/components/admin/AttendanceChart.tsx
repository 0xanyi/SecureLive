'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface AttendanceData {
  date: string
  centers: number
  individuals: number
  total: number
}

interface AttendanceChartProps {
  data: AttendanceData[]
}

export function AttendanceChart({ data }: AttendanceChartProps) {
  // Format data for the chart
  const chartData = data.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric'
    })
  }))

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Daily Attendance</h3>
        <p className="text-sm text-gray-600">User sessions by day and type</p>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="centers" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              name="Centers"
            />
            <Line 
              type="monotone" 
              dataKey="individuals" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              name="Individuals"
            />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
              name="Total"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {data.length === 0 && (
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <div className="text-gray-400 mb-4">
              📊
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No attendance data yet
            </h3>
            <p className="text-gray-500">
              Data will appear here once users start accessing the stream.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}