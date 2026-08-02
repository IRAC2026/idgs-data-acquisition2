\
import { cleanText, classifyExternalLinks, normalizeUrl, unique } from './utils.js';

export async function discoverProfileUrls(page, startUrl, log) {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);

    const collected = new Set();
    let unchangedRounds = 0;
    let previousCount = 0;

    for (let round = 0; round < 30; round += 1) {
        const hrefs = await page.locator('a[href]').evaluateAll((anchors) =>
            anchors.map((anchor) => anchor.href),
        );

        for (const href of hrefs) {
            const normalized = normalizeUrl(href, startUrl);
            if (
                normalized
                && /^https:\/\/www\.theexpert\.com\/consultations\/find-an-expert\/[^/?#]+\/consultations\/?(?:[?#].*)?$/i.test(normalized)
            ) {
                collected.add(normalized.split('?')[0]);
            }
        }

        const buttonSelectors = [
            'button:has-text("Load more")',
            'button:has-text("Show more")',
            'button:has-text("View more")',
            'a:has-text("Next")',
            'button[aria-label*="next" i]',
        ];

        let clicked = false;
        for (const selector of buttonSelectors) {
            const candidate = page.locator(selector).first();
            if (await candidate.count()) {
                try {
                    if (await candidate.isVisible() && await candidate.isEnabled()) {
                        await candidate.click({ timeout: 3000 });
                        await page.waitForTimeout(1800);
                        clicked = true;
                        break;
                    }
                } catch {
                    // Continue to scrolling if a candidate cannot be clicked.
                }
            }
        }

        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(clicked ? 1800 : 1200);

        if (collected.size === previousCount) {
            unchangedRounds += 1;
        } else {
            unchangedRounds = 0;
            previousCount = collected.size;
            log.info(`Discovered ${collected.size} unique profile URLs`);
        }

        if (unchangedRounds >= 5) break;
    }

    if (collected.size === 0) {
        const sampleLinks = await page.locator('a[href]').evaluateAll((anchors) =>
            anchors.slice(0, 40).map((anchor) => anchor.href),
        );
        log.warning('No profile URLs matched. Sample page links follow.', {
            sampleLinks,
        });
    }

    return [...collected];
}

export async function extractDesignerProfile(page, profileUrl) {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);

    const raw = await page.evaluate(() => {
        const normalize = (value) =>
            value?.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim() || null;

        const allText = document.body?.innerText || '';
        const h1 = document.querySelector('h1');
        const name = normalize(h1?.textContent);

        const title =
            document.querySelector('meta[property="og:title"]')?.getAttribute('content')
            || document.title
            || null;

        const description =
            document.querySelector('meta[property="og:description"]')?.getAttribute('content')
            || document.querySelector('meta[name="description"]')?.getAttribute('content')
            || null;

        const links = [...document.querySelectorAll('a[href]')]
            .map((anchor) => anchor.href)
            .filter(Boolean);

        const headings = [...document.querySelectorAll('h2, h3, h4')];
        const aboutHeading = headings.find((heading) =>
            /^about$/i.test(normalize(heading.textContent) || ''),
        );

        let bio = null;
        if (aboutHeading) {
            const parts = [];
            let node = aboutHeading.nextElementSibling;

            while (node && !/^H[1-4]$/.test(node.tagName)) {
                const text = normalize(node.textContent);
                if (text) parts.push(text);
                node = node.nextElementSibling;
            }

            bio = normalize(parts.join(' '));
        }

        if (!bio && description) bio = normalize(description);

        const lines = allText
            .split('\n')
            .map(normalize)
            .filter(Boolean);

        let location = null;
        const nameIndex = name ? lines.findIndex((line) => line === name) : -1;
        const candidateLines =
            nameIndex >= 0 ? lines.slice(nameIndex + 1, nameIndex + 8) : lines.slice(0, 20);

        location =
            candidateLines.find((line) =>
                /^[A-Za-zÀ-ÿ.'’\- ]+,\s*(?:[A-Z]{2}|[A-Za-zÀ-ÿ.'’\- ]+),\s*[A-Z]{2,3}$/i.test(line),
            )
            || candidateLines.find((line) =>
                /^[A-Za-zÀ-ÿ.'’\- ]+,\s*(?:[A-Z]{2}|[A-Za-zÀ-ÿ.'’\- ]+)$/i.test(line),
            )
            || null;

        return {
            name,
            title: normalize(title),
            description: normalize(description),
            bio,
            location,
            links,
        };
    });

    const externalLinks = unique(
        raw.links
            .map((href) => normalizeUrl(href, profileUrl))
            .filter((href) => href && !href.startsWith('javascript:')),
    );

    const classified = classifyExternalLinks(externalLinks);

    return {
        designer_name: cleanText(raw.name),
        firm_name: cleanText(raw.name),
        location: cleanText(raw.location),
        designer_bio: cleanText(raw.bio),
        the_expert_profile_url: profileUrl,
        instagram_url: classified.instagram_url,
        instagram_handle: classified.instagram_handle,
        website_url: classified.website_url,
        page_title: cleanText(raw.title),
        page_description: cleanText(raw.description),
        source_website: 'The Expert',
        scraped_at: new Date().toISOString(),
    };
}
