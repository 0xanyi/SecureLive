import { BulkCodeAnalytics } from '@/components/admin/BulkCodeAnalytics'

export default function BulkAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Bulk Code Analytics</h1>
        <p className="text-gray-600 mt-2">
          Comprehensive analytics and reporting for bulk access codes
        </p>
      </div>

      <BulkCodeAnalytics />
    </div>
  )
}