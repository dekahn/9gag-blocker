let blockedTags = [];

const syncToLocalStorage = () => {
    try {
        localStorage.setItem('gagBlockedTags', JSON.stringify(blockedTags));
        console.log('[9GAG Blocker] Synced to localStorage:', blockedTags);
    } catch (e) {
        console.error('[9GAG Blocker] Error syncing to localStorage:', e);
    }
};

const getStorageData = () => {
    try {
        chrome.storage.local.get({blocked: []}, (data) => {
            if (chrome.runtime.lastError) return;
            blockedTags = data.blocked;
            syncToLocalStorage();
            console.log('[9GAG Blocker] Loaded from chrome.storage:', blockedTags);
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
            console.log('[9GAG Blocker] Updated from chrome.storage.onChanged:', blockedTags);
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

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const tagText = getPureTagText(tagElement.innerText);
        console.log('[9GAG Blocker] Block button clicked for tag:', tagText);
        
        if (!blockedTags.includes(tagText)) {
            blockedTags.push(tagText);
            console.log('[9GAG Blocker] Added to blockedTags:', blockedTags);
            
            chrome.storage.local.set({blocked: blockedTags}, () => {
                console.log('[9GAG Blocker] Saved to chrome.storage');
                syncToLocalStorage();
                console.log('[9GAG Blocker] Synced to localStorage');
            });
        }
    }, true);

    tagElement.appendChild(btn);
};

const addBlockButtonsToTags = () => {
    const tags = document.querySelectorAll('.post-tags a');
    tags.forEach(tag => {
        if (!tag.querySelector('button')) {
            addBlockButton(tag);
        }
    });
};

const initBlockButtons = () => {
    if (!document.body) {
        setTimeout(initBlockButtons, 100);
        return;
    }

    addBlockButtonsToTags();

    const observer = new MutationObserver(() => {
        addBlockButtonsToTags();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    });

    console.log('[9GAG Blocker] content.js loaded - blocking via injector.js');
};

initBlockButtons();
