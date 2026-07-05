(function () {
    if (window.__gagBlockerInjected) return;
    window.__gagBlockerInjected = true;

    let blockedTags = [];

    // content.js (isolated world) relays tag updates here, since MAIN-world
    // scripts can't use chrome.storage directly. Custom events on `document`
    // are the one thing both worlds can see, because the DOM is shared even
    // though JS globals/closures are not.
    document.addEventListener('gag-blocker-tags-update', (e) => {
        blockedTags = (e.detail && e.detail.blockedTags) || [];
    });

    // In case fetches fire before content.js's async storage read resolves,
    // ask it to send the current list immediately.
    document.dispatchEvent(new CustomEvent('gag-blocker-request-tags'));

    const getPureTagText = (t) => (t || '').trim().toLowerCase();

    // NOTE: this is a heuristic. We don't yet know 9GAG's exact API response
    // shape for tags, so this tries a few common key names. Once you find a
    // real response in DevTools -> Network -> Fetch/XHR, tell me the actual
    // structure and I'll replace this with an exact match instead of guessing.
    const extractTagNames = (tagsArray) => {
        if (!Array.isArray(tagsArray)) return [];
        return tagsArray
            .map((t) => {
                if (typeof t === 'string') return getPureTagText(t);
                if (t && typeof t === 'object') {
                    return getPureTagText(t.key || t.text || t.name || t.title || '');
                }
                return '';
            })
            .filter(Boolean);
    };

    // Confirmed from a real 9GAG API response (hot?after=... endpoint):
    // each post object has "id", "title", and a "tags" array of
    // { key, url } objects, e.g. { "key": "Sony", "url": "/tag/sony" }.
    const isPostLike = (item) =>
        item &&
        typeof item === 'object' &&
        typeof item.id !== 'undefined' &&
        typeof item.title !== 'undefined' &&
        Array.isArray(item.tags);

    const isBlockedPost = (post) => {
        if (!isPostLike(post)) return false;
        const names = extractTagNames(post.tags);
        return names.some((n) => blockedTags.includes(n));
    };

    // Walks a parsed JSON body looking for arrays that contain post-like
    // objects (id + title + tags array) and filters blocked posts out in
    // place. Uses `.some()` rather than `.every()` so arrays mixing posts
    // with other item types (e.g. ad placeholders) still get filtered
    // correctly instead of being skipped entirely.
    const filterJsonBody = (json) => {
        const walk = (node) => {
            if (Array.isArray(node)) {
                const looksLikePosts = node.length > 0 && node.some(isPostLike);

                if (looksLikePosts) {
                    const before = node.length;
                    const filtered = node.filter((item) => !isPostLike(item) || !isBlockedPost(item));
                    const removed = before - filtered.length;
                    if (removed > 0) {
                        console.log(
                            `[9GAG Blocker] injector filtered ${removed} post(s) from a batch of ${before}`
                        );
                    }
                    node.length = 0;
                    node.push(...filtered);
                    return;
                }

                node.forEach(walk);
            } else if (node && typeof node === 'object') {
                Object.values(node).forEach(walk);
            }
        };

        walk(json);
    };

    const originalFetch = window.fetch;

    // Only intercept 9GAG's feed endpoints. Confirmed pattern from real
    // traffic: /v1/interest-posts/interest/[category]/type/[sort]?after=...
    // Also allow a broader fallback (path just ending in a sort name) in
    // case the Home/Top/Trending tabs use a differently-shaped endpoint we
    // haven't sampled yet -- untested, but safer than silently excluding
    // them. Everything else (ads, analytics, user-state calls) passes
    // straight through with zero overhead.
    const isFeedRequest = (urlStr) => {
        try {
            const u = new URL(urlStr, location.origin);
            const hasAfterParam = u.searchParams.has('after');
            if (!hasAfterParam) return false;

            const isConfirmedInterestPostsPattern =
                /\/v1\/interest-posts\/interest\/[^\/]+\/type\/[^\/]+/i.test(u.pathname);
            const isLikelySortEndpoint = /\/(hot|top|fresh|trending)$/i.test(u.pathname);

            return isConfirmedInterestPostsPattern || isLikelySortEndpoint;
        } catch (e) {
            return false;
        }
    };

    window.fetch = async function (...args) {
        const requestUrl = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';

        if (!isFeedRequest(requestUrl)) {
            return originalFetch.apply(this, args);
        }

        console.log('[9GAG Blocker] intercepting feed request:', requestUrl);

        const response = await originalFetch.apply(this, args);

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            return response;
        }

        let json;
        try {
            // Clone so we don't consume the original stream before deciding
            // whether we actually need to modify it.
            json = await response.clone().json();
        } catch (e) {
            return response;
        }

        try {
            filterJsonBody(json);
        } catch (e) {
            console.error('[9GAG Blocker] injector filtering error:', e);
            return response;
        }

        // Build clean headers rather than reusing the original response's
        // headers wholesale. The original content-length (and possibly
        // content-encoding, if the server compressed the response) no
        // longer match our rewritten plain-JSON body -- passing them through
        // unchanged can cause the browser to mis-parse or fail to decode
        // the new body, which looked like severe glitching during scroll.
        const cleanHeaders = new Headers(response.headers);
        cleanHeaders.delete('content-length');
        cleanHeaders.delete('content-encoding');
        cleanHeaders.set('content-type', 'application/json');

        return new Response(JSON.stringify(json), {
            status: response.status,
            statusText: response.statusText,
            headers: cleanHeaders
        });
    };

    console.log('[9GAG Blocker] MAIN-world fetch injector active');
})();
