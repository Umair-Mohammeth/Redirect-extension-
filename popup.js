document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refreshBtn');
    const statusText = document.getElementById('statusText');
    const powerToggle = document.getElementById('powerToggle');
    const badge = document.getElementById('badge');

    // Initialize UI from storage
    chrome.storage.local.get(['isEnabled'], (result) => {
        const isEnabled = result.isEnabled !== false;
        powerToggle.checked = isEnabled;
        updateStatusUI(isEnabled);
    });

    // Handle Power Toggle
    powerToggle.addEventListener('change', () => {
        const isEnabled = powerToggle.checked;

        // Disable refresh button during toggle
        refreshBtn.disabled = true;
        statusText.textContent = 'Switching...';

        chrome.runtime.sendMessage({ action: "toggle", enabled: isEnabled }, (response) => {
            refreshBtn.disabled = !isEnabled;
            updateStatusUI(isEnabled);
        });
    });

    // Handle Refresh
    refreshBtn.addEventListener('click', () => {
        if (!powerToggle.checked) return;

        refreshBtn.disabled = true;
        refreshBtn.classList.add('loading');
        statusText.textContent = 'Syncing...';

        chrome.runtime.sendMessage({ action: "refresh" }, (response) => {
            refreshBtn.disabled = false;
            refreshBtn.classList.remove('loading');

            if (chrome.runtime.lastError) {
                statusText.textContent = 'Node Error';
                return;
            }

            if (response && response.status === "success") {
                statusText.textContent = 'Node Synced';
                setTimeout(() => {
                    if (powerToggle.checked) updateStatusUI(true);
                }, 2000);
            } else {
                statusText.textContent = 'Sync Failed';
            }
        });
    });

    function updateStatusUI(isEnabled) {
        if (isEnabled) {
            badge.classList.add('connected');
            statusText.textContent = 'System Active';
            refreshBtn.disabled = false;
            refreshBtn.style.opacity = '1';
        } else {
            badge.classList.remove('connected');
            statusText.textContent = 'System Standby';
            refreshBtn.disabled = true;
            refreshBtn.style.opacity = '0.5';
        }
    }

    // Listen for auto-state changes from background (Idle detection)
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "stateChanged") {
            powerToggle.checked = message.enabled;
            updateStatusUI(message.enabled);
        }
    });
});
