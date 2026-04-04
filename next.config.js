/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
  // serverExternalPackages replaces the deprecated experimental.serverComponentsExternalPackages
  serverExternalPackages: ['@prisma/client'],
}

module.exports = nextConfig
