const API_BASE_URL = "http://localhost:8000";
const VAULT_URL = "http://localhost:5173";

// Create context menus
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "open-vault",
    title: "Open Knowledge Vault",
    contexts: ["action"]
  });

  chrome.contextMenus.create({
    id: "save-page",
    title: "Save Page to DropVault",
    contexts: ["page"]
  });

  chrome.contextMenus.create({
    id: "save-image",
    title: "Save Image to DropVault",
    contexts: ["image"]
  });

  chrome.contextMenus.create({
    id: "save-link-as-file",
    title: "Save Link as File",
    contexts: ["link"]
  });
});

// Handle Context Menus
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "open-vault") {
    chrome.tabs.create({ url: VAULT_URL });
  } else if (info.menuItemId === "save-page") {
    // Open modal instead of direct save
    chrome.tabs.sendMessage(tab.id, { action: "open-modal" });
  } else if (info.menuItemId === "save-image") {
    handleDownloadAndSave(info.srcUrl, tab, "image");
  } else if (info.menuItemId === "save-link-as-file") {
    handleDownloadAndSave(info.linkUrl, tab, "file");
  }
});

// Handle Messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "open-side-panel") {
    // Open side panel for the current window
    // Note: This requires a user gesture, so it must be called from a click handler
    chrome.sidePanel.open({ windowId: sender.tab.windowId });
  } else if (request.action === "trigger-capture") {
    // Legacy support or fallback
    handleSaveCommand(sender.tab);
  } else if (request.action === "trigger-capture-with-data") {
    handleSaveCommand(sender.tab, request.data);
    sendResponse({ status: "started" });
  } else if (request.action === "upload-file-from-content") {
    handleFileUpload(request.data, sender.tab).then(success => sendResponse({ success }));
    return true; // Keep channel open for async response
  }
});

// Handle Commands (Keyboard Shortcuts)
chrome.commands.onCommand.addListener((command) => {
  if (command === "run-capture") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "open-modal" });
      }
    });
  }
});

async function handleDownloadAndSave(url, tab, type) {
    try {
        const storage = await chrome.storage.local.get(['userId']);
        const userId = storage.userId;

        if (!userId) {
           notify("Authentication Required", "Please open the DropVault popup to sign in.");
           return;
        }

        notify(`Saving ${type}...`, "Processing your request...");

        // Use chrome.downloads to bypass CORS
        const downloadId = await chrome.downloads.download({
            url: url,
            saveAs: false
        });

        // Wait for download to complete to get the file
        // Note: In a real production app, we'd use a more complex flow to get the bytes
        // For this hackathon version, we'll fetch the URL directly from the background script
        // which has more permissive CORS than the content script.
        
        let blob;
        try {
            const res = await fetch(url);
            blob = await res.blob();
        } catch (e) {
            console.error("Direct fetch failed, download initiated instead", e);
            notify("Fetch Error", "This site blocks direct captures. Use the 'Drop Zone' instead.");
            return;
        }

        const filename = url.split('/').pop().split('?')[0] || `captured_${type}`;
        const formData = new FormData();
        formData.append("file", blob, filename);
        formData.append("userId", userId);

        const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
            method: "POST",
            body: formData
        });

        if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            
            const payload = new FormData();
            payload.append("userId", userId);
            payload.append("title", filename);
            payload.append("type", type === "image" ? "image" : "pdf"); // Simplification
            payload.append("content", tab.url);
            payload.append("file_path", uploadData.fileUrl);
            payload.append("notes", `Source: ${tab.url}`);

            const saveRes = await fetch(`${API_BASE_URL}/api/items`, { method: "POST", body: payload });
            if (saveRes.ok) {
                notify(`${type.charAt(0).toUpperCase() + type.slice(1)} Saved`, "Added to your vault.");
                chrome.action.setBadgeText({ text: "✔" });
                setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2000);
            }
        }
    } catch (err) {
        console.error("Download/Save failed", err);
        notify("Error", "Could not complete the save.");
    }
}

async function handleSaveCommand(tab, metadata = {}) {
    const storage = await chrome.storage.local.get(['userId']);
    const userId = storage.userId;

    if (!userId) {
       notify("Authentication Required", "Please sign in first.");
       return;
    }

    notify("Saving Page...", "Capturing...");

    let screenshotUrl = null;
    try {
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 60 });
        const screenRes = await fetch(dataUrl);
        const screenBlob = await screenRes.blob();
        const screenFormData = new FormData();
        screenBlob.name = "screenshot.jpg";
        screenFormData.append("file", screenBlob, "screenshot.jpg");
        screenFormData.append("userId", userId);
        
        const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, { method: "POST", body: screenFormData });
        if (uploadRes.ok) {
            const data = await uploadRes.json();
            screenshotUrl = data.fileUrl;
        }
    } catch (e) {}

    let finalUrl = tab.url;
    // ... YouTube logic ...
    if (tab.url.includes("youtube.com")) {
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => document.querySelector('video')?.currentTime
            });
            const time = Math.floor(results[0]?.result || 0);
            if (time) finalUrl += `&t=${time}s`;
        } catch (e) {}
    }

    const payload = new FormData();
    payload.append("userId", userId);
    
    // Use metadata from modal or fallback to tab data
    payload.append("title", metadata.title || tab.title);
    payload.append("type", "link");
    payload.append("content", finalUrl);
    
    let notes = metadata.notes || "";
    if (screenshotUrl) {
        notes += `\n\n![Screenshot](${screenshotUrl})`;
    }
    payload.append("notes", notes);

    // Tags handling
    if (metadata.tags && Array.isArray(metadata.tags)) {
        metadata.tags.forEach(tag => payload.append("tags", tag));
    }

    const res = await fetch(`${API_BASE_URL}/api/items`, { method: "POST", body: payload });
    if (res.ok) {
        notify("Page Saved", "Done!");
        chrome.action.setBadgeText({ text: "✔" });
        setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2000);
    }
}

async function handleFileUpload(fileData, tab) {
    try {
        const storage = await chrome.storage.local.get(['userId']);
        const userId = storage.userId;

        if (!userId) {
            notify("Authentication Required", "Please sign in first.");
            return false;
        }

        const res = await fetch(fileData.dataUrl);
        const blob = await res.blob();
        
        const formData = new FormData();
        formData.append("file", blob, fileData.name);
        formData.append("userId", userId);

        const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
            method: "POST",
            body: formData
        });

        if (!uploadRes.ok) throw new Error("Upload failed");
        
        const uploadData = await uploadRes.json();
        const initialType = fileData.type.startsWith("image/") ? "image" : "file";
        
        const payload = new FormData();
        payload.append("userId", userId);
        payload.append("title", fileData.name);
        payload.append("type", initialType);
        payload.append("file_path", uploadData.fileUrl);
        payload.append("notes", `Uploaded via Drop Zone from ${tab.title}`);
        
        const saveRes = await fetch(`${API_BASE_URL}/api/items`, {
            method: "POST",
            body: payload
        });
        
        if (saveRes.ok) {
            notify("File Saved", `${fileData.name} added to vault.`);
            return true;
        }
    } catch (e) {
        console.error("File upload failed", e);
        notify("Upload Failed", "Could not save file.");
    }
    return false;
}

function notify(title, message) {
    const id = "dv-" + Date.now();
    chrome.notifications.create(id, {
        type: 'basic',
        iconUrl: 'src/assets/icon48.png',
        title: title,
        message: message,
        priority: 2
    });
    // Auto-dismiss after 2.5 seconds
    setTimeout(() => {
        chrome.notifications.clear(id);
    }, 2500);
}

console.log('DropVault Background Service Active');