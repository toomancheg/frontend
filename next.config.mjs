/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const target = (process.env.API_PROXY_TARGET || "http://127.0.0.1:8000").replace(/\/$/, "");
    return [
      { source: "/api/:path*", destination: `${target}/api/:path*` },
      { source: "/uploads/:path*", destination: `${target}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
