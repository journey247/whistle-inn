import { describe, expect, it } from 'vitest';
import { evaluateLaunchGate, type LaunchGateInputs } from './launch-gate';

const ready: LaunchGateInputs = {
    onboardingComplete: true,
    strPermit: 'STR-2026-0142',
    totCertificate: 'TOT-88123',
    taxEnabled: true,
    stripeChargesEnabled: true,
};

describe('evaluateLaunchGate', () => {
    it('opens when everything is in place', () => {
        const gate = evaluateLaunchGate(ready);
        expect(gate.ready).toBe(true);
        expect(gate.items.every(i => i.ok)).toBe(true);
    });

    it.each([
        ['setup', { onboardingComplete: false }],
        ['strPermit', { strPermit: '' }],
        ['totCertificate', { totCertificate: '' }],
        ['tax', { taxEnabled: false }],
        ['stripe', { stripeChargesEnabled: false }],
    ] as const)('stays shut without %s', (id, change) => {
        const gate = evaluateLaunchGate({ ...ready, ...change });
        expect(gate.ready).toBe(false);
        expect(gate.items.filter(i => !i.ok).map(i => i.id)).toEqual([id]);
    });

    it('does not count a permit of only spaces', () => {
        expect(evaluateLaunchGate({ ...ready, strPermit: '   ' }).ready).toBe(false);
    });

    it('lists every missing step, each with where to fix it', () => {
        const gate = evaluateLaunchGate({
            onboardingComplete: false, strPermit: '', totCertificate: '', taxEnabled: false, stripeChargesEnabled: false,
        });
        expect(gate.items).toHaveLength(5);
        expect(gate.items.every(i => !i.ok && i.fix.startsWith('Settings'))).toBe(true);
    });
});
