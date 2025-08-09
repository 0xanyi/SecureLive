import { Ticket, Users, Activity, TrendingUp } from 'lucide-react'
import type { DashboardStats as StatsType } from '@/types/database'

interface DashboardStatsProps {
  stats: StatsType | null
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const statCards = [
    {
      title: 'Total Access Codes',
      value: stats?.totalCodes || 0,
      icon: Ticket,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive' as const,
    },
    {
      title: 'Active Sessions',
      value: stats?.activeSessions || 0,
      icon: Users,
      color: 'bg-green-500',
      change: '+5%',
      changeType: 'positive' as const,
    },
    {
      title: 'Today\'s Attendance',
      value: stats?.todayAttendance || 0,
      icon: Activity,
      color: 'bg-purple-500',
      change: '+18%',
      changeType: 'positive' as const,
    },
    {
      title: 'Active Codes',
      value: stats?.activeCodes || 0,
      icon: TrendingUp,
      color: 'bg-orange-500',
      change: '+3%',
      changeType: 'positive' as const,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat) => (
        <div
          key={stat.title}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stat.value.toLocaleString()}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${stat.color}`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <div className="mt-4 flex items-center">
            <span
              className={`text-sm font-medium ${
                stat.changeType === 'positive'
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {stat.change}
            </span>
            <span className="text-sm text-gray-500 ml-2">from last week</span>
          </div>
        </div>
      ))}
    </div>
  )
}