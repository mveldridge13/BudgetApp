import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Pin the workspace root to this app directory. The repo root contains a
  // second package-lock.json (the React Native app), which otherwise causes
  // Next.js to infer the wrong workspace root and break routing on Vercel.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
