import { EmailTemplateManagement } from '@/components/admin/EmailTemplateManagement'

export default function EmailsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email Management</h1>
        <p className="text-gray-600">
          Manage email templates and send notifications
        </p>
      </div>

      <EmailTemplateManagement />
    </div>
  )
}