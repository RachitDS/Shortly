import { retrieveLink } from "@/lib/links";
export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) { return retrieveLink((await params).code, true); }
