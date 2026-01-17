const defaultSocialMedia = [
    "facebook.com", "instagram.com", "x.com", "twitter.com", "tiktok.com", "reddit.com", "youtube.com"
];

const defaultSearchEngines = [
    "https://www.google.com/", "https://www.duckduckgo.com/", "https://www.bing.com/", "https://www.ecosia.org/"
];

// Initialize storage on install
chrome.runtime.onInstalled.addListener(async () => {
    const data = await chrome.storage.local.get(['social_media', 'search_engines', 'stats']);
    if (!data.social_media) {
        await chrome.storage.local.set({ social_media: defaultSocialMedia });
    }
    if (!data.search_engines) {
        await chrome.storage.local.set({ search_engines: defaultSearchEngines });
    }
    if (!data.stats) {
        await chrome.storage.local.set({ stats: { redirectCount: 0 } });
    }
    updateRedirectRules();
});

async function updateRedirectRules() {
    try {
        const result = await chrome.storage.local.get(['isEnabled', 'social_media', 'search_engines']);
        const isEnabled = result.isEnabled !== false;

        if (!isEnabled) {
            console.log("Extension is disabled. Removing all rules.");
            const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: oldRules.map(rule => rule.id),
                addRules: []
            });
            return;
        }

        const socialSites = result.social_media || defaultSocialMedia;
        const engineList = result.search_engines || defaultSearchEngines;

        if (socialSites.length === 0 || engineList.length === 0) {
            console.warn("No sites to block or engines to redirect to.");
            return;
        }

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

// Track redirects
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    if (info.request.documentLifecycle === "active") {
        chrome.storage.local.get(['stats'], (result) => {
            const stats = result.stats || { redirectCount: 0 };
            stats.redirectCount++;
            chrome.storage.local.set({ stats });
        });
    }
});

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

// Schedule Check
chrome.alarms.create("checkSchedule", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "randomize") {
        updateRedirectRules();
    }
    else if (alarm.name === "checkSchedule") {
        const data = await chrome.storage.local.get(['schedule', 'isEnabled']);
        if (!data.schedule || !data.schedule.enabled) return;

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const [startH, startM] = data.schedule.startTime.split(':').map(Number);
        const [endH, endM] = data.schedule.endTime.split(':').map(Number);

        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;

        let isActiveTime = false;
        if (endTotal > startTotal) {
            isActiveTime = currentTime >= startTotal && currentTime < endTotal;
        } else {
            // Crosses midnight (e.g. 23:00 to 07:00)
            isActiveTime = currentTime >= startTotal || currentTime < endTotal;
        }

        const shouldBeEnabled = isActiveTime;

        if (data.isEnabled !== shouldBeEnabled) {
            console.log(`Schedule Update: Setting enabled to ${shouldBeEnabled}`);
            await chrome.storage.local.set({ isEnabled: shouldBeEnabled });
            updateRedirectRules();
            chrome.runtime.sendMessage({ action: "stateChanged", enabled: shouldBeEnabled }).catch(() => { });
        }
    }
});