import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * On-demand revalidation endpoint.
 *
 * Usage:
 *   GET /api/revalidate?secret=TOKEN&path=/
 *   GET /api/revalidate?secret=TOKEN&tag=products
 *
 * Also called nightly by Vercel Cron (see vercel.json).
 * Add REVALIDATE_SECRET_TOKEN to env vars.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  const path   = req.nextUrl.searchParams.get('path');
  const tag    = req.nextUrl.searchParams.get('tag');

  // Verify secret
  if (secret !== process.env.REVALIDATE_SECRET_TOKEN) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }

  try {
    if (tag) {
      revalidateTag(tag);
      return NextResponse.json({ revalidated: true, tag, now: Date.now() });
    }

    if (path) {
      revalidatePath(path);
      return NextResponse.json({ revalidated: true, path, now: Date.now() });
    }

    // Full revalidation (called by cron)
    const paths = ['/', '/productos', '/ubicacion', '/contacto', '/faq'];
    paths.forEach((p) => revalidatePath(p));

    return NextResponse.json({
      revalidated: true,
      paths,
      now: Date.now(),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Revalidation failed' },
      { status: 500 }
    );
  }
}
