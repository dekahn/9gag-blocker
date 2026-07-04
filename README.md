# 9GAG Click Blocker

A Chrome extension that blocks posts on 9GAG based on tags you don't want to see.

## How It Works

### Blocking Tags
- **Click ✕ on any tag** while browsing 9GAG to block all posts with that tag
- **Add tags manually** in the extension popup if you know what you want filtered
- Posts with blocked tags are filtered **before they render**, preventing layout gaps

### Managing Blocked Tags
- View all blocked tags in the extension popup
- Remove any tag by clicking the ✕ next to it
- **Export** your blocked tags list as a JSON file
- **Import** a previously saved list to restore or share settings

## Features

✅ **Network-level filtering** - Posts are blocked before rendering  
✅ **No layout gaps** - 9GAG's feed stays clean  
✅ **Click to block** - Add tags on the fly while browsing  
✅ **Manual entry** - Pre-block tags you know you dislike  
✅ **Import/Export** - Backup and restore your filtered tags  
✅ **Non-intrusive** - Only shows up as a popup icon  

## Installation

1. Download the extension files
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" and select the extension folder
5. Done! The extension icon should appear in your toolbar

## Using Import/Export

### Export
1. Click the extension icon
2. Click **Export**
3. Your `9gag-blocker-YYYY-MM-DD.json` file will download

### Import
1. Click the extension icon
2. Click **Import**
3. Select a previously exported JSON file
4. Your blocked tags will be merged with existing ones

## How Filtering Works

The extension intercepts 9GAG's API responses and filters out any posts that contain tags you've blocked. This happens at the network level, so:

- Posts never render in your feed
- No blank spaces or layout gaps
- Better performance

## Tips

- **Be specific**: Block individual tags rather than broad categories for better control
- **Backup your list**: Export regularly so you don't lose your settings
- **Share settings**: Export your list and share it with friends who want the same filters