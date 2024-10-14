/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 1000,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },
  images: {
    domains: ['lh3.googleusercontent.com','i.discogs.com'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        util: require.resolve('util/'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        fs: false,
        path: false,
        net: false,
        zlib: require.resolve('browserify-zlib'),
      };
    }
    return config;
  },
};

module.exports = nextConfig;
