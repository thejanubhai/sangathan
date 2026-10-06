import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get('token');
  
  if (!token) {
    return NextResponse.redirect(`${origin}/?error=missing_token`);
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, returnSecureToken: true }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to sign in with custom token');
    }

    const idToken = data.idToken;
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const cookieStore = await cookies();
    cookieStore.set('__session', sessionCookie, { 
      maxAge: expiresIn, 
      httpOnly: true, 
      secure: true, 
      path: '/' 
    });

    return NextResponse.redirect(`${origin}/dashboard`);
  } catch (error) {
    console.error('Auth Callback Error:', error);
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }
}
