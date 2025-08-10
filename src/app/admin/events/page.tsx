import { EventsManagement } from "@/components/admin/EventsManagement";

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Events Management</h1>
        <p className="text-gray-600 mt-2">
          Manage live streaming events and their schedules
        </p>
      </div>
      
      <EventsManagement />
    </div>
  );
}