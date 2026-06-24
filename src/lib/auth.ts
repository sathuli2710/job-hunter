/**
 * Firebase ID Token verification using Web Crypto API.
 * No firebase-admin or any external package needed.
 *
 * Firebase ID tokens are standard JWTs signed with RS256.
 * Google publishes the public keys at a JWKS endpoint, which we use
 * to verify signatures entirely in-process.
 */

const JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

interface JWK {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  n: string;
  e: string;
}

// In-memory key cache keyed by the Cache-Control max-age from Google
let jwksCache: { keys: JWK[]; expiry: number } | null = null;

async function getPublicKeys(): Promise<JWK[]> {
  if (jwksCache && Date.now() < jwksCache.expiry) {
    return jwksCache.keys;
  }
  const res = await fetch(JWKS_URL);
  const cacheControl = res.headers.get('cache-control') ?? '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) * 1000 : 3_600_000;
  const data = await res.json() as { keys: JWK[] };
  jwksCache = { keys: data.keys, expiry: Date.now() + maxAge };
  return data.keys;
}

/** Convert a base64url string to a Uint8Array */
function b64urlToBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
}

/** Decode a base64url-encoded JSON segment */
function decodeSegment(seg: string): any {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(seg)));
}

async function verifyFirebaseToken(
  token: string,
  projectId: string
): Promise<string | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [rawHeader, rawPayload, rawSig] = parts;

  let header: any;
  let payload: any;
  try {
    header  = decodeSegment(rawHeader);
    payload = decodeSegment(rawPayload);
  } catch {
    return null;
  }

  // ── Claim validation ────────────────────────────────────────────────────────
  const now = Math.floor(Date.now() / 1000);
  if (!payload.sub)                                                      return null; // no uid
  if (payload.exp < now)                                                 return null; // expired
  if (payload.iat > now + 300)                                           return null; // future-issued (5 min grace)
  if (payload.aud !== projectId)                                         return null; // wrong project
  if (payload.iss !== `https://securetoken.google.com/${projectId}`)     return null; // wrong issuer

  // ── Signature verification ──────────────────────────────────────────────────
  const keys = await getPublicKeys();
  const jwk  = keys.find((k) => k.kid === header.kid);
  if (!jwk) return null;

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: jwk.alg, ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signedData = new TextEncoder().encode(`${rawHeader}.${rawPayload}`);
  const signature  = b64urlToBytes(rawSig);

  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    signature,
    signedData
  );

  return valid ? (payload.sub as string) : null;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function verifyAuth(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  if (!token) return null;

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    // Development fallback: decode without signature verification
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[auth] FIREBASE_PROJECT_ID not set — using insecure JWT decode. ' +
        'Set FIREBASE_PROJECT_ID in .env to fix this.'
      );
      try {
        const payload = decodeSegment(token.split('.')[1]);
        return (payload.sub || payload.user_id) ?? null;
      } catch {
        return null;
      }
    }
    console.error('[auth] FIREBASE_PROJECT_ID is not set. Cannot verify token in production.');
    return null;
  }

  try {
    return await verifyFirebaseToken(token, projectId);
  } catch (error) {
    console.error('[auth] Token verification failed:', error);
    return null;
  }
}
