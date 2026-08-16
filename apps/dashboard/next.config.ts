import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@inbox-triage/ui', '@inbox-triage/db'],
};

export default nextConfig;
