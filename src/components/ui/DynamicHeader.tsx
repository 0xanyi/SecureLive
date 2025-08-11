'use client';

import { useState, useEffect } from 'react';
import { CurrentEvent } from '@/types/database';
import { formatEventPeriod } from '@/lib/utils';
import { Logo } from '@/components/ui/Logo';

export function DynamicHeader() {
  const [currentEvent, setCurrentEvent] = useState<CurrentEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentEvent();
    
    // Refresh every minute to check for events
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
    // Show default while loading
    return (
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
          <Logo size="lg" variant="dark" showText={false} />
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
          SecureLive Stream Portal
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 mb-2">
          Professional Live Streaming Access
        </p>
      </div>
    );
  }

  return (
    <div className="text-center mb-12">
      <div className="flex justify-center mb-6">
        <Logo size="lg" variant="dark" showText={false} />
      </div>
      
      {currentEvent ? (
        // Show event information
        <>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Ongoing Event
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            {currentEvent.title}
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-2">
            {formatEventPeriod(currentEvent.start_date, currentEvent.end_date)}
          </p>
          {currentEvent.description && (
            <p className="text-lg text-gray-500 mt-2">
              {currentEvent.description}
            </p>
          )}
        </>
      ) : (
        // Show default platform information
        <>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            SecureLive Stream Portal
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-2">
            Professional Live Streaming Access
          </p>
        </>
      )}
    </div>
  );
}