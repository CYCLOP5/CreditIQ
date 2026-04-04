/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["10.243.28.225"],
  async rewrites() {
    return [
      {
        // Notice we are avoiding clashing with the /api/chat Next.js route
        // by allowing Next.js to handle its own /api routes first, 
        // then falling back to proxying everything else to the Python backend.
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/:path*' // Proxy to Backend
      }
    ]
  }
};

export default nextConfig;
