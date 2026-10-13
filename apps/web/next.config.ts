import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

export default function config(phase:string):NextConfig {
  return {
    // NEXT_DIST_DIR lets a throwaway production build (e2e) live beside a running server without replacing its files.
    distDir:process.env.NEXT_DIST_DIR||(phase===PHASE_DEVELOPMENT_SERVER?'.next-dev':'.next'),
    transpilePackages:['@after-dark/contracts'],
  };
}
