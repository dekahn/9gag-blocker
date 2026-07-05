let blockedTags = [];

// Relays the current blocked-tags list to injector.js, which runs in the
// MAIN world (the page's real JS context) and can't use chrome.storage
// directly. CustomEvents on `document` are the shared channel between the
// two worlds.
const broadcastTagsToInjector = () => {
    document.dispatchEvent(new CustomEvent('gag-blocker-tags-update', {
        detail: {blockedTags}
    }));
};

// injector.js asks for the current list immediately on load, in case a
// fetch fires before our async storage read below has resolved.
document.addEventListener('gag-blocker-request-tags', () => {
    broadcastTagsToInjector();
});

const syncToLocalStorage = () => {
    try {
        localStorage.setItem('gagBlockedTags', JSON.stringify(blockedTags));
    } catch (e) {
        console.error('[9GAG Blocker] Error syncing:', e);
    }
};

const getStorageData = () => {
    try {
        chrome.storage.local.get({blocked: []}, (data) => {
            if (chrome.runtime.lastError) return;
            blockedTags = data.blocked;
            syncToLocalStorage();
            broadcastTagsToInjector();
            filterArticles();
        });
    } catch (e) {
        console.error('[9GAG Blocker] Error getting storage:', e);
    }
};

getStorageData();

try {
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.blocked) {
            blockedTags = changes.blocked.newValue;
            syncToLocalStorage();
            broadcastTagsToInjector();
            filterArticles();
        }
    });
} catch (e) {
    console.error('[9GAG Blocker] Error setting up listener:', e);
}

const getPureTagText = (tagText) => {
    return tagText.trim().toLowerCase();
};

// Returns a tag element's real text, always excluding our own injected
// "Block" button's label. Reading tagElement.innerText directly is unsafe
// once the button exists as a child -- it permanently pollutes innerText
// with "...Block" appended, breaking every future match against this tag,
// not just the one at click-time. This recomputes fresh each call (no
// caching) so it stays correct even if a node gets reused/recycled by the
// page's virtualized list for different content later.
const getTagText = (tagElement) => {
    const btn = tagElement.querySelector('button');
    if (!btn) {
        return getPureTagText(tagElement.innerText);
    }
    const clone = tagElement.cloneNode(true);
    const clonedBtn = clone.querySelector('button');
    if (clonedBtn) clonedBtn.remove();
    return getPureTagText(clone.textContent);
};

const addBlockButton = (tagElement) => {
    if (tagElement.querySelector('button')) return;

    // Capture the tag's real text BEFORE appending our button.
    const tagText = getTagText(tagElement);

    const btn = document.createElement('button');
    btn.textContent = 'Block';
    btn.style.marginLeft = '5px';

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (!blockedTags.includes(tagText)) {
            blockedTags.push(tagText);
            chrome.storage.local.set({blocked: blockedTags}, () => {
                syncToLocalStorage();
                filterArticles();
            });
        }
    }, true);

    tagElement.appendChild(btn);
};

const filterArticles = () => {
    const articles = document.querySelectorAll('article');

    articles.forEach(article => {
        const tags = Array.from(article.querySelectorAll('.post-tags a'))
            .map(tag => {
                if (!tag.querySelector('button')) {
                    addBlockButton(tag);
                }
                return getTagText(tag);
            });

        const isBlocked = tags.some(tag => blockedTags.includes(tag));
        const wasHidden = article.style.display === 'none';

        if (isBlocked) {
            if (!wasHidden) {
                article.style.display = 'none';
            }
        } else {
            if (wasHidden) {
                article.style.display = '';
            }
        }
    });
};

let pending = false;
const scheduleFilter = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
        pending = false;
        filterArticles();
    });
};

const initMutationObserver = () => {
    if (!document.body) {
        setTimeout(initMutationObserver, 100);
        return;
    }

    filterArticles();

    // Prefer scoping to the actual feed container to cut down on noise from
    // unrelated page chrome (ads, comment widgets, etc.) ticking the observer.
    const feedContainer = document.querySelector('.list-items') ||
                           document.querySelector('[class*="feed"]') ||
                           document.querySelector('main') ||
                           document.querySelector('[role="main"]') ||
                           document.body;

    console.log('[9GAG Blocker] observing:', feedContainer.className || feedContainer.tagName);

    const observer = new MutationObserver(() => {
        scheduleFilter();
    });

    observer.observe(feedContainer, {
        childList: true,
        subtree: true
    });

    console.log('[9GAG Blocker] content.js loaded');
};

initMutationObserver();
