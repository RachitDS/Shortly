import "dotenv/config";
import { db, pool } from "@/db";
import { links } from "@/db/schema";

async function main() {
  const examples = [
    { title: "Design inspiration collection", url: "https://www.figma.com/community", shortCode: "design-kit" },
    { title: "URL shortener — project brief", url: "https://roadmap.sh/projects/url-shortening-service", shortCode: "url-project" },
    { title: "My developer portfolio", url: "https://github.com/explore", shortCode: "portfolio" },
    { title: "Workspace & project notes", url: "https://www.notion.so/templates", shortCode: "workspace" },
    { title: "Product launch inspiration", url: "https://www.youtube.com/@vercel", shortCode: "launch-day" },
    { title: "The focus playlist", url: "https://open.spotify.com/genre/focus-page", shortCode: "focus-mode" },
    { title: "Getting started with Next.js", url: "https://nextjs.org/docs", shortCode: "next-guide", archived: true },
  ];
  for (const [i, example] of examples.entries()) {
    const createdAt = new Date(Date.now() - i * 86400000);
    await db.insert(links).values({ ...example, createdAt, updatedAt: createdAt }).onConflictDoNothing();
  }
  console.log("Added seven example links. No visits or analytics have been fabricated.");
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());
