import { retrieveLink, updateLink, deleteLink } from "@/lib/links";

// This handler reads and writes PostgreSQL for each request.
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ code: string }> };
export async function GET(_: Request, { params }: Context) { return retrieveLink((await params).code); }
export async function PUT(request: Request, { params }: Context) { return updateLink(request, (await params).code); }
export async function DELETE(_: Request, { params }: Context) { return deleteLink((await params).code); }
