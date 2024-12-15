# Shortlinks Chrome Extension

A Chrome extension that provides a convenient way to manage and use shortlinks (URL shortcuts). It allows you to use shortlinks directly in the address bar and maintains both built-in and custom shortcuts organized by categories.

## Features

- **Quick Access**: Type a shortlink in the address bar to instantly navigate to the corresponding URL
- **Categorized Organization**: Shortlinks are organized in categories for better overview
- **Custom Shortlinks**: Add your own shortlinks and categories
- **Remote Rules**: Load shortlinks from a remote JSON file with offline support
- **Configurable Search**: Choose between Google and DuckDuckGo for non-shortlink searches
- **Dark Mode**: Supports both light and dark themes with system preference detection
- **Filter View**: Filter between built-in and custom shortlinks
- **Click-to-Copy**: Easily copy shortlinks with visual feedback
- **Responsive UI**: Clean, modern interface that works on all screen sizes

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Usage

### Using Shortlinks
1. Type a shortlink in Chrome's address bar (e.g., "gh" for GitHub)
2. Press Enter to be redirected to the corresponding URL
3. If the shortlink isn't recognized, it performs a search using your chosen search engine

### Managing Shortlinks
1. Click the extension icon in Chrome's toolbar
2. Use the "+" buttons to add new shortlinks or categories
3. Use the filter dropdown to view all, built-in, or custom shortlinks
4. Click a shortlink to copy it to clipboard
5. Click the URL to open it in a new tab
6. Custom items can be deleted using the "×" button that appears on hover

### Remote Configuration
1. Click the "Settings" button in the extension
2. Enter the URL of your remote rules.json file
3. The file should follow the format shown in the example

### Search Engine Configuration
1. Click the "Settings" button in the extension
2. Select your preferred search engine (Google or DuckDuckGo)
3. Non-shortlink searches will automatically use your chosen engine

## Configuration

### Rules Format 
```json
{
	"categories": {
		"social": {
			"name": "Social Media",
			"links": {
				"tw": "https://twitter.com",
				"fb": "https://facebook.com"
			}
		},
		"dev": {
			"name": "Development",
			"links": {
				"gh": "https://github.com"
			}
		}
	}
}
```
