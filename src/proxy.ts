import { NextResponse, type NextRequest } from 'next/server'

export default async function proxy(request: NextRequest) {
  // God Mode Universal Auth: We use Firebase session cookies (__session)
  // We no longer rely on Supabase Edge middleware for auth refresh.
  // The actual verification happens in Server Components via Firebase Admin.
  
  const hasSession = request.cookies.has('__session');
  
  // Protect /dashboard and /admin routes
  if (!hasSession && (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('https://janubhai.space/auth?app=nothingness', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

