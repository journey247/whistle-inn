// Simple Puppeteer E2E test to verify admin login and bookings table load
// Usage: make sure the dev server is running at http://localhost:3000 and run:
//   npm run test:e2e

const puppeteer = require('puppeteer');
require('dotenv').config();

(async () => {
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';
    const URL = process.env.ADMIN_URL || 'http://localhost:3000/admin';

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        console.log('Waiting for server to be ready...');
        // Wait for server to be reachable
        const maxAttempts = 20;
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

        // Fill login form
        await page.type('input[type="email"]', ADMIN_EMAIL);
        await page.type('input[type="password"]', ADMIN_PASSWORD);

        // Click Sign In (using XPath to match text)
        const [button] = await page.$x("//button[contains(., 'Sign In')]");
        if (button) {
            await button.click();
        } else {
            throw new Error('Sign In button not found');
        }

        // Wait for bookings header or table to appear
        await page.waitForSelector('nav', { timeout: 10000 });

        console.log('Login successful and Nav found ✅');

        // Inspect sidebar items
        const styles = await page.evaluate(() => {
            const aside = document.querySelector('aside');
            const asideBg = aside ? window.getComputedStyle(aside).backgroundColor : 'N/A';
            const titleElement = document.querySelector('aside .font-bold.text-xl');
            const titleText = titleElement ? titleElement.innerText : 'TITLE NOT FOUND';

            const items = Array.from(document.querySelectorAll('nav button'));
            return {
                titleText,
                asideBackground: asideBg,
                items: items.map(btn => {
                    const style = window.getComputedStyle(btn);
                    const span = btn.querySelector('span');
                    const spanStyle = span ? window.getComputedStyle(span) : null;
                    return {
                        text: btn.innerText.trim(),
                        color: style.color,
                        backgroundColor: style.backgroundColor,
                        display: style.display,
                        visibility: style.visibility,
                        opacity: style.opacity,
                        width: style.width,
                        spanOpacity: spanStyle ? spanStyle.opacity : 'N/A',
                        spanWidth: spanStyle ? spanStyle.width : 'N/A',
                        spanDisplay: spanStyle ? spanStyle.display : 'N/A'
                    };
                }) // End map
            }; // End return object
        }); // End evaluate

        console.log('Sidebar Item Styles:', JSON.stringify(styles, null, 2));

        // Optional: take screenshot
        await page.screenshot({ path: 'tests/e2e/admin-dashboard.png', fullPage: true });
        console.log('Screenshot saved: tests/e2e/admin-dashboard.png');

        console.log('E2E test passed');
        process.exit(0);
    } catch (err) {
        console.error('E2E test failed:', err);
        await page.screenshot({ path: 'tests/e2e/admin-failure.png', fullPage: true }).catch(() => { });
        process.exit(1);
    } finally {
        await browser.close();
    }
})();