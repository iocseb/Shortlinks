// Theme handling
function initializeTheme() {
    const toggle = document.getElementById('theme-toggle');
    const label = toggle.nextElementSibling;
    
    // Function to set theme
    function setTheme(isDark) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        toggle.checked = isDark;
    }
    
    // Check system preference
    if (window.matchMedia) {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setTheme(darkModeQuery.matches);
        
        // Listen for system theme changes
        darkModeQuery.addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {  // Only if user hasn't set preference
                setTheme(e.matches);
            }
        });
    }
    
    // Check for saved preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme === 'dark');
    }
    
    // Handle toggle clicks
    toggle.addEventListener('change', () => {
        const isDark = toggle.checked;
        setTheme(isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

// Function to populate category select
function populateCategories(rules) {
    const select = document.getElementById('category');
    select.innerHTML = ''; // Clear existing options
    
    // Add default categories from rules
    Object.entries(rules.categories || {}).forEach(([id, category]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = category.name;
        select.appendChild(option);
    });
}

// Function to handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = '';
    
    const shortlink = document.getElementById('shortlink').value.trim();
    const url = document.getElementById('url').value.trim();
    const categoryId = document.getElementById('category').value;
    
    try {
        // Get current rules
        const data = await chrome.storage.local.get(['rules', 'customShortlinks']);
        const rules = data.rules || {};
        const customShortlinks = data.customShortlinks || {};
        
        // Check if shortlink already exists in default rules
        for (const category of Object.values(rules.categories || {})) {
            if (category.links && category.links[shortlink]) {
                throw new Error('Shortlink already exists in default rules');
            }
        }
        
        // Check if shortlink exists in custom rules
        if (customShortlinks[shortlink]) {
            throw new Error('Shortlink already exists in custom rules');
        }
        
        // Add new shortlink
        customShortlinks[shortlink] = {
            url: url,
            categoryId: categoryId
        };
        
        // Save to storage
        await chrome.storage.local.set({ customShortlinks });
        
        // Clear form
        e.target.reset();
        
        // Close modal
        document.getElementById('addShortlinkModal').style.display = 'none';
        
        // Refresh display
        displayShortlinks();
        
    } catch (error) {
        errorDiv.textContent = error.message;
    }
}

// Function to handle category form submission
async function handleCategorySubmit(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('categoryErrorMessage');
    errorDiv.textContent = '';
    
    const categoryId = document.getElementById('categoryId').value.trim();
    const categoryName = document.getElementById('categoryName').value.trim();
    
    try {
        // Get current rules
        const data = await chrome.storage.local.get(['rules', 'customCategories']);
        const rules = data.rules || {};
        const customCategories = data.customCategories || {};
        
        // Check if category ID already exists in default rules
        if (rules.categories && rules.categories[categoryId]) {
            throw new Error('Category ID already exists in default rules');
        }
        
        // Check if category exists in custom categories
        if (customCategories[categoryId]) {
            throw new Error('Category ID already exists in custom categories');
        }
        
        // Add new category
        customCategories[categoryId] = {
            name: categoryName,
            links: {}
        };
        
        // Save to storage
        await chrome.storage.local.set({ customCategories });
        
        // Clear form
        e.target.reset();
        
        // Close modal
        document.getElementById('addCategoryModal').style.display = 'none';
        
        // Refresh display
        displayShortlinks();
        
    } catch (error) {
        errorDiv.textContent = error.message;
    }
}

// Filter change handler
document.getElementById('filterSelect').addEventListener('change', (e) => {
    displayShortlinks();
});

// Function to display shortlinks
async function displayShortlinks() {
    const container = document.getElementById('shortlinks');
    container.innerHTML = '';
    
    try {
        // Get rules, custom categories and shortlinks from storage
        const data = await chrome.storage.local.get(['rules', 'customShortlinks', 'customCategories']);
        const rules = JSON.parse(JSON.stringify(data.rules || {}));
        const customShortlinks = data.customShortlinks || {};
        const customCategories = data.customCategories || {};
        const filterValue = document.getElementById('filterSelect').value;
        
        // Filter categories based on toggles
        if (filterValue === 'custom') {
            rules.categories = { ...customCategories };
        } else if (filterValue === 'builtin') {
            const { categories } = data.rules || {};
            rules.categories = { ...categories };
        } else {
            rules.categories = {
                ...rules.categories,
                ...customCategories
            };
        }
        
        // Sort categories by name
        const sortedCategories = Object.entries(rules.categories || {})
            .sort((a, b) => a[1].name.localeCompare(b[1].name));
        
        // Add custom shortlinks to their categories
        Object.entries(customShortlinks).forEach(([key, data]) => {
            if (filterValue !== 'builtin') {
                const category = rules.categories[data.categoryId];
                if (category) {
                    category.links[key] = data.url;
                }
            }
        });
        
        // Create HTML elements for each category
        sortedCategories.forEach(([categoryId, category]) => {
            const isCustomCategory = customCategories[categoryId];
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category';
            
            const headerWrapper = document.createElement('div');
            headerWrapper.className = 'category-header';
            
            const categoryName = document.createElement('div');
            categoryName.className = 'category-name';
            categoryName.textContent = category.name;
            headerWrapper.appendChild(categoryName);
            
            // Add custom tag and delete button for custom categories
            if (isCustomCategory) {
                const customTag = document.createElement('span');
                customTag.className = 'custom-tag';
                customTag.textContent = 'Custom';
                headerWrapper.appendChild(customTag);
                
                const deleteButton = document.createElement('button');
                deleteButton.className = 'delete-button';
                deleteButton.innerHTML = `
                    <svg viewBox="0 0 24 24" width="14" height="14">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>`;
                deleteButton.title = 'Delete category';
                deleteButton.onclick = async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Check if category has any shortlinks
                    const hasShortlinks = Object.entries(customShortlinks).some(([_, data]) => 
                        data.categoryId === categoryId
                    );
                    
                    if (hasShortlinks) {
                        alert('Please remove all shortlinks from this category before deleting it.');
                        return;
                    }
                    
                    if (confirm(`Delete category "${category.name}"?`)) {
                        const data = await chrome.storage.local.get(['customCategories']);
                        const customCategories = data.customCategories || {};
                        
                        delete customCategories[categoryId];
                        await chrome.storage.local.set({ customCategories });
                        displayShortlinks();
                    }
                };
                headerWrapper.appendChild(deleteButton);
            }
            
            categoryDiv.appendChild(headerWrapper);
            
            // Sort links within category
            const sortedLinks = Object.entries(category.links)
                .sort((a, b) => a[0].localeCompare(b[0]));
            
            // Create elements for each shortlink in category
            sortedLinks.forEach(([key, value]) => {
                const div = document.createElement('div');
                div.className = 'shortlink';
                
                // Create clickable shortlink
                const keyLink = document.createElement('a');
                keyLink.className = 'key';
                keyLink.textContent = key;
                keyLink.href = '#';
                keyLink.title = 'Click to copy shortlink';
                
                // Add custom tag if it's a user-added shortlink
                if (customShortlinks[key]) {
                    const customTag = document.createElement('span');
                    customTag.className = 'custom-tag';
                    customTag.textContent = 'Custom';
                    keyLink.appendChild(customTag);
                    
                    // Add delete button
                    const deleteButton = document.createElement('button');
                    deleteButton.className = 'delete-button';
                    deleteButton.innerHTML = `
                        <svg viewBox="0 0 24 24" width="14" height="14">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>`;
                    deleteButton.title = 'Delete shortlink';
                    deleteButton.onclick = async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        if (confirm(`Delete shortlink "${key}"?`)) {
                            const data = await chrome.storage.local.get(['customShortlinks']);
                            const customShortlinks = data.customShortlinks || {};
                            
                            delete customShortlinks[key];
                            await chrome.storage.local.set({ customShortlinks });
                            
                            // Refresh display
                            displayShortlinks();
                        }
                    };
                    keyLink.appendChild(deleteButton);
                }
                
                // Create clickable URL
                const valueLink = document.createElement('a');
                valueLink.className = 'value';
                valueLink.textContent = value;
                valueLink.href = value;
                valueLink.target = '_blank';
                valueLink.rel = 'noopener noreferrer';
                valueLink.title = 'Click to open URL';
                
                div.appendChild(keyLink);
                div.appendChild(valueLink);
                
                // Add click handler to copy shortlink
                keyLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    navigator.clipboard.writeText(key).then(() => {
                        // Visual feedback
                        const originalText = key;
                        const customTag = keyLink.querySelector('.custom-tag');
                        const deleteButton = keyLink.querySelector('.delete-button');
                        
                        // Remove existing content but save the tag and button
                        if (customTag) customTag.remove();
                        if (deleteButton) deleteButton.remove();
                        
                        keyLink.textContent = 'Copied!';
                        keyLink.style.color = getComputedStyle(document.documentElement)
                            .getPropertyValue('--success-color');
                        
                        // Add back the custom tag and delete button
                        if (customTag) keyLink.appendChild(customTag);
                        if (deleteButton) keyLink.appendChild(deleteButton);
                        
                        setTimeout(() => {
                            keyLink.textContent = originalText;
                            if (customTag) keyLink.appendChild(customTag);
                            if (deleteButton) keyLink.appendChild(deleteButton);
                            keyLink.style.color = '';
                        }, 1000);
                    });
                });
                
                categoryDiv.appendChild(div);
            });
            
            container.appendChild(categoryDiv);
        });
        
        // Populate category select
        populateCategories(rules);
        
        // If no shortlinks found
        if (sortedCategories.length === 0) {
            container.textContent = 'No shortlinks available';
        }
    } catch (error) {
        console.error('Error displaying shortlinks:', error);
        container.textContent = 'Error loading shortlinks';
    }
}

