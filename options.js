const defaultSocialMedia = [
    "facebook.com", "instagram.com", "x.com", "twitter.com", "tiktok.com", "reddit.com", "youtube.com"
];

const defaultSearchEngines = [
    "https://www.google.com/", "https://www.duckduckgo.com/", "https://www.bing.com/", "https://www.ecosia.org/"
];

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();

    document.getElementById('addBlockForm').addEventListener('submit', (e) => {
        e.preventDefault();
        addItem('blockList', document.getElementById('newBlockInput').value);
        document.getElementById('newBlockInput').value = '';
    });

    document.getElementById('addEngineForm').addEventListener('submit', (e) => {
        e.preventDefault();
        addItem('engineList', document.getElementById('newEngineInput').value);
        document.getElementById('newEngineInput').value = '';
    });

    document.getElementById('saveBtn').addEventListener('click', saveSettings);
});

async function loadSettings() {
    const data = await chrome.storage.local.get(['social_media', 'search_engines']);
    
    // Initialize with defaults if empty
    const socialList = data.social_media || defaultSocialMedia;
    const engineList = data.search_engines || defaultSearchEngines;

    renderList('blockList', socialList);
    renderList('engineList', engineList);
}

function renderList(elementId, items) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <span>${item}</span>
            <button class="delete-btn" onclick="this.parentElement.remove()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
            </button>
        `;
        container.appendChild(div);
    });
}

function addItem(elementId, value) {
    if (!value) return;
    
    // Simple URL validation/formatting
    if (elementId === 'engineList' && !value.startsWith('http')) {
        value = 'https://' + value;
    }

    const container = document.getElementById(elementId);
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
        <span>${value}</span>
        <button class="delete-btn" onclick="this.parentElement.remove()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
        </button>
    `;
    container.appendChild(div);
}

async function saveSettings() {
    const statusBtn = document.getElementById('saveBtn');
    statusBtn.textContent = 'Saving...';
    
    const social_media = Array.from(document.getElementById('blockList').children).map(div => div.querySelector('span').textContent);
    const search_engines = Array.from(document.getElementById('engineList').children).map(div => div.querySelector('span').textContent);

    await chrome.storage.local.set({
        social_media,
        search_engines
    });

    // Notify background to update rules
    chrome.runtime.sendMessage({ action: "refresh" }, () => {
        statusBtn.textContent = 'Configuration Saved';
        setTimeout(() => {
            statusBtn.textContent = 'Save Configuration';
        }, 2000);
    });
}
