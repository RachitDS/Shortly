import { retrieveLink } from "@/lib/links";

// Statistics are fetched from PostgreSQL at request time.
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) { return retrieveLink((await params).code, true); }
