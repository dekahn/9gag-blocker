const BUTTON_TEXT = 'Block';
const STORAGE_KEY = 'blockedTags';

// Fetch the list of blocked tags from localStorage
let blockedTags = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

/**
 * Creates and inserts a "Blocked Tags" section into the 9GAG page.
 */
function createBlockedTagsSection() {
    if (document.getElementById('blockedTagsList')) {
        return; 
    }

    const section = document.createElement('section');
    const header = document.createElement('header');
    const divTitle = document.createElement('div');
    divTitle.className = "h3";
    divTitle.innerText = "Blocked Tags";
    header.appendChild(divTitle);
    section.appendChild(header);

    const ul = document.createElement('ul');
    ul.id = 'blockedTagsList'; 
    section.appendChild(ul);

    const recentsSection = Array.from(document.querySelectorAll('.h3')).find(el => el.innerText.trim() === "Recents");

    if (recentsSection && recentsSection.parentNode && recentsSection.parentNode.parentNode) {
        recentsSection.parentNode.parentNode.insertBefore(section, recentsSection.parentNode);
    }
}

/**
 * Updates the "Blocked Tags" section with the current blocked tags.
 */
function updateBlockedTagsSection() {
    const ulElement = document.getElementById('blockedTagsList'); 
    if (!ulElement) return;
    
    ulElement.innerHTML = ''; 

    blockedTags.forEach(tag => {
        const li = document.createElement('li');
        li.innerText = tag + " ";

        const btn = document.createElement('button');
        btn.innerText = 'Unblock';
        btn.addEventListener('click', function () {
            const index = blockedTags.indexOf(tag);
            if (index > -1) {
                blockedTags.splice(index, 1);
                saveTagsToLocalStorage();
                filterArticles();
                updateBlockedTagsSection();
            }
        });

        li.appendChild(btn);
        ulElement.appendChild(li);
    });
}

/**
 * Persists the blocked tags to localStorage.
 */
function saveTagsToLocalStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blockedTags));
}

/**
 * Extracts the pure text of a tag.
 */
function getPureTagText(tagText) {
    const regex = new RegExp(BUTTON_TEXT + '$');
    return tagText.replace(regex, '').trim().toLowerCase();
}

/**
 * Adds a "Block" button next to each tag.
 */
function addBlockButton(tagElement) {
    if (tagElement.querySelector('button')) return;
    
    const btn = document.createElement('button');
    btn.innerText = BUTTON_TEXT;
    btn.style.marginLeft = '5px';
    btn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        const tagText = getPureTagText(tagElement.innerText);

        if (!blockedTags.includes(tagText)) {
            blockedTags.push(tagText);
            console.log(`Tag "${tagText}" blocked.`);
            saveTagsToLocalStorage();
            filterArticles();
            updateBlockedTagsSection();
        }
    });

    tagElement.appendChild(btn);
}

/**
 * Filters articles based on blocked tags.
 */
function filterArticles() {
    console.log("Filtering articles. Blocked tags:", blockedTags);

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
            if (article.style.display !== 'none') {
                console.log(`Blocking article with tags: ${tags.join(', ')}`);
                article.style.display = 'none';
            }
        } else {
            if (article.style.display === 'none') {
                console.log(`Showing article with tags: ${tags.join(', ')}`);
                article.style.display = 'block';
            }
        }
    });
}

// Initial setup
createBlockedTagsSection(); 
updateBlockedTagsSection();
filterArticles();

// Watch for DOM changes
const observer = new MutationObserver(() => {
    filterArticles();
});

observer.observe(document.body, { attributes: true, childList: true, subtree: true });

console.log('[9GAG Blocker] Loaded');
