(function () {
    let cachedBlockedTags = [];

    function getBlockedTags() {
        try {
            const raw = localStorage.getItem('gagBlockedTags');
            const parsed = raw ? JSON.parse(raw) : [];
            cachedBlockedTags = Array.isArray(parsed) ? parsed : [];
            return cachedBlockedTags;
        } catch (e) {
            return [];
        }
    }

    function filterBlockedPosts(node, blockedTags) {
        if (!node || typeof node !== 'object') return node;

        if (Array.isArray(node)) {
            const isPostArray = node.length > 0 && node.some(
                item => item && typeof item === 'object' && Array.isArray(item.tags)
            );

            if (isPostArray) {
                const initialLength = node.length;
                const filtered = node.filter((post) => {
                    if (!post || !Array.isArray(post.tags)) return true;
                    const hasBlocked = post.tags.some((tag) => {
                        const key = tag && typeof tag.key === 'string' ? tag.key.toLowerCase() : '';
                        return blockedTags.includes(key);
                    });
                    if (hasBlocked) {
                        console.log('[9GAG Blocker] ✓ Removed post with tags:', post.tags.map(t => t.key).join(', '));
                    }
                    return !hasBlocked;
                });
                
                if (filtered.length !== initialLength) {
                    console.log('[9GAG Blocker] Result:', initialLength, '→', filtered.length, 'posts');
                    return filtered;
                }
                return node;
            }

            let arrayChanged = false;
            const newArray = node.map(item => {
                const res = filterBlockedPosts(item, blockedTags);
                if (res !== item) arrayChanged = true;
                return res;
            });
            return arrayChanged ? newArray : node;
        }

        let objChanged = false;
        const newObj = {};
        for (const key in node) {
            const res = filterBlockedPosts(node[key], blockedTags);
            if (res !== node[key]) objChanged = true;
            newObj[key] = res;
        }
        return objChanged ? newObj : node;
    }

    // JSON parse interception
    const originalParse = JSON.parse;
    JSON.parse = function(text, reviver) {
        let shouldFilter = false;
        
        if (typeof text === 'string' && text.length < 10_000_000) { 
            if (text.includes('"tags"') && text.includes('"key"')) {
                shouldFilter = true;
            }
        }

        let obj = originalParse.call(this, text, reviver);
        
        if (shouldFilter) {
            const blockedTags = getBlockedTags();
            if (blockedTags.length > 0 && obj) {
                obj = filterBlockedPosts(obj, blockedTags);
            }
        }
        return obj;
    };

    // Fetch interception for continuous scrolling
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);
        const contentType = response.headers.get('content-type') || '';
        
        if (!contentType.includes('application/json')) {
            return response;
        }

        const blockedTags = getBlockedTags();
        if (blockedTags.length === 0) {
            return response;
        }

        try {
            const data = await response.clone().json();
            const filtered = filterBlockedPosts(data, blockedTags);
            
            if (filtered !== data) {
                return new Response(JSON.stringify(filtered), {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers
                });
            }
            return response;
        } catch (e) {
            return response;
        }
    };

    // Fallback: Intercept Vue/Nuxt state directly
    const stateVars = ['__NUXT__', '__INITIAL_STATE__'];
    stateVars.forEach(varName => {
        let internalValue = window[varName];
        try {
            Object.defineProperty(window, varName, {
                get: () => internalValue,
                set: (newVal) => {
                    const blockedTags = getBlockedTags();
                    if (blockedTags.length > 0 && newVal) {
                        internalValue = filterBlockedPosts(newVal, blockedTags);
                    } else {
                        internalValue = newVal;
                    }
                },
                configurable: true
            });
        } catch (e) {}
    });

    // Listen for updates from content.js
    window.addEventListener('blockedTagsUpdated', () => {
        console.log('[9GAG Blocker] Blocked tags updated, reloading cache');
        getBlockedTags();
    });

    // Initial load
    getBlockedTags();
})();
