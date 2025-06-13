/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseDomain = supabaseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

const nextConfig = {
  images: {
    domains: [
      'localhost',
      supabaseDomain
    ],
  },
}

module.exports = nextConfig; 