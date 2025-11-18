/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseDomain = supabaseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

const nextConfig = {
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: supabaseDomain ? [
      {
        protocol: 'https',
        hostname: supabaseDomain,
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ] : [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
}

export default nextConfig