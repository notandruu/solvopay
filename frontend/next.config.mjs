/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["pino", "pino-pretty", "thread-stream", "lokijs"],
}

export default nextConfig
