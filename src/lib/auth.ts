import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK using Project ID only (keyless).
// Token signatures are verified against Google's public certificates fetched at runtime.
// No service account private key is required.
if (getApps().length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (projectId) {
    initializeApp({ projectId });
  } else {
    console.warn(
      '[auth] FIREBASE_PROJECT_ID is not set. Token verification will use insecure JWT decode fallback. ' +
      'Set FIREBASE_PROJECT_ID in your .env file for proper verification.'
    );
  }
}

export async function verifyAuth(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return null;
  }

  // Primary: Verify using Firebase Admin SDK (cryptographically safe)
  if (getApps().length > 0) {
    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      return decodedToken.uid;
    } catch (error) {
      console.error('[auth] Token verification failed:', error);
      return null;
    }
  }

  // Fallback: Unsafe decode used ONLY in local dev when FIREBASE_PROJECT_ID is missing.
  // This should never happen in production if FIREBASE_PROJECT_ID is set.
  if (process.env.NODE_ENV !== 'production') {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      const uid = payload.sub || payload.user_id;
      if (uid) {
        console.warn('[auth] Using insecure JWT decode fallback. Set FIREBASE_PROJECT_ID to fix this.');
        return uid as string;
      }
    } catch (error) {
      console.error('[auth] Failed to decode fallback token:', error);
    }
  }

  return null;
}
