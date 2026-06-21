import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PROFILE_REQUIRED_ROUTES = ['/checkout', '/mis-pedidos', '/wishlist'];
const AUTH_REQUIRED_ROUTES    = [
  '/checkout', '/mis-pedidos', '/wishlist',
  '/completar-perfil', '/perfil',   // ✅ /perfil added
];
const ADMIN_ROUTES = ['/admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Maintenance mode ─────────────────────────────────────────
  if (
    process.env.MAINTENANCE_MODE === 'true' &&
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/auth') &&
    !pathname.startsWith('/api') &&
    pathname !== '/mantenimiento'
  ) {
    return NextResponse.redirect(new URL('/mantenimiento', request.url));
  }

  const { supabaseResponse, user, supabase } = await updateSession(request);

  // ── Auth required ─────────────────────────────────────────────
  const requiresAuth = AUTH_REQUIRED_ROUTES.some((r) => pathname.startsWith(r));
  if (requiresAuth && !user) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // ── Admin check ───────────────────────────────────────────────
  if (ADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login?redirect=/admin', request.url));
    }
    const { data: profile } = await supabase
      .from('profiles').select('rol').eq('id', user.id).single();
    if (profile?.rol !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // ── Profile completeness (solo rutas críticas) ────────────────
  const requiresProfile = PROFILE_REQUIRED_ROUTES.some((r) => pathname.startsWith(r));
  if (requiresProfile && user) {
    const { data: profile } = await supabase
      .from('profiles').select('direccion, codigo_postal, telefono').eq('id', user.id).single();
    const isIncomplete = !profile?.direccion || !profile?.codigo_postal || !profile?.telefono;
    if (isIncomplete && pathname !== '/completar-perfil') {
      const url = new URL('/completar-perfil', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
