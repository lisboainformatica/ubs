const cryptoObj = typeof crypto !== 'undefined' ? crypto : (globalThis as any).crypto;

function base64urlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  return bytesToBase64Url(bytes);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binString = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binString += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binString);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(str: string): string {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) {
    b64 += '=';
  }
  const binString = atob(b64);
  const bytes = new Uint8Array(binString.length);
  for (let i = 0; i < binString.length; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function getCryptoKey(secret: string): Promise<any> {
  const enc = new TextEncoder();
  return cryptoObj.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signJWT(payload: any, secret: string, expiresInSeconds: number): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(fullPayload));

  const key = await getCryptoKey(secret);
  const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const signature = await cryptoObj.subtle.sign('HMAC', key, data);
  const encodedSignature = bytesToBase64Url(new Uint8Array(signature));

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

export async function verifyJWT(token: string, secret: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const key = await getCryptoKey(secret);
    const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);

    let b64Sig = encodedSignature.replace(/-/g, '+').replace(/_/g, '/');
    while (b64Sig.length % 4) b64Sig += '=';
    const binSig = atob(b64Sig);
    const sigBytes = new Uint8Array(binSig.length);
    for (let i = 0; i < binSig.length; i++) {
      sigBytes[i] = binSig.charCodeAt(i);
    }

    const isValid = await cryptoObj.subtle.verify('HMAC', key, sigBytes, data);
    if (!isValid) return null;

    const payload = JSON.parse(base64urlDecode(encodedPayload));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}
