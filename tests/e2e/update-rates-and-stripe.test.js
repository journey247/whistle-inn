const puppeteer = require('puppeteer');
require('dotenv').config();

(async () => {
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';
    const URL = process.env.ADMIN_URL || 'http://localhost:3000/admin';
    const POLL_TIMEOUT_MS = 60000; // 60s
    const POLL_INTERVAL_MS = 2000; // 2s

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        console.log('Waiting for server to be ready...');
        // Wait for server to be reachable
        const maxAttempts = 30;
        let attempt = 0;
        const wait = (ms) => new Promise(res => setTimeout(res, ms));
        const isReachable = async () => {
            try {
                const resp = await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 5000 });
                return resp && resp.ok();
            } catch (e) { return false; }
        };
        while (attempt < maxAttempts) {
            if (await isReachable()) break;
            attempt++;
            console.log('Server not ready, retrying...', attempt);
            await wait(1000);
        }

        console.log('Navigating to admin page...');
        await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // Login via UI
        await page.type('input[type="email"]', ADMIN_EMAIL);
        await page.type('input[type="password"]', ADMIN_PASSWORD);
        // Click the Sign In button by matching its text (avoid page.$x for compatibility)
        const clicked = await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').trim().toLowerCase().includes('sign in'));
            if (btn) {
                btn.click();
                return true;
            }
            return false;
        });
        if (!clicked) throw new Error('Sign In button not found');

        // Wait for admin nav (indicates logged in)
        await page.waitForSelector('nav', { timeout: 15000 });
        console.log('Logged in via UI');

        // Compose new prices (randomize slightly to force update)
        const newWeekday = Math.floor(100 + Math.random() * 500);
        const newWeekend = Math.floor(120 + Math.random() * 500);

        // Use page.evaluate to save via admin content API (uses stored token)
        await page.evaluate(async (weekday, weekend) => {
            const token = localStorage.getItem('admin_token');
            if (!token) throw new Error('admin_token not found in localStorage');

            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

            // Save weekday and weekend base prices sequentially
            await fetch('/api/admin/content', { method: 'PUT', headers, body: JSON.stringify({ key: 'base_weekday_price', value: String(weekday), label: 'Base Weekday Price', section: 'Pricing' }) });
            await fetch('/api/admin/content', { method: 'PUT', headers, body: JSON.stringify({ key: 'base_weekend_price', value: String(weekend), label: 'Base Weekend Price', section: 'Pricing' }) });
        }, newWeekday, newWeekend);

        console.log(`Saved new base prices: weekday=${newWeekday} weekend=${newWeekend}`);

        // Poll /api/admin/content until stripe_weekday_price_id and stripe_weekend_price_id exist
        const start = Date.now();
        let found = false;
        let lastContent = null;

        while (Date.now() - start < POLL_TIMEOUT_MS) {
            const content = await page.evaluate(async () => {
                const token = localStorage.getItem('admin_token');
                const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
                const res = await fetch('/api/admin/content', { headers });
                if (!res.ok) return null;
                return await res.json();
            });

            lastContent = content;
            if (Array.isArray(content)) {
                const weekdayPriceId = content.find(b => b.key === 'stripe_weekday_price_id');
                const weekendPriceId = content.find(b => b.key === 'stripe_weekend_price_id');
                if (weekdayPriceId && weekdayPriceId.value && weekendPriceId && weekendPriceId.value) {
                    found = true;
                    console.log('Found stripe price IDs:', weekdayPriceId.value, weekendPriceId.value);
                    break;
                }
            }

            await wait(POLL_INTERVAL_MS);
        }

        if (!found) {
            console.error('Stripe IDs not created within timeout. Last content snapshot:', JSON.stringify(lastContent, null, 2));
            throw new Error('Stripe IDs not created in time');
        }

        // Take a success screenshot
        await page.screenshot({ path: 'tests/e2e/update-rates-and-stripe-success.png', fullPage: true });
        console.log('E2E rate update test passed');
        process.exit(0);
    } catch (err) {
        console.error('E2E test failed:', err);
        try { await page.screenshot({ path: 'tests/e2e/update-rates-and-stripe-failure.png', fullPage: true }); } catch (e) { }
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
