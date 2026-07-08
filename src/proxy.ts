import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from './lib/jwt';

const JWT_SECRET = process.env.JWT_SECRET || "a7c4f42f36d4f40bb8e9b6267cbdfb09b53f65e23652a92ff15ad97e59b7dfb36a8d6263e52";

// Define RBAC policies: map paths to allowed roles
const routeRules = [
  { path: '/dashboard', roles: ['Administrador', 'Recepcionista', 'Médico', 'Farmácia', 'Gestor Municipal'] },
  { path: '/pacientes', roles: ['Administrador', 'Recepcionista', 'Médico'] },
  { path: '/agenda', roles: ['Administrador', 'Recepcionista', 'Médico'] },
  { path: '/atendimento', roles: ['Administrador', 'Médico'] },
  { path: '/farmacia', roles: ['Administrador', 'Farmácia'] },
  { path: '/auditoria', roles: ['Administrador'] },
  { path: '/admin', roles: ['Administrador'] },
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let API auth and static files pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const tokenCookie = request.cookies.get('auth_token');
  const token = tokenCookie?.value;

  // 1. Unauthenticated users
  if (!token) {
    // If trying to access login, public portal, or landing page, let it pass
    if (pathname === '/login' || pathname === '/' || pathname.startsWith('/agendar')) {
      return NextResponse.next();
    }
    // Otherwise, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Validate token
  const payload = await verifyJWT(token, JWT_SECRET);

  if (!payload) {
    // Token is invalid/expired
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth_token');
    return response;
  }

  // If token is valid and user goes to login, redirect to dashboard
  if (pathname === '/login' || pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3. Check RBAC permissions for the route
  const userRole = payload.role;
  const matchedRule = routeRules.find(rule => pathname.startsWith(rule.path));

  if (matchedRule && !matchedRule.roles.includes(userRole)) {
    // Role not authorized, redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Set tenant (municipalityId) and user context headers so server actions / endpoints can read them
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-role', payload.role);
  requestHeaders.set('x-municipality-id', payload.municipalityId);
  requestHeaders.set('x-municipality-slug', payload.municipalitySlug);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
