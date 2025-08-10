/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  // Server external packages (moved from experimental in Next.js 15)
  serverExternalPackages: ['@supabase/supabase-js'],
  
  // Image optimization for production
  images: {
    unoptimized: true, // Disable Next.js image optimization for self-hosted deployments
  },
  
  // ESLint configuration for production builds
  eslint: {
    // Only run ESLint on these directories during production builds
    dirs: ['src'],
    // Allow production builds to complete even if there are ESLint errors
    ignoreDuringBuilds: true,
  },
  
  // TypeScript configuration
  typescript: {
    // Allow production builds to complete even if there are type errors
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;