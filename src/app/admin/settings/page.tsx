import { SystemSettings } from '@/components/admin/SystemSettings'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600">
          Configure system preferences and options
        </p>
      </div>

      <SystemSettings />
    </div>
  )
}