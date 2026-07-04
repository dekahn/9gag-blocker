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
        }
    });
} catch(e) {
    console.error('[9GAG Blocker] Error setting up listener:', e);
}

// Inject the injector script into the page context BEFORE any other scripts run
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injector.js');
script.onload = function() {
    console.log('[9GAG Blocker] Injector loaded into page context');
    this.remove();
};
script.onerror = function() {
    console.error('[9GAG Blocker] Failed to load injector');
    this.remove();
};
(document.head || document.documentElement).prepend(script);

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

    console.log('[9GAG Blocker] content.js loaded - injector.js should now be filtering posts');
};

initBlockButtons();
