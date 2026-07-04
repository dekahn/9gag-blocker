let blockedTags = [];
const hiddenPosts = new Map(); // Map of article element to their parent

const syncToLocalStorage = () => {
    try {
        localStorage.setItem('gagBlockedTags', JSON.stringify(blockedTags));
        console.log('[9GAG Blocker] Synced to localStorage:', blockedTags);
    } catch (e) {
        console.error('[9GAG Blocker] Error syncing:', e);
    }
};

const getStorageData = () => {
    try {
        chrome.storage.local.get({blocked: []}, (data) => {
            if (chrome.runtime.lastError) return;
            blockedTags = data.blocked;
            console.log('[9GAG Blocker] Loaded from chrome.storage:', blockedTags);
            syncToLocalStorage();
            tagVisibleLinks();
            updatePostVisibility();
        });
    } catch (e) {
        console.error('[9GAG Blocker] Error getting storage:', e);
    }
};

getStorageData();

try {
    chrome.storage.onChanged.addListener((changes, namespace) => {
        console.log('[9GAG Blocker] Storage changed:', changes, namespace);
        if (namespace === 'local' && changes.blocked) {
            blockedTags = changes.blocked.newValue;
            console.log('[9GAG Blocker] Updated blockedTags:', blockedTags);
            syncToLocalStorage();
            tagVisibleLinks();
            updatePostVisibility();
        }
    });
} catch(e) {
    console.error('[9GAG Blocker] Error setting up listener:', e);
}

const updatePostVisibility = () => {
    console.log('[9GAG Blocker] updatePostVisibility called with tags:', blockedTags);
    
    const articles = document.querySelectorAll('article');
    console.log('[9GAG Blocker] Found', articles.length, 'articles');
    
    articles.forEach(article => {
        const tagsContainer = article.querySelector('.post-tags');
        
        if (tagsContainer) {
            const tagLinks = tagsContainer.querySelectorAll('a[href*="/tag/"]');
            
            let hasBlockedTag = false;
            let blockedTagNames = [];
            
            tagLinks.forEach(tagLink => {
                const href = tagLink.getAttribute('href');
                const tagMatch = href.match(/\/tag\/([^?]+)/);
                if (tagMatch) {
                    const tagText = tagMatch[1].toLowerCase();
                    if (blockedTags.includes(tagText)) {
                        hasBlockedTag = true;
                        blockedTagNames.push(tagText);
                    }
                }
            });
            
            if (hasBlockedTag) {
                console.log('[9GAG Blocker] Removing article with blocked tags:', blockedTagNames);
                if (!hiddenPosts.has(article)) {
                    hiddenPosts.set(article, {
                        parent: article.parentNode,
                        nextSibling: article.nextSibling
                    });
                    article.remove();
                }
            } else {
                if (hiddenPosts.has(article)) {
                    console.log('[9GAG Blocker] Restoring previously blocked article');
                    const {parent, nextSibling} = hiddenPosts.get(article);
                    if (parent) {
                        parent.insertBefore(article, nextSibling);
                    }
                    hiddenPosts.delete(article);
                }
            }
        }
    });
};

const blockTag = (tagName) => {
    console.log('[9GAG Blocker] blockTag called with:', tagName);
    if (!blockedTags.includes(tagName)) {
        blockedTags.push(tagName);
        console.log('[9GAG Blocker] Added tag to blockedTags:', blockedTags);
        try {
            chrome.storage.local.set({blocked: blockedTags}, () => {
                console.log('[9GAG Blocker] Set chrome.storage');
                syncToLocalStorage();
                updatePostVisibility();
            });
        } catch (e) {
            console.error('[9GAG Blocker] Error setting storage:', e);
        }
    } else {
        console.log('[9GAG Blocker] Tag already blocked:', tagName);
    }
};

const tagVisibleLinks = () => {
    console.log('[9GAG Blocker] tagVisibleLinks called');
    document.querySelectorAll('.post-tags a[href*="/tag/"]').forEach(tag => {
        if (tag.dataset.hasBlockBtn) return;
        tag.dataset.hasBlockBtn = "true";

        const href = tag.getAttribute('href');
        const tagMatch = href.match(/\/tag\/([^?]+)/);
        const tagName = tagMatch ? tagMatch[1] : 'unknown';
        console.log('[9GAG Blocker] Adding Block button to tag:', tagName);

        const blockBtn = document.createElement('span');
        blockBtn.textContent = 'Block';
        blockBtn.style.cssText = `
            margin-left: 8px;
            padding: 2px 8px;
            background: #262626;
            border: 1px solid #3c3c3c;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: bold;
            color: #aaa;
            transition: all 0.2s;
            display: inline-block;
            user-select: none;
        `;

        blockBtn.addEventListener('mouseover', () => {
            blockBtn.style.background = '#333';
            blockBtn.style.color = '#fff';
            blockBtn.style.borderColor = '#555';
        });

        blockBtn.addEventListener('mouseout', () => {
            blockBtn.style.background = '#262626';
            blockBtn.style.color = '#aaa';
            blockBtn.style.borderColor = '#3c3c3c';
        });

        blockBtn.addEventListener('click', (e) => {
            console.log('[9GAG Blocker] Block button clicked!');
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            const href = tag.getAttribute('href');
            const match = href.match(/\/tag\/([^?]+)/);
            const text = match ? match[1].toLowerCase() : '';
            console.log('[9GAG Blocker] Extracted tag text:', text);
            if (text) blockTag(text);
        }, true);

        tag.appendChild(blockBtn);
    });
};

// MutationObserver to watch for new DOM elements and add block buttons
const observer = new MutationObserver(() => {
    tagVisibleLinks();
    clearTimeout(observer.visibilityTimeout);
    observer.visibilityTimeout = setTimeout(() => {
        updatePostVisibility();
    }, 100);
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
});

console.log('[9GAG Blocker] content.js loaded');

// Initial scan
setInterval(tagVisibleLinks, 500);
