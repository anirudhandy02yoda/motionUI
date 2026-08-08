import path from "node:path";
import type { WebpackOverrideFn } from "@remotion/bundler";
import { enableTailwind } from "@remotion/tailwind-v4";

/** Remotion bundles src/remotion/index.ts with its own webpack config, entirely
 * separate from Next's — so the `@/*` -> `src/*` tsconfig alias used throughout
 * this codebase (lib/types, lib/timeline, lib/actionTarget) has to be re-taught
 * here, alongside Tailwind support, for both the render API route and the CLI
 * studio (remotion.config.ts) to resolve the same imports Next does. */
export const withAntigravityConfig: WebpackOverrideFn = (config) => {
  const tailwindConfig = enableTailwind(config);
  return {
    ...tailwindConfig,
    resolve: {
      ...tailwindConfig.resolve,
      alias: {
        ...tailwindConfig.resolve?.alias,
        "@": path.join(process.cwd(), "src"),
      },
    },
  };
};
