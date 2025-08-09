'use client'

import { Calendar, Clock } from 'lucide-react'

interface EventDay {
  date: string
  day: string
  active: boolean
}

interface EventScheduleProps {
  days: EventDay[]
}

export function EventSchedule({ days }: EventScheduleProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-blue-400" />
        Event Schedule
      </h3>
      
      <div className="space-y-3">
        {days.map((day, index) => (
          <div
            key={day.date}
            className={`p-3 rounded-lg border transition-colors ${
              day.active
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-600 bg-gray-700/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`font-medium ${
                  day.active ? 'text-blue-400' : 'text-white'
                }`}>
                  Day {index + 1} - {day.day}
                </h4>
                <p className="text-sm text-gray-400">
                  {new Date(day.date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
              </div>
              
              {day.active && (
                <div className="flex items-center gap-1 text-blue-400">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium">Today</span>
                </div>
              )}
            </div>
            
            {/* Session times - placeholder for now */}
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>Sessions throughout the day</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-400 text-center">
          All times in your local timezone
        </p>
      </div>
    </div>
  )
}