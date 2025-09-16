# Fab Bridge Extension

A Chrome extension that captures entitlements data from `fab.com/library` and allows you to view and export it through the extension popup. Easily customizable for any website.

## 🎯 Features

- **Automatic Data Capture**: Intercepts API calls to `/i/library/entitlements/search` on fab.com
- **Cross-Domain Storage**: Uses IndexedDB in service worker for data persistence
- **Modern UI**: Clean popup interface with real-time statistics
- **Export Functionality**: Download all captured data as formatted JSON
- **Debug Tools**: Built-in logging and debugging interface
- **Customizable**: Easy to modify URLs and domains for your own use

## 📦 Installation

### Chrome/Edge Installation
1. Download or clone this repository
2. Open `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked" and select the extension folder
5. The extension icon should appear in your toolbar

### First Use
1. Visit `https://fab.com/library` to start capturing data
2. Click the extension icon to view captured entitlements
3. Customize the extension to work with your own website (see Customization section)

## 🚀 Usage

### How to Use the Extension

#### Step 1: Capture Data from Fab Library
1. **Go to Fab Library**: Visit `https://fab.com/library` in your browser
2. **Scroll to Load Data**: Scroll down through the library page until you reach the end
   - The extension automatically captures data as you scroll
   - You'll see new items being loaded as you scroll down
   - Continue scrolling until you've loaded all the items you want to capture
3. **Data is Automatically Saved**: No manual action needed - the extension captures everything in the background

#### Step 2: View Your Captured Data
**Option A: Extension Popup**
- Click the extension icon in Chrome toolbar
- View statistics: total entitlements, last update time
- See recent items (last 5)
- Use action buttons:
  - **Refresh**: Update data from storage
  - **View All**: Open the detailed view in a new tab
  - **Export JSON**: Download all data as JSON file
  - **Clear**: Delete all captured data

**Option B: Detailed View on Step-on.dev**
- Visit `https://step-on.dev` (or your configured display website)
- Look for the floating "Fab Library" button (bottom right corner)
- Click the button to open the detailed panel
- View all captured entitlements with:
  - High-quality images (click to enlarge)
  - Clickable titles (opens Fab.com listing)
  - Seller information
  - Creation dates
  - Export and management options

### Automatic Capture Process
- The extension automatically intercepts API calls to `/i/library/entitlements/search`
- Data is captured in real-time as you scroll through the library
- No manual intervention required - just browse normally
- All data is stored locally in your browser

## 🔧 Customization

### Quick Setup for Your Own Website

To use this extension with your own website instead of the default setup:

1. **Change the display website URL** in `popup.js` (line ~225):
   ```javascript
   chrome.tabs.create({ url: 'https://your-website.com' });
   ```

2. **Update manifest permissions** in `manifest.json`:
   ```json
   "host_permissions": [
     "https://*.fab.com/*",
     "https://*.your-website.com/*"
   ]
   ```

3. **Update content script matches** in `manifest.json`:
   ```json
   {
     "matches": ["https://*.your-website.com/*"],
     "js": ["cs_site.js"],
     "run_at": "document_idle"
   }
   ```

4. **Customize the button text** in `cs_site.js`:
   ```javascript
   btn.textContent = 'Your Custom Button';
   ```

### Advanced Customization

For more advanced customization, here are the key files to modify:

#### 1. Update Manifest Permissions (`manifest.json`)
```json
{
  "host_permissions": [
    "https://*.your-target-domain.com/*",
    "https://*.your-display-domain.com/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://*.your-target-domain.com/library*"],
      "js": ["cs_fab.js"],
      "run_at": "document_start"
    },
    {
      "matches": ["https://*.your-display-domain.com/*"],
      "js": ["cs_site.js"],
      "run_at": "document_idle"
    }
  ]
}
```

**Example for a custom setup:**
```json
{
  "host_permissions": [
    "https://*.example.com/*",
    "https://*.mywebsite.com/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://*.example.com/data*"],
      "js": ["cs_fab.js"],
      "run_at": "document_start"
    },
    {
      "matches": ["https://*.mywebsite.com/*"],
      "js": ["cs_site.js"],
      "run_at": "document_idle"
    }
  ]
}
```

#### 2. Update Target API Endpoint (`hook.js`)
```javascript
// Change the target API endpoint
const TARGET = '/your/api/endpoint/search';

// Update the pathname check if needed
if (location.pathname !== '/your-library-path') return;
```

#### 3. Update Content Scripts

