const nextConfig = {
  images: { unoptimized: true },
  async redirects() {
    return [
      {
        source: '/',
        has: [{ type: 'host', value: 'pay.nyttolabs.com' }],
        destination: 'https://getpaidlink.nyttolabs.com/',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'pay.nyttolabs.com' }],
        destination: 'https://getpaidlink.nyttolabs.com/:path*',
        permanent: true,
      },
    ]
  },
};
export default nextConfig;
