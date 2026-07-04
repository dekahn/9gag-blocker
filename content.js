let blockedTags = [];
const removedArticles = new Map(); // Store removed articles by ID so we can restore them

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

const getPureTagText = (tagText) => {
    return tagText.trim().toLowerCase();
};

const addBlockButton = (tagElement) => {
    if (tagElement.querySelector('button')) return;
    
    const btn = document.createElement('button');
    btn.textContent = 'Block';
    btn.style.marginLeft = '5px';
    btn.style.cursor = 'pointer';

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
        const articleId = article.id || Math.random().toString(36);
        article.id = articleId;

        const tags = Array.from(article.querySelectorAll('.post-tags a'))
            .map(tag => {
                if (!tag.querySelector('button')) {
                    addBlockButton(tag);
                }
                return getPureTagText(tag.innerText);
            });

        const shouldBlock = tags.some(tag => blockedTags.includes(tag));

        if (shouldBlock) {
            // Remove from DOM if not already removed
            if (article.parentNode) {
                removedArticles.set(articleId, {
                    article: article,
                    parent: article.parentNode,
                    nextSibling: article.nextSibling,
                    tags: tags
                });
                article.parentNode.removeChild(article);
                console.log('[9GAG Blocker] Removed article:', tags.join(', '));
            }
        } else {
            // Re-add to DOM if it was removed
            if (removedArticles.has(articleId)) {
                const stored = removedArticles.get(articleId);
                if (stored.nextSibling) {
                    stored.parent.insertBefore(article, stored.nextSibling);
                } else {
                    stored.parent.appendChild(article);
                }
                removedArticles.delete(articleId);
                console.log('[9GAG Blocker] Restored article:', tags.join(', '));
            }
        }
    });
};

const initMutationObserver = () => {
    if (!document.body) {
        setTimeout(initMutationObserver, 100);
        return;
    }

    // Initial filter
    filterArticles();

    // Watch for new articles being added
    const observer = new MutationObserver(() => {
        filterArticles();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    });

    console.log('[9GAG Blocker] content.js loaded - removing blocked posts from DOM');
};

initMutationObserver();
