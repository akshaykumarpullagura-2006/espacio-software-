/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@prisma/client",
      "clsx",
      "tailwind-merge",
      "zod",
    ],
  },
};

export default nextConfig;
