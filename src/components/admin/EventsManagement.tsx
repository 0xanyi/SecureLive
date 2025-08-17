'use client';

import { useState, useEffect } from 'react';
import { Event, CurrentEvent } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatEventPeriod, formatDuration } from '@/lib/utils';

interface EventFormData {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  bulk_code_ids: string[];
}

interface BulkCodeOption {
  id: string;
  code: string;
  name: string;
  usage_count: number;
  max_usage_count: number;
  capacity_percentage: number;
  is_linked_to_event: boolean;
  is_linked_to_current_event: boolean;
}

export function EventsManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentEvent, setCurrentEvent] = useState<CurrentEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [bulkCodes, setBulkCodes] = useState<BulkCodeOption[]>([]);
  const [loadingBulkCodes, setLoadingBulkCodes] = useState(false);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    bulk_code_ids: [],
  });

  useEffect(() => {
    fetchEvents();
    fetchCurrentEvent();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/admin/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchCurrentEvent = async () => {
    try {
      const response = await fetch('/api/admin/events/current');
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

  const fetchBulkCodes = async (eventId?: string) => {
    setLoadingBulkCodes(true);
    try {
      const url = eventId 
        ? `/api/admin/events/bulk-codes?event_id=${eventId}`
        : '/api/admin/events/bulk-codes';
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setBulkCodes(data.bulk_codes || []);
      }
    } catch (error) {
      console.error('Error fetching bulk codes:', error);
    } finally {
      setLoadingBulkCodes(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingEvent 
        ? `/api/admin/events/${editingEvent.id}`
        : '/api/admin/events';
      
      const method = editingEvent ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchEvents();
        await fetchCurrentEvent();
        setShowModal(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save event');
      }
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event');
    }
  };

  const handleEdit = async (event: Event) => {
    setEditingEvent(event);
    
    // Fetch bulk codes first
    await fetchBulkCodes(event.id);
    
    setFormData({
      title: event.title,
      description: event.description || '',
      start_date: new Date(event.start_date).toISOString().slice(0, 16),
      end_date: new Date(event.end_date).toISOString().slice(0, 16),
      bulk_code_ids: [], // Will be set by the checkbox state based on is_linked_to_current_event
    });
    
    setShowModal(true);
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchEvents();
        await fetchCurrentEvent();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      bulk_code_ids: [],
    });
    setEditingEvent(null);
    setBulkCodes([]);
  };

  const handleNewEvent = async () => {
    resetForm();
    await fetchBulkCodes();
    setShowModal(true);
  };

  const handleBulkCodeToggle = (codeId: string) => {
    setFormData(prev => ({
      ...prev,
      bulk_code_ids: prev.bulk_code_ids.includes(codeId)
        ? prev.bulk_code_ids.filter(id => id !== codeId)
        : [...prev.bulk_code_ids, codeId]
    }));
  };

  if (loading) {
    return <div className="text-center py-8">Loading events...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Current Event Status */}
      {currentEvent && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-900">
                🔴 Live Event: {currentEvent.title}
              </h3>
              {currentEvent.description && (
                <p className="text-green-700 mt-1">{currentEvent.description}</p>
              )}
              <div className="mt-2 text-sm text-green-600">
                <span>{formatEventPeriod(currentEvent.start_date, currentEvent.end_date)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">All Events</h2>
        <Button onClick={handleNewEvent}>
          Create New Event
        </Button>
      </div>

      {/* Events List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No events found. Create your first event to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.map((event) => {
                  const now = new Date();
                  const startDate = new Date(event.start_date);
                  const endDate = new Date(event.end_date);
                  const isActive = startDate <= now && endDate >= now;
                  const isUpcoming = startDate > now;
                  const isPast = endDate < now;

                  return (
                    <tr key={event.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {event.title}
                          </div>
                          {event.description && (
                            <div className="text-sm text-gray-500">
                              {event.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          {formatEventPeriod(event.start_date, event.end_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          isActive
                            ? 'bg-green-100 text-green-800'
                            : isUpcoming
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {isActive ? 'Live' : isUpcoming ? 'Upcoming' : 'Past'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(event)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Event Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingEvent ? 'Edit Event' : 'Create New Event'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Title *
            </label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Enter event title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter event description (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date & Time *
              </label>
              <Input
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date & Time *
              </label>
              <Input
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Bulk Code Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link Bulk Access Codes (Optional)
            </label>
            {loadingBulkCodes ? (
              <div className="text-sm text-gray-500">Loading bulk codes...</div>
            ) : bulkCodes.length === 0 ? (
              <div className="text-sm text-gray-500">
                No available bulk codes found. Create bulk codes first to link them to events.
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                {bulkCodes.map((code) => (
                  <label key={code.id} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.bulk_code_ids.includes(code.id) || code.is_linked_to_current_event}
                      onChange={() => handleBulkCodeToggle(code.id)}
                      disabled={code.is_linked_to_event && !code.is_linked_to_current_event}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          {code.name} ({code.code})
                        </span>
                        <span className="text-xs text-gray-500">
                          {code.usage_count}/{code.max_usage_count} used ({code.capacity_percentage}%)
                        </span>
                      </div>
                      {code.is_linked_to_event && !code.is_linked_to_current_event && (
                        <span className="text-xs text-orange-600">Already linked to another event</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Linking bulk codes to events will automatically deactivate them when the event ends.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Events are automatically activated based on their start and end dates. 
              No manual activation required.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingEvent ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}