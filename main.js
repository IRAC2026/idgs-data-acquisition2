\
import { Actor } from 'apify';
import { PlaywrightCrawler } from '@crawlee/playwright';

import { router } from './routes.js';

await Actor.init();

try {
    const input = (await Actor.getInput()) ?? {};

    const startUrl =
        input.startUrl
        || 'https://www.theexpert.com/consultations/find-an-expert';

    const maxProfiles = Number(input.maxProfiles || 0);
    const maxConcurrency = Number(input.maxConcurrency || 3);

    const requestQueue = await Actor.openRequestQueue();

    await requestQueue.addRequest({
        url: startUrl,
        label: 'DIRECTORY',
        userData: {
            maxProfiles,
        },
    });

    const crawler = new PlaywrightCrawler({
        requestQueue,
        requestHandler: router,
        maxConcurrency,
        maxRequestRetries: 3,
        navigationTimeoutSecs: 60,
        requestHandlerTimeoutSecs: 120,
        useSessionPool: true,
        persistCookiesPerSession: true,
        launchContext: {
            launchOptions: {
                headless: true,
            },
        },
        preNavigationHooks: [
            async ({ page }) => {
                await page.setViewportSize({
                    width: 1440,
                    height: 1200,
                });
            },
        ],
        failedRequestHandler: async ({ request, log }) => {
            log.error(`Request failed after retries: ${request.url}`);
            await Actor.pushData({
                record_type: 'error',
                url: request.url,
                error: 'Request failed after all retries.',
                scraped_at: new Date().toISOString(),
            });
        },
    });

    await crawler.run();

    await Actor.setStatusMessage('Designer profile scrape completed.');
} finally {
    await Actor.exit();
}
