import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

function cleanPrivateKey(key: string): string {
  let cleaned = key.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.replace(/\\n/g, '\n');
}

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    try {
      let rawJson = serviceAccountKey.trim();
      // Handle base64 encoded service account if provided
      if (!rawJson.startsWith('{') && !rawJson.startsWith('[')) {
        try {
          rawJson = Buffer.from(rawJson, 'base64').toString('utf-8');
        } catch {
          // not base64, continue
        }
      }

      const parsedServiceAccount =
        typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;

      if (parsedServiceAccount.private_key) {
        parsedServiceAccount.private_key = cleanPrivateKey(parsedServiceAccount.private_key);
      }

      return initializeApp({
        credential: cert(parsedServiceAccount),
      });
    } catch (error) {
      console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', error);
    }
  }

  // Check individual environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: cleanPrivateKey(privateKey),
      }),
    });
  }

  // Fallback to allow build/prerender phase without crashing when env vars are unpopulated
  return initializeApp({
    projectId: projectId || 'nothingness-app',
  });
}

export const adminApp = getAdminApp();
export const adminAuth: Auth = getAuth(adminApp);

let cachedGoogleCerts: Record<string, string> | null = null;
let googleCertsExpiresAt = 0;

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  if (cachedGoogleCerts && Date.now() < googleCertsExpiresAt) {
    return cachedGoogleCerts;
  }
  try {
    const res = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
    if (!res.ok) {
      throw new Error(`Failed to fetch Google certs: HTTP ${res.status}`);
    }
    const certs = await res.json();
    cachedGoogleCerts = certs;
    googleCertsExpiresAt = Date.now() + 60 * 60 * 1000; // Cache 1 hour
    return certs;
  } catch (err) {
    if (cachedGoogleCerts) return cachedGoogleCerts;
    throw err;
  }
}

export interface VerifiedFirebaseToken {
  uid: string;
  phone_number?: string;
  email?: string;
  [key: string]: any;
}

/**
 * Robustly verifies a Firebase ID Token using Firebase Admin SDK if service account is configured,
 * or verifies the RS256 signature using Google's public x509 certificates.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseToken> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Firebase ID token is required.');
  }

  // 1. Try Firebase Admin SDK first
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (decoded) {
      return {
        ...decoded,
        uid: decoded.uid,
        phone_number: decoded.phone_number,
        email: decoded.email,
      };
    }
  } catch (adminErr: any) {
    console.warn('[Firebase Admin] Admin verifyIdToken fell back to public cert verification:', adminErr?.message || adminErr);
  }

  // 2. Fallback to Google Public Certificate JWT Verification (RS256)
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format in Firebase ID token.');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  let header: any;
  let payload: any;

  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch (parseErr) {
    throw new Error('Failed to parse Firebase ID token JSON payload.');
  }

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Invalid Firebase ID token header or algorithm.');
  }

  const certs = await getGooglePublicCerts();
  const cert = certs[header.kid];
  if (!cert) {
    throw new Error(`Public key not found for key ID: ${header.kid}`);
  }

  const crypto = await import('crypto');
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  const signature = Buffer.from(signatureB64, 'base64url');
  const isValid = verifier.verify(cert, signature);

  if (!isValid) {
    throw new Error('Invalid Firebase ID token signature.');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Firebase ID token has expired. Please request a new verification code.');
  }
  if (payload.iat && payload.iat > now + 300) {
    throw new Error('Firebase ID token issued in the future.');
  }

  const phone_number =
    payload.phone_number ||
    payload.firebase?.identities?.phone?.[0] ||
    undefined;

  return {
    ...payload,
    uid: payload.sub || payload.user_id,
    phone_number,
    email: payload.email,
  };
}

import { getFirestore } from 'firebase-admin/firestore';
export const adminDb = getFirestore(adminApp, "janubhaiconsultancy");