**For data capture (`cs_fab.js`):**
```javascript
// Update the pathname check
if (location.pathname !== '/your-library-path') return;

// Update the message type for your use case
if (!data || data.type !== 'YOUR_CUSTOM_RESULTS') return;
```

**For display (`cs_site.js`):**
```javascript
// Update the button text and styling
btn.textContent = 'Your Custom Button';
// Modify the data structure handling in renderPanel()
```

**For popup "View All" button (`popup.js`):**
```javascript
// Update the target URL for "View All" button
function openStepOn() {
  log('INFO', 'Opening your custom website');
  chrome.tabs.create({ url: 'https://your-website.com' });
}
```

#### 4. Update Data Structure

**Service Worker (`sw.js`):**
```javascript
// Update the database name and store
const DB_NAME = 'your-custom-bridge';
const STORE = 'your-data-type';

// Modify the data processing in putMany() if needed
```

**Hook Script (`hook.js`):**
```javascript
// Update the message type
window.postMessage({ type: 'YOUR_CUSTOM_RESULTS', results }, '*');

// Modify the data extraction logic
const results = Array.isArray(json?.yourResultsArray) ? json.yourResultsArray : [];
```

### Customizing Data Fields

The extension currently captures these fields from fab.com:
- `uid` - Unique identifier
- `title` - Item title
- `price` - Starting price
- `currency` - Currency code
- `createdAt` - Creation date
- `seller` - Seller name
- `thumbnails` - Image thumbnails

To customize for your API, modify the data extraction in `hook.js` and the display logic in `cs_site.js` and `popup.js`.

## 🛠️ Development & Debugging

### Debug Tools
- **Console Logs**: Check browser console for detailed logs
- **Service Worker**: `chrome://extensions/` → Details → Inspect views: Service Worker
- **Content Scripts**: Check page console
- **Debug Panel**: Use "Debug Logs" button in popup

### Log Levels
- `INFO`: General information
- `WARN`: Warnings
- `ERROR`: Errors
- `DEBUG`: Detailed debugging information

### Testing Your Customization
1. Update the configuration files
2. Reload the extension in `chrome://extensions/`
3. Test on your target domains
4. Check logs for any issues
5. Verify data capture and display

## 📊 Data Structure

### Captured Data
The extension captures entitlements with these fields:
- `uid`: Unique identifier
- `title`: Item title
- `price`: Starting price
- `currency`: Currency code
- `createdAt`: Creation date
- `seller`: Seller name
- `thumbnails`: Image thumbnails
- `savedAt`: Timestamp when saved by extension

### Export Format
```json
{
  "metadata": {
    "exportDate": "2024-01-15T10:30:00.000Z",
    "version": "1.0",
    "source": "Fab Bridge Extension",
    "itemCount": 25
  },
  "entitlements": [
    {
      "uid": "12345",
      "title": "Item Title",
      "listing": {
        "startingPrice": {
          "price": "100",
          "currencyCode": "USD"
        }
      },
      "createdAt": "2024-01-15T09:00:00.000Z",
      "savedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

## 🔒 Permissions

- `storage`: Local data storage
- `scripting`: Script injection
- `activeTab`: Access to active tab
- `tabs`: Tab management
- `host_permissions`: Access to configured target and display domains

## 📁 File Structure

- `manifest.json` - Extension configuration
- `popup.html/js` - Popup interface
- `sw.js` - Service worker (data management)
- `cs_fab.js` - Content script for fab.com
- `cs_site.js` - Content script for your display website
- `hook.js` - Injected script for API interception

## 🚨 Important Notes

- **Terms of Service**: You are responsible for respecting the terms of service of any websites you modify this extension for
- **Data Privacy**: No personal data is collected by default
- **API Changes**: If target websites change their API structure, you may need to update the hook script
- **Rate Limiting**: Be mindful of API rate limits when capturing data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source. Please ensure you comply with the terms of service of any websites you use this extension with.

## 🆘 Troubleshooting

### Extension Not Capturing Data
1. Check that you're on the correct domain and path
2. Verify the API endpoint hasn't changed
3. Check console logs for errors
4. Ensure the extension is enabled

### Popup Not Working
1. Verify extension is installed and enabled
2. Check permissions in `chrome://extensions/`
3. Reload the extension if needed

### Data Not Saving
1. Check service worker logs
2. Verify IndexedDB is working (Application tab → Storage → IndexedDB)
3. Check for storage quota issues

### Export Not Working
1. Ensure you have data to export
2. Check browser download settings
3. Verify popup blockers aren't interfering