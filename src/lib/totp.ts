import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Authenticator-app codes (TOTP, RFC 6238: HMAC-SHA1, 6 digits, 30s steps) —
 * the format Google Authenticator, 1Password, Authy etc. all read.
 *
 * Written against node:crypto rather than a package so the whole 2FA path is
 * small enough to read in one sitting; the RFC test vectors are in
 * totp.test.ts.
 */

const STEP_SECONDS = 30;
const DIGITS = 6;
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
    let bits = 0, value = 0, out = '';
    for (const byte of buf) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            out += BASE32[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
    return out;
}

export function base32Decode(input: string): Buffer {
    const clean = input.toUpperCase().replace(/[\s=-]/g, '');
    let bits = 0, value = 0;
    const out: number[] = [];
    for (const ch of clean) {
        const idx = BASE32.indexOf(ch);
        if (idx === -1) throw new Error('Invalid base32');
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            out.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return Buffer.from(out);
}

/** A new 160-bit secret, base32 — what the authenticator app stores. */
export function generateTotpSecret(): string {
    return base32Encode(randomBytes(20));
}

export function hotp(secret: Buffer, counter: number): string {
    const msg = Buffer.alloc(8);
    msg.writeBigUInt64BE(BigInt(counter));
    const mac = createHmac('sha1', secret).update(msg).digest();
    const offset = mac[mac.length - 1] & 0x0f;
    const bin = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
    return String(bin % 10 ** DIGITS).padStart(DIGITS, '0');
}

export function currentStep(nowMs = Date.now()): number {
    return Math.floor(nowMs / 1000 / STEP_SECONDS);
}

/**
 * Check a code against the current step and one either side (clock drift).
 *
 * Returns the matching step, or null. Callers must store the step and refuse
 * any later code at or below it, otherwise a code seen over someone's shoulder
 * works again for the rest of its 90-second window.
 */
export function verifyTotp(secretBase32: string, code: string, lastStep: number | null | undefined, nowMs = Date.now()): number | null {
    const digits = String(code).replace(/\s/g, '');
    if (!/^\d{6}$/.test(digits)) return null;
    const secret = base32Decode(secretBase32);
    const now = currentStep(nowMs);
    for (const step of [now - 1, now, now + 1]) {
        if (lastStep != null && step <= lastStep) continue;
        if (timingSafeEqual(Buffer.from(hotp(secret, step)), Buffer.from(digits))) return step;
    }
    return null;
}

export function otpauthUri(secretBase32: string, account: string, issuer: string): string {
    const label = encodeURIComponent(`${issuer}:${account}`);
    const params = new URLSearchParams({ secret: secretBase32, issuer, algorithm: 'SHA1', digits: String(DIGITS), period: String(STEP_SECONDS) });
    return `otpauth://totp/${label}?${params.toString()}`;
}

// ─── Secret encryption at rest ───────────────────────────────────────────────
// A database dump alone must not be enough to mint codes. The key comes from
// TOTP_ENCRYPTION_KEY, or is derived from the session secret when that is not
// set (so rotating NEXTAUTH_SECRET without setting TOTP_ENCRYPTION_KEY first
// turns 2FA off for everyone — use recovery codes or the reset script).

function encryptionKey(): Buffer {
    const base = process.env.TOTP_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
    if (!base) {
        if (process.env.NODE_ENV === 'production') throw new Error('Server configuration error');
        return Buffer.from(hkdfSync('sha256', 'dev-secret', 'totp', 'admin-2fa', 32));
    }
    return Buffer.from(hkdfSync('sha256', base, 'totp', 'admin-2fa', 32));
}

export function encryptSecret(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
    const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ct.toString('base64url')].join(':');
}

export function decryptSecret(stored: string): string {
    const [version, iv, tag, ct] = stored.split(':');
    if (version !== 'v1' || !iv || !tag || !ct) throw new Error('Unrecognised secret format');
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ct, 'base64url')), decipher.final()]).toString('utf8');
}

// ─── Recovery codes ──────────────────────────────────────────────────────────

const RECOVERY_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no 0/o/1/l/i

export function generateRecoveryCodes(count = 8): string[] {
    return Array.from({ length: count }, () => {
        const bytes = randomBytes(10);
        const chars = Array.from(bytes, b => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length]).join('');
        return `${chars.slice(0, 5)}-${chars.slice(5)}`;
    });
}

export function hashRecoveryCode(code: string): string {
    return createHash('sha256').update(code.toLowerCase().replace(/[\s-]/g, '')).digest('hex');
}

/** True if the input looks like a recovery code rather than a 6-digit code. */
export function isRecoveryCodeFormat(input: string): boolean {
    return /^[a-z0-9]{5}-?[a-z0-9]{5}$/i.test(input.trim());
}
