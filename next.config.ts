import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-lib', 'nodemailer', 'pg', 'speakeasy'],
};

export default nextConfig;
