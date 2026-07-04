// Load and display blocked tags
const loadBlockedTags = () => {
    chrome.storage.local.get({blocked: []}, (data) => {
        const listContainer = document.getElementById('blocked-list');
        const statsContainer = document.getElementById('stats');
        const blockedTags = data.blocked || [];

        listContainer.innerHTML = '';

        if (blockedTags.length === 0) {
            listContainer.innerHTML = '<div class="empty-state">No blocked tags yet.<br>Click ✕ on tags to block them or add one above.</div>';
            statsContainer.textContent = '0 tags blocked';
            return;
        }

        blockedTags.forEach(tag => {
            const item = document.createElement('div');
            item.className = 'tag-item';

            const name = document.createElement('span');
            name.className = 'tag-name';
            name.textContent = tag;
            name.title = tag;

            const removeBtn = document.createElement('span');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = '✕';
            removeBtn.onclick = () => removeTag(tag);

            item.appendChild(name);
            item.appendChild(removeBtn);
            listContainer.appendChild(item);
        });

        statsContainer.textContent = `${blockedTags.length} tag${blockedTags.length !== 1 ? 's' : ''} blocked`;
    });
};

// Add a new tag
const addTag = () => {
    const input = document.getElementById('tag-input');
    const tagName = input.value.trim().toLowerCase();

    if (!tagName) return;

    chrome.storage.local.get({blocked: []}, (data) => {
        const blockedTags = data.blocked || [];

        if (!blockedTags.includes(tagName)) {
            blockedTags.push(tagName);
            chrome.storage.local.set({blocked: blockedTags}, () => {
                input.value = '';
                loadBlockedTags();
            });
        } else {
            input.value = '';
        }
    });
};

// Remove a tag
const removeTag = (tag) => {
    chrome.storage.local.get({blocked: []}, (data) => {
        const blockedTags = data.blocked || [];
        const index = blockedTags.indexOf(tag);
        if (index > -1) {
            blockedTags.splice(index, 1);
            chrome.storage.local.set({blocked: blockedTags}, () => {
                loadBlockedTags();
            });
        }
    });
};

// Export blocked tags as JSON
const exportTags = () => {
    chrome.storage.local.get({blocked: []}, (data) => {
        const blockedTags = data.blocked || [];
        const dataStr = JSON.stringify(blockedTags, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `9gag-blocker-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    });
};

// Import blocked tags from JSON
const importTags = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedTags = JSON.parse(event.target.result);
                
                if (!Array.isArray(importedTags)) {
                    alert('Invalid file format. Must be a JSON array of tags.');
                    return;
                }

                chrome.storage.local.get({blocked: []}, (data) => {
                    const currentTags = data.blocked || [];
                    // Merge without duplicates
                    const merged = [...new Set([...currentTags, ...importedTags])];
                    chrome.storage.local.set({blocked: merged}, () => {
                        alert(`Imported ${importedTags.length} tag(s)!`);
                        loadBlockedTags();
                    });
                });
            } catch (err) {
                alert('Error reading file: ' + err.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
};

// Event listeners - make sure these are AFTER all functions are defined
document.getElementById('add-btn').addEventListener('click', addTag);
document.getElementById('tag-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTag();
    }
});

document.getElementById('export-btn').addEventListener('click', exportTags);
document.getElementById('import-btn').addEventListener('click', importTags);

// Help link
const helpLink = document.getElementById('help-link');
if (helpLink) {
    helpLink.addEventListener('click', () => {
        chrome.tabs.create({url: chrome.runtime.getURL('help.html')});
    });
}

// Listen for storage changes and update
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.blocked) {
        loadBlockedTags();
    }
});

// Initial load
loadBlockedTags();