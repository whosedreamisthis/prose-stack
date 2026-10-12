import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    // The browser keeps a visited page's data for this long, so going back to a character or scene needs no server
    // request. Every Server Action that changes data calls updateTag/revalidatePath, which clears this cache at once.
    staleTimes: { dynamic: 300 },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
