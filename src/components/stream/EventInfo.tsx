'use client';

import { useState, useEffect } from 'react';
import { CurrentEvent } from '@/types/database';
import { formatEventPeriod } from '@/lib/utils';

export function EventInfo() {
  const [currentEvent, setCurrentEvent] = useState<CurrentEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentEvent();
    
    // Refresh every minute to update time remaining
    const interval = setInterval(fetchCurrentEvent, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchCurrentEvent = async () => {
    try {
      const response = await fetch('/api/events/current');
      if (response.ok) {
        const data = await response.json();
        setCurrentEvent(data.event || null);
      }
    } catch (error) {
      console.error('Error fetching current event:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!currentEvent) {
    return null;
  }

  const progressPercentage = Math.max(0, 
    100 - (currentEvent.time_remaining_minutes / currentEvent.duration_minutes) * 100
  );

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        <h3 className="text-lg font-semibold text-white">Live Event</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-white font-medium">{currentEvent.title}</h4>
          {currentEvent.description && (
            <p className="text-gray-400 text-sm mt-1">{currentEvent.description}</p>
          )}
        </div>

        <div>
          <div className="text-sm">
            <span className="text-gray-400 block mb-1">Event Period</span>
            <span className="text-white">
              {formatEventPeriod(currentEvent.start_date, currentEvent.end_date)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}