import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Rubric and research files are read from disk at request time.
  outputFileTracingIncludes: { "/api/review": ["./rubrics/**", "./research/**"] },
};

export default nextConfig;
