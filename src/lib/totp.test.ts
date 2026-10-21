import { describe, it, expect } from 'vitest';
import {
    base32Decode, base32Encode, decryptSecret, encryptSecret, generateRecoveryCodes,
    hashRecoveryCode, hotp, isRecoveryCodeFormat, otpauthUri, verifyTotp,
} from './totp';

// RFC 6238 appendix B, SHA1 key. The RFC uses 8 digits; ours are the last 6.
const RFC_KEY = Buffer.from('12345678901234567890', 'ascii');
const RFC_KEY_B32 = base32Encode(RFC_KEY);

describe('totp', () => {
    it('round-trips base32', () => {
        expect(RFC_KEY_B32).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
        expect(base32Decode(RFC_KEY_B32).equals(RFC_KEY)).toBe(true);
        expect(base32Decode('gezd gnbv-gy3t')).toEqual(base32Decode('GEZDGNBVGY3T'));
    });

    it.each([
        [59, '287082'],
        [1111111109, '081804'],
        [1234567890, '005924'],
        [2000000000, '279037'],
    ])('matches the RFC 6238 vector at T=%i', (seconds, expected) => {
        expect(hotp(RFC_KEY, Math.floor(seconds / 30))).toBe(expected);
        expect(verifyTotp(RFC_KEY_B32, expected, null, seconds * 1000)).toBe(Math.floor(seconds / 30));
    });

    it('accepts one step of clock drift either way, but not two', () => {
        const now = 1234567890 * 1000;
        const step = Math.floor(1234567890 / 30);
        expect(verifyTotp(RFC_KEY_B32, hotp(RFC_KEY, step - 1), null, now)).toBe(step - 1);
        expect(verifyTotp(RFC_KEY_B32, hotp(RFC_KEY, step + 1), null, now)).toBe(step + 1);
        expect(verifyTotp(RFC_KEY_B32, hotp(RFC_KEY, step - 2), null, now)).toBeNull();
    });

    it('refuses a code at or before the last accepted step (replay)', () => {
        const now = 1234567890 * 1000;
        const step = Math.floor(1234567890 / 30);
        const code = hotp(RFC_KEY, step);
        expect(verifyTotp(RFC_KEY_B32, code, step, now)).toBeNull();
        expect(verifyTotp(RFC_KEY_B32, code, step - 1, now)).toBe(step);
    });

    it('rejects malformed codes', () => {
        expect(verifyTotp(RFC_KEY_B32, '12345', null)).toBeNull();
        expect(verifyTotp(RFC_KEY_B32, 'abcdef', null)).toBeNull();
        expect(verifyTotp(RFC_KEY_B32, '', null)).toBeNull();
    });

    it('builds an otpauth URI authenticator apps accept', () => {
        const uri = otpauthUri('ABC', 'host@example.com', 'Whistle Inn');
        expect(uri.startsWith('otpauth://totp/Whistle%20Inn%3Ahost%40example.com?')).toBe(true);
        expect(new URL(uri).searchParams.get('secret')).toBe('ABC');
        expect(new URL(uri).searchParams.get('issuer')).toBe('Whistle Inn');
    });
});

describe('secret encryption', () => {
    it('round-trips and uses a fresh IV each time', () => {
        const a = encryptSecret('JBSWY3DPEHPK3PXP');
        const b = encryptSecret('JBSWY3DPEHPK3PXP');
        expect(a).not.toBe(b);
        expect(a).not.toContain('JBSWY3DPEHPK3PXP');
        expect(decryptSecret(a)).toBe('JBSWY3DPEHPK3PXP');
    });

    it('rejects tampered ciphertext', () => {
        const parts = encryptSecret('JBSWY3DPEHPK3PXP').split(':');
        parts[3] = Buffer.from('tampered!!').toString('base64url');
        expect(() => decryptSecret(parts.join(':'))).toThrow();
    });
});

describe('recovery codes', () => {
    it('generates distinct codes in xxxxx-xxxxx form', () => {
        const codes = generateRecoveryCodes();
        expect(codes).toHaveLength(8);
        expect(new Set(codes).size).toBe(8);
        for (const c of codes) expect(isRecoveryCodeFormat(c)).toBe(true);
    });

    it('hashes the same regardless of case, spaces or dash', () => {
        expect(hashRecoveryCode('abcde-fghjk')).toBe(hashRecoveryCode('ABCDE FGHJK'));
        expect(hashRecoveryCode('abcde-fghjk')).toBe(hashRecoveryCode('abcdefghjk'));
    });

    it('does not mistake a 6-digit code for a recovery code', () => {
        expect(isRecoveryCodeFormat('123456')).toBe(false);
    });
});
