// End-to-end check of admin sign-in and two-factor login, run in CI against a
// fresh Postgres seeded with one admin (see .github/workflows/e2e.yml).
//
//   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD  the seeded admin
//   E2E_BASE_URL                          default http://localhost:3000
//
// Turns 2FA on for that admin, so point it only at a throwaway database.

const crypto = require('crypto');
const puppeteer = require('puppeteer');

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
    console.error('Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD');
    process.exit(1);
}

/** The code an authenticator app would show for `secret` at `stepOffset` steps from now. */
function totp(secret, stepOffset = 0) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0, value = 0;
    const bytes = [];
    for (const ch of secret.toUpperCase()) {
        value = (value << 5) | alphabet.indexOf(ch);
        bits += 5;
        if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
    }
    const msg = Buffer.alloc(8);
    msg.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + stepOffset));
    const mac = crypto.createHmac('sha1', Buffer.from(bytes)).update(msg).digest();
    const o = mac[mac.length - 1] & 15;
    const n = ((mac[o] & 127) << 24) | (mac[o + 1] << 16) | (mac[o + 2] << 8) | mac[o + 3];
    return String(n % 1e6).padStart(6, '0');
}

function step(name) {
    console.log(`→ ${name}`);
}

async function clickButton(page, text) {
    await page.waitForFunction(
        t => [...document.querySelectorAll('button')].some(b => b.innerText.trim() === t),
        { timeout: 15000 }, text,
    );
    await page.evaluate(t => {
        [...document.querySelectorAll('button')].find(b => b.innerText.trim() === t).click();
    }, text);
}

async function waitForText(page, text, timeout = 15000) {
    await page.waitForFunction(t => document.body.innerText.includes(t), { timeout }, text);
}

/** POST from inside the page so the session cookie goes with it. */
async function post(page, path, body) {
    return page.evaluate(async (p, b) => {
        const res = await fetch(p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
        return { status: res.status, body: await res.json().catch(() => null) };
    }, path, body);
}

async function signOut(page) {
    await post(page, '/api/admin/auth/logout', {});
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="email"]');
}

/** Fill email + password and submit; returns once the form has answered. */
async function submitPassword(page) {
    await page.type('input[type="email"]', EMAIL);
    await page.type('input[type="password"]', PASSWORD);
    await clickButton(page, 'Sign In');
}

async function submitCode(page, code) {
    await page.waitForSelector('#login-code');
    await page.click('#login-code', { clickCount: 3 });
    await page.type('#login-code', code);
    await clickButton(page, 'Sign In');
    await waitForText(page, 'Today', 20000); // the dashboard's first tab
}

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        // GitHub's Ubuntu runners block Chrome's sandbox via AppArmor.
        args: process.env.CI ? ['--no-sandbox'] : [],
    });
    const page = await browser.newPage();

    try {
        step('public homepage loads');
        const home = await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
        if (!home || !home.ok()) throw new Error(`Homepage returned ${home && home.status()}`);

        step('admin API refuses requests without a session');
        const anon = await page.evaluate(async () => (await fetch('/api/admin/bookings')).status);
        if (anon !== 401) throw new Error(`Expected 401 without a session, got ${anon}`);

        step('sign in with password (2FA off)');
        await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle2' });
        await submitPassword(page);
        await waitForText(page, 'Today', 20000);

        step('turn on two-factor login in Settings → Security');
        await clickButton(page, 'Settings');
        await clickButton(page, 'Security');
        await clickButton(page, 'Set up two-factor login');
        await page.waitForSelector('code');
        const secret = (await page.$eval('code', el => el.textContent)).trim();
        await page.type('#totp-enable', totp(secret));
        await clickButton(page, 'Turn on');
        await waitForText(page, 'Save these recovery codes');
        const recoveryCodes = await page.$$eval('.font-mono span', els => els.map(e => e.textContent.trim()));
        if (recoveryCodes.length !== 8) throw new Error(`Expected 8 recovery codes, got ${recoveryCodes.length}`);

        step('session survives turning 2FA on');
        const me = await page.evaluate(async () => (await fetch('/api/admin/auth/me')).json());
        if (!me.twoFactorEnabled) throw new Error('Expected twoFactorEnabled after setup');

        step('sign in again: password, then code');
        await signOut(page);
        await submitPassword(page);
        await page.waitForSelector('#login-code');
        // The code used to turn 2FA on is spent; the next step's code is new
        // and still inside the accepted window.
        await submitCode(page, totp(secret, 1));

        step('a used code is refused');
        await signOut(page);
        const replay = await post(page, '/api/admin/auth/login', { email: EMAIL, password: PASSWORD, code: totp(secret, 1) });
        if (replay.status !== 401) throw new Error(`Replayed code was accepted (${replay.status})`);

        step('a recovery code signs in once');
        await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle2' });
        await submitPassword(page);
        await submitCode(page, recoveryCodes[0]);
        await signOut(page);
        const reuse = await post(page, '/api/admin/auth/login', { email: EMAIL, password: PASSWORD, code: recoveryCodes[0] });
        if (reuse.status !== 401) throw new Error(`Reused recovery code was accepted (${reuse.status})`);

        step('activity log recorded it');
        await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle2' });
        await submitPassword(page);
        await submitCode(page, recoveryCodes[1]);
        const actions = await page.evaluate(async () => {
            const data = await (await fetch('/api/admin/audit-log')).json();
            return data.entries.map(e => e.action);
        });
        for (const expected of ['auth.2fa_enabled', 'auth.recovery_code_used', 'auth.login_failed']) {
            if (!actions.includes(expected)) throw new Error(`Audit log is missing ${expected}`);
        }

        console.log('E2E admin 2FA test passed');
        await browser.close();
        process.exit(0);
    } catch (err) {
        console.error('E2E admin 2FA test failed:', err);
        try { await page.screenshot({ path: 'tests/e2e/admin-2fa-failure.png', fullPage: true }); } catch { /* ignore */ }
        await browser.close();
        process.exit(1);
    }
})();
