/**
 * Transient occupancy tax (TOT) for direct bookings.
 *
 * Airbnb and VRBO collect TOT on their own bookings in many jurisdictions;
 * bookings made on this site never go through them, so the owner collects it
 * here and remits it to the county. The Whistle Inn is in unincorporated
 * western Placer County, where TOT is 8% and there is no tourism-district
 * assessment (that applies only in North Lake Tahoe).
 *
 * Tax is OFF unless `tax_enabled` is exactly "true", so deploying this never
 * changes a guest's price until the owner has confirmed the rates.
 *
 * Kept free of Prisma so it can be unit-tested and reused by the quote, the
 * checkout and the tax report without them drifting apart.
 */

export type TaxSettings = {
    enabled: boolean;
    /** Percent, e.g. 8 for 8%. */
    totRate: number;
    /** Tourism-district assessment, percent. 0 = none. */
    assessmentRate: number;
    assessmentLabel: string;
    /** Whether the cleaning fee is part of taxable rent. */
    cleaningFeeTaxable: boolean;
    /** Stays of at least this many nights are exempt. 0 = no exemption. */
    exemptNights: number;
};

export const TAX_SETTING_KEYS = {
    enabled: 'tax_enabled',
    totRate: 'tax_tot_rate',
    assessmentRate: 'tax_assessment_rate',
    assessmentLabel: 'tax_assessment_label',
    cleaningFeeTaxable: 'tax_cleaning_taxable',
    exemptNights: 'tax_exempt_nights',
} as const;

/** Unincorporated western Placer County — confirm against the owner's TOT return. */
export const DEFAULT_TAX_SETTINGS: TaxSettings = {
    enabled: false,
    totRate: 8,
    assessmentRate: 0,
    assessmentLabel: 'Tourism assessment',
    cleaningFeeTaxable: true,
    exemptNights: 30,
};

function parseRate(raw: string | undefined, fallback: number): number {
    if (raw === undefined || raw.trim() === '') return fallback;
    const n = parseFloat(raw);
    // A rate outside 0–50% is a typo, not a tax; fall back rather than charge it.
    return Number.isFinite(n) && n >= 0 && n <= 50 ? n : fallback;
}

/** Build settings from ContentBlock values keyed by TAX_SETTING_KEYS. */
export function parseTaxSettings(byKey: Record<string, string | undefined>): TaxSettings {
    const d = DEFAULT_TAX_SETTINGS;
    const exempt = parseInt(byKey[TAX_SETTING_KEYS.exemptNights] ?? '', 10);
    return {
        enabled: byKey[TAX_SETTING_KEYS.enabled]?.trim() === 'true',
        totRate: parseRate(byKey[TAX_SETTING_KEYS.totRate], d.totRate),
        assessmentRate: parseRate(byKey[TAX_SETTING_KEYS.assessmentRate], d.assessmentRate),
        assessmentLabel: byKey[TAX_SETTING_KEYS.assessmentLabel]?.trim() || d.assessmentLabel,
        cleaningFeeTaxable: (byKey[TAX_SETTING_KEYS.cleaningFeeTaxable]?.trim() ?? 'true') !== 'false',
        exemptNights: Number.isFinite(exempt) && exempt >= 0 ? exempt : d.exemptNights,
    };
}

export type TaxBreakdown = {
    /** Rent the tax was charged on (after discount). 0 when exempt or disabled. */
    taxableAmount: number;
    totRate: number;
    totAmount: number;
    assessmentRate: number;
    assessmentLabel: string;
    assessmentAmount: number;
    /** totAmount + assessmentAmount */
    totalTax: number;
    /** Long stay — no tax charged, but still reported as exempt rent. */
    exempt: boolean;
};

const cents = (n: number) => Math.round(n * 100) / 100;

export function calculateTax(
    input: { accommodationTotal: number; discountAmount: number; cleaningFee: number; nights: number },
    settings: TaxSettings
): TaxBreakdown {
    const none: TaxBreakdown = {
        taxableAmount: 0,
        totRate: 0,
        totAmount: 0,
        assessmentRate: 0,
        assessmentLabel: settings.assessmentLabel,
        assessmentAmount: 0,
        totalTax: 0,
        exempt: false,
    };
    if (!settings.enabled) return none;
    if (settings.exemptNights > 0 && input.nights >= settings.exemptNights) {
        return { ...none, exempt: true };
    }

    const rent = Math.max(0, input.accommodationTotal - input.discountAmount);
    const taxableAmount = cents(rent + (settings.cleaningFeeTaxable ? input.cleaningFee : 0));
    // Each tax is rounded on its own: they are filed separately, so the
    // amounts on the receipt must match what each return reports.
    const totAmount = cents(taxableAmount * settings.totRate / 100);
    const assessmentAmount = cents(taxableAmount * settings.assessmentRate / 100);

    return {
        taxableAmount,
        totRate: settings.totRate,
        totAmount,
        assessmentRate: settings.assessmentRate,
        assessmentLabel: settings.assessmentLabel,
        assessmentAmount,
        totalTax: cents(totAmount + assessmentAmount),
        exempt: false,
    };
}
