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

// Force removed elements to take zero space
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    article[style*="display: none"] {
        display: none !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 0 !important;
        height: 0 !important;
        min-height: 0 !important;
        max-height: 0 !important;
        flex: 0 !important;
    }
    
    .list-items, .post-container, [class*="feed"], [class*="grid"] {
        display: grid !important;
        grid-auto-flow: row !important;
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
    
    // Find the container - try common selectors
    let container = document.querySelector('.list-items') || 
                   document.querySelector('.post-container') ||
                   document.querySelector('main') ||
                   document.querySelector('[role="main"]') ||
                   articles[0]?.parentElement;

    articles.forEach(article => {
        const tags = Array.from(article.querySelectorAll('.post-tags a'))
            .map(tag => {
                if (!tag.querySelector('button')) {
                    addBlockButton(tag);
                }
                return getPureTagText(tag.innerText);
            });

        if (tags.some(tag => blockedTags.includes(tag))) {
            if (article.style.display !== 'none') {
                article.style.display = 'none';
            }
        } else {
            if (article.style.display === 'none') {
                article.style.display = 'block';
            }
        }
    });

    // Force browser reflow to recalculate layout
    if (container) {
        const originalDisplay = container.style.display;
        container.style.display = 'block';
        // Trigger reflow
        void container.offsetHeight;
        // Reset
        setTimeout(() => { 
            container.style.display = originalDisplay || ''; 
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
