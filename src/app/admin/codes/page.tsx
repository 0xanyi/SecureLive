import { createServiceClient } from '@/lib/supabase/server'
import { CodesTable } from '@/components/admin/CodesTable'
import { CodeGenerator } from '@/components/admin/CodeGenerator'
import { Plus, Download } from 'lucide-react'
import Link from 'next/link'

export default async function CodesPage() {
  const supabase = await createServiceClient()

  // Fetch access codes with creator info (using left join to include codes with null created_by)
  const { data: codes, error } = await supabase
    .from('access_codes')
    .select(`
      *,
      admin_users (email)
    `)
    .order('created_at', { ascending: false })

  // Log any errors for debugging
  if (error) {
    console.error('Error fetching codes:', error)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Access Codes</h1>
          <p className="text-gray-600">
            Manage access codes for centers and individuals
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
          
          <Link
            href="/admin/codes/generate"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Generate Codes
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Total Codes</p>
          <p className="text-2xl font-bold text-gray-900">
            {codes?.length || 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Active Codes</p>
          <p className="text-2xl font-bold text-green-600">
            {codes?.filter(code => code.is_active).length || 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Center Codes</p>
          <p className="text-2xl font-bold text-blue-600">
            {codes?.filter(code => code.type === 'center').length || 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Individual Codes</p>
          <p className="text-2xl font-bold text-purple-600">
            {codes?.filter(code => code.type === 'individual').length || 0}
          </p>
        </div>
      </div>

      {/* Codes Table */}
      <CodesTable codes={codes || []} />
    </div>
  )
}