importScripts('config.js');
let rules = {};

const SEARCH_URLS = {
    google: 'https://www.google.com/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q='
};

// Function to fetch rules from server
async function fetchRulesFromServer() {
    try {
        const storage = await chrome.storage.local.get(['remoteUrl']);
        const url = storage.remoteUrl || SHORTLINKS_URL;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        // Update cache
        await chrome.storage.local.set({ 
            rules: data,
            lastUpdate: Date.now()
        });
        
        return data;
    } catch (error) {
        console.error('Error fetching rules:', error);
        return null;
    }
}

// Function to get rules (from cache or server)
async function getRules() {
    try {
        // Try to fetch from server first
        const serverRules = await fetchRulesFromServer();
        if (serverRules) {
            rules = serverRules;
            return;
        }
    } catch (error) {
        console.log('Could not fetch from server, falling back to cache');
    }

    // If server fetch failed, try to load from cache
    const cache = await chrome.storage.local.get(['rules']);
    if (cache.rules) {
        rules = cache.rules;
    } else {
        // If no cache exists, load default rules
        const response = await fetch(chrome.runtime.getURL('rules.json'));
        rules = await response.json();
        // Save default rules to cache
        await chrome.storage.local.set({ 
            rules: rules,
            lastUpdate: Date.now()
        });
    }
}

// Initialize rules
getRules();

// Periodically check for updates (every hour)
setInterval(getRules, 60 * 60 * 1000);

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading' && tab.url) {
        try {
            const url = new URL(tab.url);
            // Get current search engine setting
            const data = await chrome.storage.local.get(['searchEngine']);
            const searchEngine = data.searchEngine || 'google';
            
            // Check if this is a search query
            const isGoogleSearch = url.hostname === 'www.google.com' && url.searchParams.has('q');
            const isDuckDuckGoSearch = url.hostname === 'duckduckgo.com' && url.searchParams.has('q');
            
            if (isGoogleSearch || isDuckDuckGoSearch) {
                const searchTerm = url.searchParams.get('q').trim();
                
                // First check custom shortlinks
                const data = await chrome.storage.local.get(['customShortlinks']);
                const customShortlinks = data.customShortlinks || {};
                if (customShortlinks[searchTerm]) {
                    chrome.tabs.update(tabId, { url: customShortlinks[searchTerm].url });
                    return;
                }
                
                // Search through all categories for the shortlink
                for (const category of Object.values(rules.categories || {})) {
                    if (category.links && category.links[searchTerm]) {
                        chrome.tabs.update(tabId, { url: category.links[searchTerm] });
                        break;
                    }
                }
                
                // If not a shortlink, redirect to chosen search engine if needed
                const currentSearchEngine = isGoogleSearch ? 'google' : 'duckduckgo';
                if (currentSearchEngine !== searchEngine) {
                    chrome.tabs.update(tabId, { 
                        url: SEARCH_URLS[searchEngine] + encodeURIComponent(searchTerm)
                    });
                }
            }
        } catch (e) {
            console.error(e);
        }
    }
});

// Check for updates when extension starts
chrome.runtime.onStartup.addListener(getRules);

// Create an alarm to check network status
chrome.alarms.create('checkNetwork', { periodInMinutes: 1 });

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkNetwork') {
        // Use navigator.onLine to check network status
        if (navigator.onLine) {
            getRules();
        }
    }
});

// Handle extension icon click
chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({
        url: chrome.runtime.getURL('shortlinks.html')
    });
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action === "refreshRules") {
            getRules().then(() => sendResponse({success: true}));
            return true; // Will respond asynchronously
        }
    }
);