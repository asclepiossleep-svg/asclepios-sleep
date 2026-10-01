import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vercel sets VERCEL_GIT_COMMIT_SHA in its own build environment; GITHUB_SHA
// covers GitHub Actions builds. Never fabricate a value when neither is set —
// the production verification gate treats "unknown" as commit SHA not observable.
const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "unknown";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "inject-commit-sha-meta",
      transformIndexHtml(html) {
        return html.replace(
          "</head>",
          `    <meta name="asclepios-commit-sha" content="${commitSha}" />\n  </head>`,
        );
      },
    },
  ],
});
