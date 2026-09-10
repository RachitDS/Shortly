import { getLink } from "@/lib/links";
export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const link = await getLink((await params).code, true);
  if (!link) return new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Link unavailable · Shortly</title><body style="font-family:system-ui;background:#f7f8f5;display:grid;place-content:center;min-height:90vh;text-align:center"><h1>This link is unavailable.</h1><p>It may have been archived or deleted.</p><a href="/" style="color:#44734d">Back to Shortly</a></body></html>', { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  return new Response(null, { status: 302, headers: { Location: link.url, "Cache-Control": "no-store, max-age=0" } });
}
