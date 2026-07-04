let blockedTags = [];

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
            filterArticles();
        }
    });
} catch(e) {
    console.error('[9GAG Blocker] Error setting up listener:', e);
}

// Aggressive CSS to force removal of hidden articles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    article[data-blocked="true"] {
        display: none !important;
        visibility: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 0 !important;
        height: 0 !important;
        min-height: 0 !important;
        max-height: 0 !important;
        min-width: 0 !important;
        max-width: 0 !important;
        flex: 0 !important;
        order: 9999 !important;
        position: absolute !important;
        left: -9999px !important;
        top: -9999px !important;
    }
`;
document.head.appendChild(styleSheet);

const getPureTagText = (tagText) => {
    return tagText.trim().toLowerCase();
};

const addBlockButton = (tagElement) => {
    if (tagElement.querySelector('button')) return;
    
    const btn = document.createElement('button');
    btn.textContent = 'Block';
    btn.style.marginLeft = '5px';

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const tagText = getPureTagText(tagElement.innerText);
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
                return getPureTagText(tag.innerText);
            });

        if (tags.some(tag => blockedTags.includes(tag))) {
            article.setAttribute('data-blocked', 'true');
            // Clear inline styles that might be set
            article.style.cssText = '';
        } else {
            article.removeAttribute('data-blocked');
            article.style.cssText = '';
        }
    });

    // Find container and trigger reflow
    let container = document.querySelector('.list-items') || 
                   document.querySelector('[class*="feed"]') ||
                   document.querySelector('main') ||
                   document.querySelector('[role="main"]');

    if (container) {
        // Force reflow by toggling a property
        container.style.WebkitTransform = 'translate(0, 0)';
        void container.offsetHeight;
        setTimeout(() => {
            container.style.WebkitTransform = '';
        }, 0);
    }
};

const initMutationObserver = () => {
    if (!document.body) {
        setTimeout(initMutationObserver, 100);
        return;
    }

    filterArticles();

    const observer = new MutationObserver(() => {
        filterArticles();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    });

    console.log('[9GAG Blocker] content.js loaded');
};

initMutationObserver();
