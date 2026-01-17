document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refreshBtn');
    const statusText = document.getElementById('statusText');
    const powerToggle = document.getElementById('powerToggle');
    const badge = document.getElementById('badge');
    const redirectCount = document.getElementById('redirectCount');
    const optionsBtn = document.getElementById('optionsBtn');

    // Schedule Elements
    const scheduleToggle = document.getElementById('scheduleToggle');
    const scheduleInputs = document.getElementById('scheduleInputs');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');

    // Initialize UI
    chrome.storage.local.get(['isEnabled', 'stats', 'schedule'], (result) => {
        const isEnabled = result.isEnabled !== false;
        powerToggle.checked = isEnabled;
        updateStatusUI(isEnabled);

        // Stats
        if (result.stats) {
            redirectCount.textContent = result.stats.redirectCount || 0;
        }

        // Schedule
        if (result.schedule) {
            scheduleToggle.checked = result.schedule.enabled;
            startTimeInput.value = result.schedule.startTime;
            endTimeInput.value = result.schedule.endTime;
            updateScheduleUI(result.schedule.enabled);
        }
    });

    // Options Button
    optionsBtn.addEventListener('click', () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    });

    // Handle Power Toggle
    powerToggle.addEventListener('change', () => {
        const isEnabled = powerToggle.checked;
        refreshBtn.disabled = true;
        statusText.textContent = 'Switching...';

        chrome.runtime.sendMessage({ action: "toggle", enabled: isEnabled }, (response) => {
            refreshBtn.disabled = !isEnabled;
            updateStatusUI(isEnabled);
        });
    });

    // Handle Schedule Toggle
    scheduleToggle.addEventListener('change', () => {
        const enabled = scheduleToggle.checked;
        updateScheduleUI(enabled);
        saveSchedule();
    });

    [startTimeInput, endTimeInput].forEach(input => {
        input.addEventListener('change', saveSchedule);
    });

    function saveSchedule() {
        chrome.storage.local.set({
            schedule: {
                enabled: scheduleToggle.checked,
                startTime: startTimeInput.value,
                endTime: endTimeInput.value
            }
        });
        // Trigger check immediately
        chrome.alarms.create("checkSchedule", { when: Date.now() });
    }

    function updateScheduleUI(enabled) {
        scheduleInputs.style.opacity = enabled ? '1' : '0.5';
        scheduleInputs.style.pointerEvents = enabled ? 'auto' : 'none';
    }

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

        // Update visual background
        if (window.updateVisualState) {
            window.updateVisualState(isEnabled);
        }
    }

    // Listen for auto-state changes from background (Idle/Schedule)
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "stateChanged") {
            powerToggle.checked = message.enabled;
            updateStatusUI(message.enabled);
        }
    });
});
