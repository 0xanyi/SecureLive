'use client'

import { useState } from 'react'
import { Download, Calendar, FileText, Users, Key } from 'lucide-react'

export default function ExportPage() {
  const [exportType, setExportType] = useState('attendance')
  const [format, setFormat] = useState('csv')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  // Set default dates (last 30 days)
  useState(() => {
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)
    
    setEndDate(today.toISOString().split('T')[0])
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
  })

  const handleExport = async () => {
    setIsExporting(true)
    
    try {
      const params = new URLSearchParams({
        type: exportType,
        format: format,
        ...(exportType === 'attendance' && startDate && endDate && {
          startDate,
          endDate
        })
      })

      const response = await fetch(`/api/admin/export?${params}`)
      
      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Get filename from response headers or create default
      const contentDisposition = response.headers.get('content-disposition')
      let filename = `export-${exportType}-${new Date().toISOString().split('T')[0]}.${format}`
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
    } catch (error) {
      console.error('Export error:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const exportOptions = [
    {
      id: 'attendance',
      title: 'Attendance Logs',
      description: 'Export attendance data with login/logout times',
      icon: Calendar,
      requiresDateRange: true
    },
    {
      id: 'codes',
      title: 'Access Codes',
      description: 'Export all access codes and their details',
      icon: Key,
      requiresDateRange: false
    },
    {
      id: 'sessions',
      title: 'Active Sessions',
      description: 'Export currently active user sessions',
      icon: Users,
      requiresDateRange: false
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Export Data</h1>
        <p className="text-gray-600">Download reports and data exports</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Export Options</h2>
          <p className="text-sm text-gray-600">Select what data you want to export</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Export Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Data Type
            </label>
            <div className="grid grid-cols-1 gap-3">
              {exportOptions.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    exportType === option.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportType"
                    value={option.id}
                    checked={exportType === option.id}
                    onChange={(e) => setExportType(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`p-2 rounded-lg ${
                    exportType === option.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <option.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{option.title}</p>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range (for attendance only) */}
          {exportType === 'attendance' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Export Format
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={(e) => setFormat(e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">CSV (Excel compatible)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={format === 'json'}
                  onChange={(e) => setFormat(e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">JSON</span>
              </label>
            </div>
          </div>

          {/* Export Button */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleExport}
              disabled={isExporting || (exportType === 'attendance' && (!startDate || !endDate))}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export {exportType.charAt(0).toUpperCase() + exportType.slice(1)}
                </>
              )}
            </button>
            
            {exportType === 'attendance' && (!startDate || !endDate) && (
              <p className="text-sm text-red-600 mt-2">
                Please select both start and end dates for attendance export.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Export Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Export Information</h3>
            <div className="text-sm text-blue-800 mt-1 space-y-1">
              <p>• CSV files can be opened in Excel or Google Sheets</p>
              <p>• JSON files contain raw data for technical use</p>
              <p>• Attendance exports include login/logout times and durations</p>
              <p>• All times are in your local timezone</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}