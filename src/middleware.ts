import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PROFILE_REQUIRED_ROUTES = ['/checkout', '/mis-pedidos', '/wishlist'];
const AUTH_REQUIRED_ROUTES    = [
  '/checkout', '/mis-pedidos', '/wishlist',
  '/completar-perfil', '/perfil',
];
const ADMIN_ROUTES = ['/admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Primero obtenemos el cliente de Supabase desde updateSession ──
  const { supabaseResponse, user, supabase } = await updateSession(request);

  // ── Maintenance mode (usando el cliente de Supabase ya creado) ──
  const isExcluded =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/mantenimiento' ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap.xml') ||
    pathname.startsWith('/manifest.json') ||
    pathname.startsWith('/og');

  if (!isExcluded) {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('valor')
        .eq('clave', 'mantenimiento')
        .single();

      const mantenimientoActivo = data?.valor === 'true';

      if (mantenimientoActivo) {
        return NextResponse.redirect(new URL('/mantenimiento', request.url));
      }
    } catch (error) {
      // Si falla la consulta, asumimos que NO está en mantenimiento
      console.error('Error al leer estado de mantenimiento:', error);
    }
  }

  // ── Resto de la lógica (auth, admin, perfil) ──

  // Auth required
  const requiresAuth = AUTH_REQUIRED_ROUTES.some((r) => pathname.startsWith(r));
  if (requiresAuth && !user) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Admin check
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

  // Profile completeness
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
