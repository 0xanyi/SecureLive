'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, Database, Mail, Shield, Globe, Bell, Users, Loader2, Video } from 'lucide-react'

export function SystemSettings() {
  const [activeTab, setActiveTab] = useState('general')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTestingEmail, setIsTestingEmail] = useState(false)
  const [testEmailAddress, setTestEmailAddress] = useState('')
  const [settings, setSettings] = useState({
    general: {
      siteName: 'Secure Live Stream Portal',
      siteDescription: 'Professional Live Streaming Platform',
      timezone: 'Europe/London',
      language: 'en',
      maintenanceMode: false
    },
    streaming: {
      hlsUrl: 'https://cdn3.wowza.com/5/NVF5TVdNQmR5OHRI/cln/smil:clnout.smil/playlist.m3u8',
      playerId: '46fbbf30-5af9-4860-b4b1-6706ac91984e',
      playerToken: 'eyJraWQiOiJYMzdESU55UmF6bFEiLCJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJjIjoie1wiYWNsXCI6MzgsXCJpZFwiOlwiWDM3RElOeVJhemxRXCJ9IiwiaXNzIjoiRmxvd3BsYXllciJ9._rtVLPQzfdsbtI4UHrjX1IzwwfGTPQK988D8W0C9sEOrvZEG82i9S4ApbIkxYY5sQwq38h2DWFypXM2d15AYng',
      autoplay: false,
      muted: true
    },
    email: {
      brevoApiKey: '',
      fromEmail: 'noreply@example.com',
      fromName: 'Secure Live Stream Portal',
      replyToEmail: '',
      enableEmailNotifications: true
    },
    security: {
      sessionTimeout: '30',
      maxLoginAttempts: '5',
      requireStrongPasswords: true,
      enableTwoFactor: false,
      allowedIpRanges: ''
    },
    notifications: {
      emailNotifications: true,
      adminAlerts: true,
      sessionAlerts: true,
      errorReporting: true
    }
  })

  const tabs = [
    { id: 'general', name: 'General', icon: Settings },
    { id: 'streaming', name: 'Streaming', icon: Video },
    { id: 'email', name: 'Email', icon: Mail },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell }
  ]

  // Load settings on component mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/settings')
      const data = await response.json()
      
      if (data.success && data.settings) {
        // Merge loaded settings with defaults to ensure all properties exist
        setSettings(prevSettings => ({
          general: {
            ...prevSettings.general,
            ...data.settings.general
          },
          streaming: {
            ...prevSettings.streaming,
            ...data.settings.streaming
          },
          email: {
            ...prevSettings.email,
            ...data.settings.email
          },
          security: {
            ...prevSettings.security,
            ...data.settings.security
          },
          notifications: {
            ...prevSettings.notifications,
            ...data.settings.notifications
          }
        }))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      })

      const data = await response.json()
      
      if (data.success) {
        alert('Settings saved successfully!')
      } else {
        alert('Error saving settings: ' + data.error)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error saving settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = (category: string, key: string, value: unknown) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...(prev[category as keyof typeof prev] || {}),
        [key]: value
      }
    }))
  }

  const handleTestEmail = async () => {
    if (!testEmailAddress) {
      alert('Please enter an email address to test')
      return
    }

    try {
      setIsTestingEmail(true)
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          testEmail: testEmailAddress,
          settings: settings.email 
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        alert('Test email sent successfully! Check your inbox.')
      } else {
        alert('Failed to send test email: ' + data.error)
      }
    } catch (error) {
      console.error('Error sending test email:', error)
      alert('Error sending test email. Please try again.')
    } finally {
      setIsTestingEmail(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Settings Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Site Name
                    </label>
                    <input
                      type="text"
                      value={settings.general?.siteName || ''}
                      onChange={(e) => updateSetting('general', 'siteName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={settings.general?.timezone || 'Europe/London'}
                      onChange={(e) => updateSetting('general', 'timezone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Europe/London">Europe/London</option>
                      <option value="Europe/Paris">Europe/Paris</option>
                      <option value="Europe/Berlin">Europe/Berlin</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Site Description
                    </label>
                    <textarea
                      value={settings.general?.siteDescription || ''}
                      onChange={(e) => updateSetting('general', 'siteDescription', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.general?.maintenanceMode || false}
                        onChange={(e) => updateSetting('general', 'maintenanceMode', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Enable Maintenance Mode</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Streaming Settings */}
          {activeTab === 'streaming' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Live Stream Configuration</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Configure your HLS streaming settings and video player options.
                </p>
                
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      HLS Stream URL
                    </label>
                    <input
                      type="url"
                      value={settings.streaming?.hlsUrl || ''}
                      onChange={(e) => updateSetting('streaming', 'hlsUrl', e.target.value)}
                      placeholder="https://your-stream-url.com/playlist.m3u8"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the HLS (.m3u8) URL for your live stream
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Player ID
                    </label>
                    <input
                      type="text"
                      value={settings.streaming?.playerId || ''}
                      onChange={(e) => updateSetting('streaming', 'playerId', e.target.value)}
                      placeholder="player-id-from-your-provider"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Unique identifier for your video player
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Player Token (Optional)
                    </label>
                    <textarea
                      value={settings.streaming?.playerToken || ''}
                      onChange={(e) => updateSetting('streaming', 'playerToken', e.target.value)}
                      placeholder="JWT token for authenticated streaming"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Authentication token if required by your streaming provider
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.streaming?.autoplay || false}
                          onChange={(e) => updateSetting('streaming', 'autoplay', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Enable Autoplay</span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1 ml-6">
                        Stream will start playing automatically when loaded
                      </p>
                    </div>
                    
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.streaming?.muted || false}
                          onChange={(e) => updateSetting('streaming', 'muted', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Start Muted</span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1 ml-6">
                        Stream will be muted by default (recommended for autoplay)
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Streaming Setup Instructions</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Obtain your HLS stream URL from your streaming provider</li>
                    <li>If using Wowza or similar, get your player ID and token</li>
                    <li>Test the stream URL in a browser to ensure it's working</li>
                    <li>Save settings and refresh the stream page to see changes</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Email Settings */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Brevo Email Configuration</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Configure your Brevo email service settings for sending notifications and access codes.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brevo API Key
                    </label>
                    <input
                      type="password"
                      value={settings.email?.brevoApiKey || ''}
                      onChange={(e) => updateSetting('email', 'brevoApiKey', e.target.value)}
                      placeholder="Enter your Brevo API key"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Get your API key from your Brevo dashboard under API & Integration
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Email Address
                    </label>
                    <input
                      type="email"
                      value={settings.email?.fromEmail || ''}
                      onChange={(e) => updateSetting('email', 'fromEmail', e.target.value)}
                      placeholder="noreply@yourdomain.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Name
                    </label>
                    <input
                      type="text"
                      value={settings.email?.fromName || ''}
                      onChange={(e) => updateSetting('email', 'fromName', e.target.value)}
                      placeholder="Secure Live Stream Portal"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reply-To Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={settings.email?.replyToEmail || ''}
                      onChange={(e) => updateSetting('email', 'replyToEmail', e.target.value)}
                      placeholder="support@yourdomain.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.email?.enableEmailNotifications || false}
                        onChange={(e) => updateSetting('email', 'enableEmailNotifications', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Enable Email Notifications</span>
                    </label>
                  </div>
                </div>
                
                {/* Test Email Section */}
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="text-sm font-medium text-green-900 mb-3">Test Email Configuration</h4>
                  <p className="text-sm text-green-800 mb-3">
                    Send a test email to verify your Brevo configuration is working correctly.
                  </p>
                  <div className="flex gap-3">
                    <input
                      type="email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      placeholder="Enter email address to test"
                      className="flex-1 px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <button
                      onClick={handleTestEmail}
                      disabled={isTestingEmail || !testEmailAddress}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isTestingEmail ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          Send Test
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Brevo Setup Instructions</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Sign up for a Brevo account at <a href="https://www.brevo.com" target="_blank" rel="noopener noreferrer" className="underline">brevo.com</a></li>
                    <li>Verify your sender email address in Brevo</li>
                    <li>Go to API & Integration → API Keys in your Brevo dashboard</li>
                    <li>Create a new API key and paste it above</li>
                    <li>Test your configuration by sending a test email</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Session Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      value={settings.security?.sessionTimeout || '30'}
                      onChange={(e) => updateSetting('security', 'sessionTimeout', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Login Attempts
                    </label>
                    <input
                      type="number"
                      value={settings.security?.maxLoginAttempts || '5'}
                      onChange={(e) => updateSetting('security', 'maxLoginAttempts', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Allowed IP Ranges (comma separated)
                    </label>
                    <input
                      type="text"
                      value={settings.security?.allowedIpRanges || ''}
                      onChange={(e) => updateSetting('security', 'allowedIpRanges', e.target.value)}
                      placeholder="192.168.1.0/24, 10.0.0.0/8"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2 space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.security?.requireStrongPasswords || false}
                        onChange={(e) => updateSetting('security', 'requireStrongPasswords', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Require Strong Passwords</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.security?.enableTwoFactor || false}
                        onChange={(e) => updateSetting('security', 'enableTwoFactor', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Enable Two-Factor Authentication</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>
                
                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications?.emailNotifications || false}
                      onChange={(e) => updateSetting('notifications', 'emailNotifications', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable Email Notifications</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications?.adminAlerts || false}
                      onChange={(e) => updateSetting('notifications', 'adminAlerts', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Admin Alerts</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications?.sessionAlerts || false}
                      onChange={(e) => updateSetting('notifications', 'sessionAlerts', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Session Alerts</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications?.errorReporting || false}
                      onChange={(e) => updateSetting('notifications', 'errorReporting', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Error Reporting</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}