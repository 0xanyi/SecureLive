import { redirect } from 'next/navigation'
import { validateSession } from '@/lib/auth/session'
import { VideoPlayer } from '@/components/stream/VideoPlayer'
import { StreamHeader } from '@/components/stream/StreamHeader'


export default async function StreamPage() {
  // Validate user session
  const sessionValidation = await validateSession()
  
  if (!sessionValidation.valid) {
    redirect('/?error=session_expired')
  }

  const { session, accessCode } = sessionValidation

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <StreamHeader 
        accessCode={accessCode!}
        session={session!}
      />

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Video Player - Takes up most space */}
          <div className="lg:col-span-3">
            <VideoPlayer 
              sessionId={session!.id}
              embedCode={process.env.FLOW_PLAYER_EMBED_CODE}
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Live Status */}
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-400 font-semibold">Live Stream</span>
              </div>
              <p className="text-green-300 text-sm mt-2">
                Live stream is currently active
              </p>
            </div>

            {/* Current Viewing Info */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Currently Viewing
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Access Code</p>
                  <p className="text-white font-mono">{accessCode!.code}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">
                    {accessCode!.type === 'center' ? 'Center' : 'Individual'}
                  </p>
                  <p className="text-white">{accessCode!.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Session Type</p>
                  <p className="text-white">
                    {accessCode!.type === 'center' 
                      ? 'Single Location' 
                      : `Up to ${accessCode!.max_concurrent_sessions} devices`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Sticky to bottom */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Secure Live Stream Portal • All rights reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}