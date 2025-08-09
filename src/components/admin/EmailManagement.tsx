'use client'

import { useState } from 'react'
import { Mail, Send, Users, FileText, AlertCircle } from 'lucide-react'

export function EmailManagement() {
  const [selectedTemplate, setSelectedTemplate] = useState('access-code')
  const [recipients, setRecipients] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const templates = [
    {
      id: 'access-code',
      name: 'Access Code Distribution',
      subject: 'Your STPPL Event Access Code',
      preview: 'Send access codes to participants'
    },
    {
      id: 'reminder',
      name: 'Event Reminder',
      subject: 'STPPL Event Reminder',
      preview: 'Remind participants about upcoming events'
    },
    {
      id: 'welcome',
      name: 'Welcome Message',
      subject: 'Welcome to STPPL Events',
      preview: 'Welcome new participants'
    }
  ]

  const handleSendEmail = async () => {
    setIsLoading(true)
    // TODO: Implement email sending logic
    setTimeout(() => {
      setIsLoading(false)
      alert('Emails sent successfully!')
    }, 2000)
  }

  return (
    <div className="space-y-6">
      {/* Email Templates */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Email Templates
          </h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedTemplate === template.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  setSelectedTemplate(template.id)
                  setSubject(template.subject)
                }}
              >
                <h4 className="font-medium text-gray-900">{template.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{template.preview}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Email Composer */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Compose Email
          </h3>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipients
            </label>
            <textarea
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="Enter email addresses separated by commas..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={8}
            />
          </div>

          {/* Send Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSendEmail}
              disabled={isLoading || !recipients || !subject}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Emails */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Emails</h3>
        </div>
        
        <div className="p-6">
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>No recent emails found</p>
          </div>
        </div>
      </div>
    </div>
  )
}