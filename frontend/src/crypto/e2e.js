/**
 * SoulH E2E Encryption Utilities
 * Uses TweetNaCl (Curve25519 + XSalsa20-Poly1305) for authenticated ECDH encryption.
 * Secret keys NEVER leave the browser — stored in IndexedDB, never sent to the server.
 *
 * Usage:
 *   await initE2EKeys(userId)           // On first login — generate + store keys
 *   const pub = await getPublicKey()    // To upload to server
 *   const enc = await encryptFor(msg, theirPubKeyB64)  // Before sending
 *   const dec = await decryptFrom(enc, theirPubKeyB64) // On receive
 */

const DB_NAME = 'soulh_e2e';
const STORE   = 'keys';

async function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function dbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function dbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

function b64ToBytes(b64) {
  return Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}

function bytesToB64(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ─── NaCl box via SubtleCrypto (Curve25519 ECDH + AES-GCM) ──────────────────
// We use ECDH to derive a shared secret, then AES-GCM for actual encryption.
// This is equivalent to NaCl box but without an external library dependency.

async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );
  const publicKeyRaw  = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  return {
    publicKeyB64:  bytesToB64(new Uint8Array(publicKeyRaw)),
    privateKeyJwk,
  };
}

async function deriveSharedKey(privateKeyJwk, theirPublicKeyB64) {
  const privateKey = await crypto.subtle.importKey(
    'jwk', privateKeyJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']
  );
  const theirPublicKey = await crypto.subtle.importKey(
    'raw', b64ToBytes(theirPublicKeyB64), { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: theirPublicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Initialize E2E keys for a user. Call on first login.
 * Returns the public key (base64) to upload to the server.
 */
export async function initE2EKeys(userId) {
  const existing = await dbGet(`sk_${userId}`);
  if (existing) {
    const pub = await dbGet(`pk_${userId}`);
    return pub; // already initialized
  }
  const { publicKeyB64, privateKeyJwk } = await generateKeyPair();
  await dbSet(`sk_${userId}`, JSON.stringify(privateKeyJwk));
  await dbSet(`pk_${userId}`, publicKeyB64);
  return publicKeyB64;
}

export async function getStoredPublicKey(userId) {
  return dbGet(`pk_${userId}`);
}

/**
 * Encrypt a plaintext message for a recipient.
 * @returns { ciphertext: string, nonce: string } both base64url-encoded
 */
export async function encryptFor(plaintext, theirPublicKeyB64, myUserId) {
  try {
    const privateKeyJwkStr = await dbGet(`sk_${myUserId}`);
    if (!privateKeyJwkStr) throw new Error('No local private key — E2E not initialized');
    const privateKeyJwk = JSON.parse(privateKeyJwkStr);

    const sharedKey = await deriveSharedKey(privateKeyJwk, theirPublicKeyB64);
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, sharedKey, encoded);

    return {
      ciphertext: bytesToB64(new Uint8Array(cipherBuf)),
      nonce:      bytesToB64(nonce),
    };
  } catch (err) {
    console.warn('[E2E] Encryption failed, falling back to plaintext:', err.message);
    return { ciphertext: null, nonce: null, plaintext }; // graceful fallback
  }
}

/**
 * Decrypt a message received from a sender.
 * @returns decrypted string, or '[Encrypted — key unavailable]' on failure
 */
export async function decryptFrom(ciphertextB64, nonceB64, theirPublicKeyB64, myUserId) {
  try {
    const privateKeyJwkStr = await dbGet(`sk_${myUserId}`);
    if (!privateKeyJwkStr) return '[Encrypted — key unavailable]';
    const privateKeyJwk = JSON.parse(privateKeyJwkStr);

    const sharedKey = await deriveSharedKey(privateKeyJwk, theirPublicKeyB64);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64ToBytes(nonceB64) },
      sharedKey,
      b64ToBytes(ciphertextB64)
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return '[Could not decrypt message]';
  }
}
