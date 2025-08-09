import { CodeGenerator } from '@/components/admin/CodeGenerator'

export default function GenerateCodesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Generate Access Codes</h1>
        <p className="text-gray-600">
          Create new access codes for events and participants
        </p>
      </div>

      <CodeGenerator />
    </div>
  )
}