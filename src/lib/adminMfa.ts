import { prisma } from './prisma';
import { decryptSecret, hashRecoveryCode, isRecoveryCodeFormat, verifyTotp } from './totp';

export type SecondFactorResult = { ok: true; method: 'totp' | 'recovery'; recoveryCodesLeft: number } | { ok: false };

/**
 * Check an authenticator code or a recovery code for an admin with 2FA on, and
 * consume it.
 *
 * Both paths are single-use under concurrency: the update only matches while
 * the code is still unused, and Postgres re-checks that condition after
 * waiting for any competing update on the row, so two simultaneous logins with
 * the same code cannot both succeed.
 */
export async function verifySecondFactor(userId: string, input: string): Promise<SecondFactorResult> {
    const user = await prisma.adminUser.findUnique({
        where: { id: userId },
        select: { totpSecret: true, totpLastStep: true, recoveryCodes: true },
    });
    if (!user?.totpSecret || !input) return { ok: false };

    const code = String(input).trim();

    if (isRecoveryCodeFormat(code)) {
        const hash = hashRecoveryCode(code);
        if (!user.recoveryCodes.includes(hash)) return { ok: false };
        const remaining = user.recoveryCodes.filter(h => h !== hash);
        const { count } = await prisma.adminUser.updateMany({
            where: { id: userId, recoveryCodes: { has: hash } },
            data: { recoveryCodes: { set: remaining } },
        });
        return count === 1 ? { ok: true, method: 'recovery', recoveryCodesLeft: remaining.length } : { ok: false };
    }

    let secret: string;
    try {
        secret = decryptSecret(user.totpSecret);
    } catch (err) {
        console.error('[2fa] Could not decrypt secret for', userId, err);
        return { ok: false };
    }

    const step = verifyTotp(secret, code, user.totpLastStep);
    if (step === null) return { ok: false };

    const { count } = await prisma.adminUser.updateMany({
        where: { id: userId, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
        data: { totpLastStep: step },
    });
    return count === 1 ? { ok: true, method: 'totp', recoveryCodesLeft: user.recoveryCodes.length } : { ok: false };
}
