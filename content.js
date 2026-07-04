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

// Add block buttons when page loads
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

    console.log('[9GAG Blocker] content.js loaded');
};

// Listen for API filter events and trigger layout reflow
window.addEventListener('9gag-data-filtered', () => {
    console.log('[9GAG Blocker] Data filtered, triggering reflow');
    // Trigger a native scroll adjustment to force 9GAG to re-calculate layout
    window.scrollBy(0, 1);
    window.scrollBy(0, -1);
});

initBlockButtons();
