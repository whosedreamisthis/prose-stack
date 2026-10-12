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
  // pdfkit reads its built-in font files from its own folder at runtime, so it can't be bundled.
  serverExternalPackages: ["pdfkit"],
  // Research images are served by UploadThing from <app id>.ufs.sh/f/<key>.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.ufs.sh", pathname: "/f/**" }],
  },
  // The PDF embeds the project font from its @fontsource package, read from disk by file name, so tracing cannot see it.
  outputFileTracingIncludes: {
    "/api/export/**": ["./node_modules/@fontsource/*/files/*-latin-{400,700}-{normal,italic}.woff"],
  },
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
