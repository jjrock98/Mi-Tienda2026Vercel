'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { ShoppingCart, Heart, Menu, X, User, Sun, Moon, Search } from 'lucide-react';
import { useTheme } from 'next-themes'; // ✅ Importado correctamente (debe estar instalado)
import { useCartStore } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils';

const LINKS = [
  { href: '/',          label: 'Inicio'    },
  { href: '/faq',       label: 'FAQ'       },
  { href: '/contacto',  label: 'Contacto'  },
  { href: '/ubicacion', label: 'Ubicación' },
];

export function Navbar() {
  const pathname     = usePathname();
  const router       = useRouter();
  const [open,       setOpen]      = useState(false);
  const [userMenu,   setUserMenu]  = useState(false);
  const [searching,  setSearching] = useState(false);
  const [query,      setQuery]     = useState('');
  const searchRef    = useRef<HTMLInputElement>(null);
  
  // ✅ next-themes hook (ahora funciona porque está instalado)
  const { theme, setTheme } = useTheme();
  
  // ✅ Guard de montaje para evitar hidratación
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const itemCount = useCartStore((s) => s.itemCount);
  const { user, profile, isAdmin, signOut } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      router.push(`/buscar?q=${encodeURIComponent(query.trim())}`);
      setSearching(false);
      setQuery('');
    }
  };

  // Cerrar menús al cambiar de ruta
  useEffect(() => {
    setUserMenu(false);
    setOpen(false);
  }, [pathname]);

  // ✅ Placeholder mientras no está montado (evita errores de hidratación)
  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 gap-3">
          <div className="font-display text-xl font-bold text-brand-600 dark:text-brand-400">
            {process.env.NEXT_PUBLIC_TIENDA_NOMBRE ?? 'Mi Tienda'}
          </div>
          <div className="flex items-center gap-1">
            {/* Placeholder para el botón de tema (evita saltos de layout) */}
            <div className="w-9 h-9" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 gap-3">
        {/* Logo */}
        <Link href="/" className="font-display text-xl font-bold text-brand-600 dark:text-brand-400 shrink-0">
          {process.env.NEXT_PUBLIC_TIENDA_NOMBRE ?? 'Mi Tienda'}
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-6 md:flex">
          {LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} className={cn(
                'text-sm font-medium transition-colors hover:text-brand-600',
                pathname === href ? 'text-brand-600' : 'text-muted'
              )}>
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Search bar (desktop, expandable) */}
        <form
          onSubmit={handleSearch}
          className={cn(
            'hidden md:flex items-center transition-all duration-300 overflow-hidden',
            searching ? 'w-56' : 'w-8'
          )}
        >
          {searching && (
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar productos…"
              className="input-base py-1.5 text-sm mr-1"
              autoFocus
              onBlur={() => { if (!query) setSearching(false); }}
            />
          )}
          <button
            type={searching ? 'submit' : 'button'}
            onClick={() => { if (!searching) { setSearching(true); setTimeout(() => searchRef.current?.focus(), 50); } }}
            className="btn-ghost p-2 text-muted shrink-0"
            aria-label="Buscar"
          >
            <Search size={18} />
          </button>
        </form>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* ✅ Botón de tema con next-themes y guard de montaje */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="btn-ghost p-2 text-muted"
            aria-label="Cambiar tema"
            suppressHydrationWarning
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Wishlist */}
          {user && (
            <Link href="/wishlist" className="btn-ghost p-2 text-muted" aria-label="Wishlist">
              <Heart size={18} />
            </Link>
          )}

          {/* Cart */}
          <Link href="/carrito" className="btn-ghost relative p-2 text-muted" aria-label="Carrito">
            <ShoppingCart size={18} />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>

          {/* User */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenu(!userMenu)}
                className="btn-ghost flex items-center gap-2 px-2 py-1.5 text-sm"
              >
                <User size={16} />
                <span className="hidden md:block max-w-20 truncate">
                  {profile?.nombre?.split(' ')[0] ?? 'Mi cuenta'}
                </span>
              </button>
              {userMenu && (
                <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl border border-border bg-surface shadow-lg">
                  <Link href="/perfil"       className="block px-4 py-2.5 text-sm hover:bg-surface-2" onClick={() => setUserMenu(false)}>Mi perfil</Link>
                  <Link href="/mis-pedidos"  className="block px-4 py-2.5 text-sm hover:bg-surface-2" onClick={() => setUserMenu(false)}>Mis pedidos</Link>
                  <Link href="/wishlist"     className="block px-4 py-2.5 text-sm hover:bg-surface-2" onClick={() => setUserMenu(false)}>Wishlist</Link>
                  {isAdmin && (
                    <Link href="/admin" className="block px-4 py-2.5 text-sm text-brand-600 font-medium hover:bg-surface-2" onClick={() => setUserMenu(false)}>
                      Panel Admin
                    </Link>
                  )}
                  <div className="border-t border-border" />
                  <button onClick={() => { signOut(); setUserMenu(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-surface-2">
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth/login" className="btn-primary py-1.5 px-3 text-xs">
              Ingresar
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            className="btn-ghost p-2 md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Menú"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border bg-surface px-4 pb-4 md:hidden animate-fade-in">
          {/* Mobile search */}
          <form onSubmit={handleSearch} className="mt-3 flex gap-2">
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar productos…"
              className="input-base flex-1 py-2 text-sm"
            />
            <button type="submit" className="btn-primary px-3 py-2 text-sm">
              <Search size={15} />
            </button>
          </form>

          <ul className="mt-3 space-y-1">
            {LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link href={href}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-surface-2"
                  onClick={() => setOpen(false)}>
                  {label}
                </Link>
              </li>
            ))}
            {user && (
              <>
                <li><Link href="/perfil"      className="block rounded-lg px-3 py-2.5 text-sm hover:bg-surface-2" onClick={() => setOpen(false)}>Mi perfil</Link></li>
                <li><Link href="/mis-pedidos" className="block rounded-lg px-3 py-2.5 text-sm hover:bg-surface-2" onClick={() => setOpen(false)}>Mis pedidos</Link></li>
              </>
            )}
          </ul>
        </div>
      )}
    </header>
  );
}