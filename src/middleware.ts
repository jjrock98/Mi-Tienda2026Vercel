import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// ─── Rutas que requieren perfil completo ───
const PROFILE_REQUIRED_ROUTES = ['/checkout', '/mis-pedidos', '/wishlist'];

// ─── Rutas que requieren autenticación ───
const AUTH_REQUIRED_ROUTES = [
  '/checkout', '/mis-pedidos', '/wishlist',
  '/completar-perfil', '/perfil',
];

// ─── Rutas de administración ───
const ADMIN_ROUTES = ['/admin'];

// ─── User-Agents de bots/rastreadores ───
const BOT_USER_AGENTS = [
  'Googlebot', 'bingbot', 'Slurp', 'DuckDuckBot', 'Baiduspider',
  'YandexBot', 'Sogou', 'Exabot', 'facebookexternalhit',
  'Facebot', 'Twitterbot', 'WhatsApp', 'Applebot', 'Pingdom',
  'GTmetrix', 'AhrefsBot', 'SemrushBot',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── 1. REDIRECCIÓN DE www a sin www ───
  const host = request.headers.get('host') || '';
  if (host.startsWith('www.')) {
    const newUrl = new URL(request.url);
    newUrl.host = newUrl.host.replace(/^www\./, '');
    return NextResponse.redirect(newUrl, 301);
  }

  // ─── 2. RUTAS DE SISTEMA (excluidas de toda lógica) ───
  const isSystemRoute =
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/manifest.json' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/og');

  if (isSystemRoute) {
    return NextResponse.next();
  }

  // ─── 3. DETECTAR BOTS (pasan directamente) ───
  const userAgent = request.headers.get('user-agent') || '';
  const isBot = BOT_USER_AGENTS.some((bot) => userAgent.includes(bot));

  if (isBot) {
    return NextResponse.next();
  }

  // ─── 4. RESTO DEL MIDDLEWARE (solo para humanos) ───
  const { supabaseResponse, user, supabase } = await updateSession(request);

  const isExcluded = pathname.startsWith('/admin') || pathname.startsWith('/auth') || pathname === '/mantenimiento';

  // ─── Mantenimiento ───
  if (!isExcluded) {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('valor')
        .eq('clave', 'mantenimiento')
        .single();

      if (data?.valor === 'true' && pathname !== '/mantenimiento') {
        return NextResponse.redirect(new URL('/mantenimiento', request.url));
      }
    } catch (error) {
      console.error('Error al leer estado de mantenimiento:', error);
    }
  }

  // ─── Autenticación requerida ───
  const requiresAuth = AUTH_REQUIRED_ROUTES.some((r) => pathname.startsWith(r));
  if (requiresAuth && !user) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // ─── Verificación de administrador ───
  if (ADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login?redirect=/admin', request.url));
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (profile?.rol !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // ─── Perfil completo ───
  const requiresProfile = PROFILE_REQUIRED_ROUTES.some((r) => pathname.startsWith(r));
  if (requiresProfile && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('direccion, codigo_postal, telefono')
      .eq('id', user.id)
      .single();

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
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};