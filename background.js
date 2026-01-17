const GITHUB_RAW_URL = "https://raw.githubusercontent.com/Umair-Mohammeth/Redirect-extension-/main/data.json";

async function updateRedirectRules() {
    try {
        // Check if the extension is enabled
        const result = await chrome.storage.local.get(['isEnabled']);
        const isEnabled = result.isEnabled !== false; // Default to true

        if (!isEnabled) {
            console.log("Extension is disabled. Removing all rules.");
            const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: oldRules.map(rule => rule.id),
                addRules: []
            });
            return;
        }

        const response = await fetch(GITHUB_RAW_URL);
        const data = await response.json();

        if (!data.social_media || !data.search_engines || data.search_engines.length === 0) {
            throw new Error("Invalid data format or empty search engines list");
        }

        const socialSites = data.social_media;
        const engineList = data.search_engines;

        // Randomly select a search engine
        const randomEngine = engineList[Math.floor(Math.random() * engineList.length)];

        console.log("Selected Random Engine: " + randomEngine);

        const newRules = socialSites.map((site, index) => {
            return {
                "id": index + 1,
                "priority": 1,
                "action": {
                    "type": "redirect",
                    "redirect": { "url": randomEngine }
                },
                "condition": {
                    "urlFilter": `||${site}^`,
                    "resourceTypes": ["main_frame"]
                }
            };
        });

        const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
        const oldRuleIds = oldRules.map(rule => rule.id);

        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: oldRuleIds,
            addRules: newRules
        });

    } catch (error) {
        console.error("Critical Error in updateRedirectRules:", error);
    }
}

// Update rules immediately on state change or startup
chrome.runtime.onInstalled.addListener(updateRedirectRules);
chrome.runtime.onStartup.addListener(updateRedirectRules);

// --- IDLE PROTOCOL (Anti-Snoop) ---
// If Active: Inactive (Rules Removed)
// If Idle: Active (Rules Applied)
chrome.idle.setDetectionInterval(60); // 1 minute threshold
chrome.idle.onStateChanged.addListener((state) => {
    const isIdle = (state === "idle" || state === "locked");
    console.log("System state:", state, "| Setting extension to:", isIdle ? "ACTIVE" : "INACTIVE");

    // Auto-toggle based on presence
    chrome.storage.local.set({ isEnabled: isIdle }).then(() => {
        updateRedirectRules();
        // Notify popup to update UI
        chrome.runtime.sendMessage({ action: "stateChanged", enabled: isIdle }).catch(() => { });
    });
});

// Popup message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggle") {
        chrome.storage.local.set({ isEnabled: request.enabled }).then(() => {
            updateRedirectRules().then(() => {
                sendResponse({ status: "success", isEnabled: request.enabled });
            });
        });
        return true;
    }

    if (request.action === "refresh") {
        updateRedirectRules().then(() => {
            sendResponse({ status: "success" });
        }).catch((error) => {
            sendResponse({ status: "error", error: error.message });
        });
        return true;
    }
});

chrome.alarms.create("randomize", { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener(updateRedirectRules);