// Modal handlers
document.getElementById('openShortlinkModal').addEventListener('click', () => {
    document.getElementById('addShortlinkModal').style.display = 'flex';
});

document.getElementById('openCategoryModal').addEventListener('click', () => {
    document.getElementById('addCategoryModal').style.display = 'flex';
});

document.getElementById('closeShortlinkModal').addEventListener('click', () => {
    document.getElementById('addShortlinkModal').style.display = 'none';
});

document.getElementById('closeCategoryModal').addEventListener('click', () => {
    document.getElementById('addCategoryModal').style.display = 'none';
});

// Close modals when clicking outside
document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// Add form submit handlers
document.getElementById('addShortlinkForm').addEventListener('submit', handleFormSubmit);
document.getElementById('addCategoryForm').addEventListener('submit', handleCategorySubmit);

// Display shortlinks when popup opens
displayShortlinks();
initializeTheme();

// Settings handlers
document.getElementById('openSettingsModal').addEventListener('click', async () => {
    const data = await chrome.storage.local.get(['remoteUrl', 'searchEngine']);
    document.getElementById('remoteUrl').value = data.remoteUrl || SHORTLINKS_URL;
    document.getElementById('searchEngine').value = data.searchEngine || 'google';
    document.getElementById('settingsModal').style.display = 'flex';
});

document.getElementById('closeSettingsModal').addEventListener('click', () => {
    document.getElementById('settingsModal').style.display = 'none';
});

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorDiv = document.getElementById('settingsErrorMessage');
    errorDiv.textContent = '';
    
    const remoteUrl = document.getElementById('remoteUrl').value.trim();
    const searchEngine = document.getElementById('searchEngine').value;
    
    try {
        // Test the URL
        const response = await fetch(remoteUrl);
        if (!response.ok) throw new Error('Could not fetch rules from URL');
        
        const data = await response.json();
        if (!data.categories) throw new Error('Invalid rules format');
        
        // Save settings
        await chrome.storage.local.set({ 
            remoteUrl,
            searchEngine
        });
        
        // Tell background script to refresh rules
        await chrome.runtime.sendMessage({action: "refreshRules"});
        
        // Close modal and refresh
        document.getElementById('settingsModal').style.display = 'none';
        displayShortlinks();
        
    } catch (error) {
        errorDiv.textContent = error.message;
    }
}); 