\
import { createPlaywrightRouter } from '@crawlee/playwright';
import { Actor } from 'apify';

import { discoverProfileUrls, extractDesignerProfile } from './extract.js';

export const router = createPlaywrightRouter();

router.addHandler('DIRECTORY', async ({ page, request, requestQueue, log }) => {
    log.info(`Scanning directory: ${request.loadedUrl || request.url}`);

    const profileUrls = await discoverProfileUrls(
        page,
        request.loadedUrl || request.url,
        log,
    );

    const maxProfiles = Number(request.userData.maxProfiles || 0);
    const selectedUrls =
        maxProfiles > 0 ? profileUrls.slice(0, maxProfiles) : profileUrls;

    if (selectedUrls.length === 0) {
        throw new Error('No designer profile URLs were discovered.');
    }

    await requestQueue.addRequests(
        selectedUrls.map((url) => ({
            url,
            label: 'PROFILE',
        })),
    );

    await Actor.setStatusMessage(
        `Discovered ${selectedUrls.length} designer profiles.`,
    );

    log.info(`Queued ${selectedUrls.length} designer profiles`);
});

router.addHandler('PROFILE', async ({ page, request, log }) => {
    const profileUrl = request.loadedUrl || request.url;
    const record = await extractDesignerProfile(page, profileUrl);

    await Actor.pushData(record);

    log.info(`Saved profile: ${record.designer_name || profileUrl}`);
});

router.addDefaultHandler(async ({ request, log }) => {
    log.warning(`No handler configured for ${request.url}`);
});
