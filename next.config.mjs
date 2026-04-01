/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const target = (process.env.API_PROXY_TARGET || "http://127.0.0.1:8000").replace(/\/$/, "");
    return [
      { source: "/api/:path*", destination: `${target}/api/:path*` },
      // Subject-aware API routes (e.g. /physics/api/..., /math/api/...).
      { source: "/:subject/api/:path*", destination: `${target}/:subject/api/:path*` },
      { source: "/uploads/:path*", destination: `${target}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
