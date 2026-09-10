import { db } from "@/db";
import { links, visits } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export function validateUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 4096) throw new Error("Please enter a valid URL (up to 4,096 characters).");
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Enter a complete URL beginning with https:// or http://."); }
  if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".") || url.username || url.password) throw new Error("Enter a public HTTP or HTTPS URL without embedded credentials.");
  return url.href;
}
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
export async function listLinks() {
  try {
    const data = await db.select().from(links).orderBy(desc(links.createdAt));
    const activity = await db.select({ day: sql<string>`to_char(${visits.visitedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`, count: sql<number>`count(*)::int` }).from(visits).groupBy(sql`to_char(${visits.visitedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`);
    return NextResponse.json({ links: data, activity });
  } catch {
    return error("Database unavailable. Start PostgreSQL and try again.", 503);
  }
}
export async function createLink(request: Request) {
  let body;
  try { body = await request.json(); } catch { return error("Request body must be valid JSON."); }
  if (!body || typeof body !== "object") return error("Request body must be a JSON object.");
  let url;
  try { url = validateUrl(body.url); } catch (e) { return error((e as Error).message); }
  const custom = typeof body.shortCode === "string" ? body.shortCode.trim() : "";
  if (custom && !/^[a-zA-Z0-9_-]{3,32}$/.test(custom)) return error("Custom aliases must be 3–32 letters, numbers, hyphens, or underscores.");
  if (body.title !== undefined && (typeof body.title !== "string" || body.title.length > 120)) return error("Title must be no more than 120 characters.");
  for (let attempt = 0; attempt < 5; attempt++) {
    const shortCode = custom || randomBytes(5).toString("base64url");
    let link;
    try { [link] = await db.insert(links).values({ url, shortCode, title: body.title?.trim() || new URL(url).hostname.replace(/^www\./, "") }).onConflictDoNothing().returning(); }
    catch { return error("Database unavailable. Start PostgreSQL and try again.", 503); }
    if (link) return NextResponse.json(link, { status: 201, headers: { Location: `/shorten/${shortCode}` } });
    if (custom) return error("That custom alias is already in use. Try another.", 409);
  }
  return error("Unable to create a unique link. Please try again.", 503);
}
export async function getLink(code: string, track = false) {
  if (!track) {
    const [link] = await db.select().from(links).where(eq(links.shortCode, code));
    return link;
  }
  return db.transaction(async tx => {
    const [link] = await tx.update(links).set({ accessCount: sql`${links.accessCount} + 1` }).where(sql`${links.shortCode} = ${code} AND ${links.archived} = false`).returning();
    if (link) await tx.insert(visits).values({ linkId: link.id });
    return link;
  });
}
export async function retrieveLink(code: string, stats = false) {
  try {
    const link = await getLink(code, !stats);
    return link ? NextResponse.json(link, { headers: { "Cache-Control": "no-store" } }) : error("Short link not found or inactive.", 404);
  } catch { return error("Database unavailable. Start PostgreSQL and try again.", 503); }
}
export async function updateLink(request: Request, code: string) {
  let body;
  try { body = await request.json(); } catch { return error("Request body must be valid JSON."); }
  if (!body || typeof body !== "object") return error("Request body must be a JSON object.");
  const changes: { url?: string; title?: string; archived?: boolean; updatedAt: Date } = { updatedAt: new Date() };
  if (body.url !== undefined) {
    try { changes.url = validateUrl(body.url); } catch (e) { return error((e as Error).message); }
  }
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 120) return error("Title must contain 1–120 characters.");
    changes.title = body.title.trim();
  }
  if (body.archived !== undefined) {
    if (typeof body.archived !== "boolean") return error("Archived must be a boolean.");
    changes.archived = body.archived;
  }
  if (Object.keys(changes).length === 1) return error("Provide a URL, title, or archived state to update.");
  let link;
  try { [link] = await db.update(links).set(changes).where(eq(links.shortCode, code)).returning(); }
  catch { return error("Database unavailable. Start PostgreSQL and try again.", 503); }
  return link ? NextResponse.json(link) : error("Short link not found.", 404);
}
export async function deleteLink(code: string) {
  let link;
  try { [link] = await db.delete(links).where(eq(links.shortCode, code)).returning(); }
  catch { return error("Database unavailable. Start PostgreSQL and try again.", 503); }
  return link ? new Response(null, { status: 204 }) : error("Short link not found.", 404);
}
