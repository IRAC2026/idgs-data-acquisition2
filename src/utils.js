\
export const PROFILE_URL_PATTERN =
    /^https:\/\/www\.theexpert\.com\/consultations\/find-an-expert\/[^/?#]+\/consultations\/?(?:[?#].*)?$/i;

export function normalizeUrl(value, baseUrl) {
    if (!value) return null;

    try {
        const url = new URL(value, baseUrl);
        url.hash = '';
        return url.href;
    } catch {
        return null;
    }
}

export function unique(values) {
    return [...new Set(values.filter(Boolean))];
}

export function cleanText(value) {
    if (!value) return null;

    const cleaned = value
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return cleaned || null;
}

export function instagramHandleFromUrl(value) {
    if (!value) return null;

    try {
        const url = new URL(value);
        if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return null;

        const handle = url.pathname.split('/').filter(Boolean)[0];
        return handle ? `@${handle.replace(/^@/, '')}` : null;
    } catch {
        return null;
    }
}

export function classifyExternalLinks(links) {
    const normalized = unique(links);

    const instagramUrl =
        normalized.find((url) => /(^|\.)instagram\.com\//i.test(url)) ?? null;

    const excludedHosts = [
        'theexpert.com',
        'instagram.com',
        'facebook.com',
        'pinterest.com',
        'linkedin.com',
        'tiktok.com',
        'youtube.com',
        'twitter.com',
        'x.com',
        'mailto:',
        'tel:',
    ];

    const websiteUrl =
        normalized.find((url) => {
            const lower = url.toLowerCase();
            return !excludedHosts.some((host) => lower.includes(host));
        }) ?? null;

    return {
        instagram_url: instagramUrl,
        instagram_handle: instagramHandleFromUrl(instagramUrl),
        website_url: websiteUrl,
    };
}
