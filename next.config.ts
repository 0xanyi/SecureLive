import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  // Optimize for production
  experimental: {
    // Enable server components optimization
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  
  // Image optimization for production
  images: {
    unoptimized: true, // Disable Next.js image optimization for self-hosted deployments
  },
};

export default nextConfig;
