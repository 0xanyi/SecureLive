import { CodeEntry } from "@/components/auth/CodeEntry";
import { DynamicHeader } from "@/components/ui/DynamicHeader";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1 flex flex-col">
        {/* Dynamic Header */}
        <DynamicHeader />

        {/* Main Content */}
        <div className="max-w-md mx-auto">
          
          {/* Code Entry Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Live Stream Portal
              </h2>
              <p className="text-gray-600">
                Enter your access code to join the event
              </p>
            </div>

            <CodeEntry />
          </div>
        </div>
      </div>

      {/* Footer - Flush to bottom */}
      <footer className="mt-auto pt-8">
        <div className="text-center border-t border-gray-200 pt-8">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Secure Live Stream Portal • All rights
            reserved
          </p>
          <div className="mt-4">
            <a
              href="/admin"
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              Admin Access
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
