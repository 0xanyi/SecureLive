"use client";

import { useState, useEffect } from "react";
import { CurrentEvent } from "@/types/database";
import { formatEventPeriod } from "@/lib/utils";

export function CurrentEventBanner() {
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
      const response = await fetch("/api/events/current");
      if (response.ok) {
        const data = await response.json();
        setCurrentEvent(data.event || null);
      }
    } catch (error) {
      console.error("Error fetching current event:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !currentEvent) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-lg">
      <div className="text-center space-y-2">
        {/* Line 1: Ongoing Event */}
        <div className="flex items-center justify-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="font-semibold text-sm uppercase tracking-wide text-gray-700">
            Ongoing Event
          </span>
        </div>

        {/* Line 2: Event Title - Big */}
        <h3 className="text-2xl font-bold text-gray-900">
          {currentEvent.title}
        </h3>

        {/* Line 3: Date */}
        <div className="text-gray-600 font-medium">
          {formatEventPeriod(currentEvent.start_date, currentEvent.end_date)}
        </div>

        {/* Description if available */}
        {currentEvent.description && (
          <p className="text-gray-500 text-sm mt-3">
            {currentEvent.description}
          </p>
        )}
      </div>
    </div>
  );
}
