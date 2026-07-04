let blockedTags = [];
const hiddenPosts = new Map();

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
    if (tagElement.querySelector('button[data-block-btn]')) return;
    
    const btn = document.createElement('button');
    btn.textContent = 'Block';
    btn.setAttribute('data-block-btn', 'true');
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
                if (!tag.querySelector('button[data-block-btn]')) {
                    addBlockButton(tag);
                }
                return getPureTagText(tag.innerText);
            });

        const hasBlocked = tags.some(tag => blockedTags.includes(tag));

        if (hasBlocked && !hiddenPosts.has(article)) {
            // Article should be hidden
            console.log(`[9GAG Blocker] Removing: ${tags.join(', ')}`);
            hiddenPosts.set(article, {
                parent: article.parentNode,
                nextSibling: article.nextSibling
            });
            article.remove();
        } else if (!hasBlocked && hiddenPosts.has(article)) {
            // Article should be shown (was previously hidden)
            console.log(`[9GAG Blocker] Restoring: ${tags.join(', ')}`);
            const {parent, nextSibling} = hiddenPosts.get(article);
            if (parent) {
                parent.insertBefore(article, nextSibling);
            }
            hiddenPosts.delete(article);
        }
    });
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
