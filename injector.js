(function() {
    // Get blocked tags from localStorage
    function getBlockedTags() {
        try {
            const raw = localStorage.getItem('gagBlockedTags');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    // Filter blocked posts from data structure
    function filterBlockedPosts(obj, blockedTags) {
        if (!obj || typeof obj !== 'object') return obj;

        // Handle arrays (post lists)
        if (Array.isArray(obj)) {
            return obj.filter(item => {
                if (!item || typeof item !== 'object') return true;
                
                // Check if this is a post with tags
                if (item.tags && Array.isArray(item.tags)) {
                    const hasBlocked = item.tags.some(tag => {
                        const tagKey = tag?.key ? tag.key.toLowerCase() : '';
                        return blockedTags.includes(tagKey);
                    });
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

    // Intercept JSON.parse
    const originalParse = JSON.parse;
    JSON.parse = function(text, reviver) {
        let obj = originalParse.call(this, text, reviver);
        
        // Only filter if this looks like it contains posts
        if (typeof text === 'string' && text.includes('"tags"') && text.includes('"key"')) {
            const blockedTags = getBlockedTags();
            if (blockedTags.length > 0) {
                obj = filterBlockedPosts(obj, blockedTags);
            }
        }
        
        return obj;
    };

    // Intercept fetch responses
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        
        // Only process JSON responses
        if (!response.headers.get('content-type')?.includes('application/json')) {
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
                return new Response(JSON.stringify(filtered), {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers
                });
            }
        } catch (e) {
            // Not JSON or error parsing, return original
        }

        return response;
    };

    console.log('[9GAG Blocker] Injector loaded - filtering at API level');
})();
