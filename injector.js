(function() {
    // Get blocked tags from localStorage (shared with content script)
    function getBlockedTags() {
        try {
            const raw = localStorage.getItem('gagBlockedTags');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('[9GAG Blocker Injector] Error reading blocked tags:', e);
            return [];
        }
    }

    // Filter blocked posts from data structure - handle nested posts
    function filterBlockedPosts(obj, blockedTags) {
        if (!obj || typeof obj !== 'object') return obj;

        // Handle 9GAG API response: { data: { posts: [...] } }
        if (obj.data && obj.data.posts && Array.isArray(obj.data.posts)) {
            console.log('[9GAG Blocker Injector] Found 9GAG posts structure, filtering...');
            obj.data.posts = obj.data.posts.filter(post => {
                if (!post || typeof post !== 'object') return true;
                
                if (post.tags && Array.isArray(post.tags)) {
                    const hasBlocked = post.tags.some(tag => {
                        const tagKey = tag?.key ? tag.key.toLowerCase() : '';
                        return blockedTags.includes(tagKey);
                    });
                    if (hasBlocked) {
                        console.log('[9GAG Blocker Injector] Filtered post with tags:', post.tags.map(t => t.key).join(', '));
                    }
                    return !hasBlocked;
                }
                return true;
            });
            return obj;
        }

        // Handle direct arrays (post lists)
        if (Array.isArray(obj)) {
            return obj.filter(item => {
                if (!item || typeof item !== 'object') return true;
                
                if (item.tags && Array.isArray(item.tags)) {
                    const hasBlocked = item.tags.some(tag => {
                        const tagKey = tag?.key ? tag.key.toLowerCase() : '';
                        return blockedTags.includes(tagKey);
                    });
                    if (hasBlocked) {
                        console.log('[9GAG Blocker Injector] Filtered post with tags:', item.tags.map(t => t.key).join(', '));
                    }
                    return !hasBlocked;
                }
                return true;
            });
        }

        // Handle objects - recurse into properties
        const result = {};
        for (const key in obj) {
            result[key] = filterBlockedPosts(obj[key], blockedTags);
        }
        return result;
    }

    // Intercept fetch responses
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        
        // Only process JSON responses
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return response;
        }

        const blockedTags = getBlockedTags();
        if (blockedTags.length === 0) {
            return response;
        }

        try {
            const cloned = response.clone();
            let data = await cloned.json();
            const filtered = filterBlockedPosts(data, blockedTags);

            if (filtered !== data) {
                console.log('[9GAG Blocker Injector] Fetch response filtered, blockedTags:', blockedTags);
                return new Response(JSON.stringify(filtered), {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers
                });
            }
        } catch (e) {
            console.error('[9GAG Blocker Injector] Error filtering fetch response:', e);
        }

        return response;
    };

    console.log('[9GAG Blocker Injector] Loaded - intercepting fetch at API level');
})();
