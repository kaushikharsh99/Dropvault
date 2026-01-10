import { auth, signInWithExtension, signOut, signInEmail, signUpEmail } from './firebase.js';
import { onAuthStateChanged } from "firebase/auth";

// DOM Elements
const views = {
  loading: document.getElementById('loading-view'),
  saveStatus: document.getElementById('save-status-view'),
  auth: document.getElementById('auth-view')
};

const elements = {
  // Common
  appContainer: document.getElementById('app-container'),
  
  // Save Status View
  pageTitle: document.getElementById('page-title'),
  pageUrl: document.getElementById('page-url'),
  noteInput: document.getElementById('note-input'),
  openVaultBtn: document.getElementById('open-vault-btn'),
  undoBtn: document.getElementById('undo-btn'),
  saveMessage: document.getElementById('save-message'),
  tagBtns: document.querySelectorAll('.tag-btn'),

  // Auth View
  tabSignIn: document.getElementById('tab-signin'),
  tabSignUp: document.getElementById('tab-signup'),
  signinForm: document.getElementById('signin-form'),
  signupForm: document.getElementById('signup-form'),
  signinBtn: document.getElementById('signin-btn'),
  signupBtn: document.getElementById('signup-btn'),
  googleLoginBtn: document.getElementById('google-login-btn'),
  authError: document.getElementById('auth-error'),
  
  // Auth Inputs
  signinEmail: document.getElementById('signin-email'),
  signinPass: document.getElementById('signin-password'),
  signupName: document.getElementById('signup-name'),
  signupEmail: document.getElementById('signup-email'),
  signupPass: document.getElementById('signup-password'),
};

// State
let currentUser = null;
let currentTab = null;
let lastSavedItemId = null;
let screenshotMd = "";
let apiUrl = "http://localhost:8000";
const VAULT_URL = "http://localhost:5173";

// Initialize
async function init() {
  const storage = await chrome.storage.local.get(['apiUrl']);
  if (storage.apiUrl) {
    apiUrl = storage.apiUrl;
  }

  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    currentTab = tabs[0];
    if (currentTab) {
      elements.pageTitle.textContent = currentTab.title;
      elements.pageUrl.textContent = currentTab.url;
    }
  });
}

// Auth Listener
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    chrome.storage.local.set({ userId: user.uid });
    autoCapture();
  } else {
    showView('auth');
  }
});

async function autoCapture() {
  if (!currentUser) return;
  
  if (!currentTab) {
      await new Promise(resolve => {
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
              currentTab = tabs[0];
              resolve();
          });
      });
  }

  if (!currentTab || currentTab.url.startsWith("chrome://") || currentTab.url.startsWith("about:") || currentTab.url.startsWith("edge://")) {
      showView('saveStatus');
      elements.saveMessage.textContent = "Cannot capture this system page.";
      elements.saveMessage.style.color = "orange";
      return;
  }

  showView('loading');

  // 1. YouTube Timestamp Logic
  let finalUrl = currentTab.url;
  if (currentTab.url.includes("youtube.com") || currentTab.url.includes("youtu.be")) {
      try {
          const results = await chrome.scripting.executeScript({
              target: {tabId: currentTab.id},
              func: () => {
                  const video = document.querySelector('video');
                  return video ? Math.floor(video.currentTime) : null;
              }
          });
          const time = results[0]?.result;
          if (time) {
              const separator = finalUrl.includes("?") ? "&" : "?";
              finalUrl = `${finalUrl}${separator}t=${time}s`;
          }
      } catch (e) { console.warn("Timestamp failed", e); }
  }

  // 2. Auto-Screenshot Logic
  let screenshotUrl = null;
  try {
      const dataUrl = await chrome.tabs.captureVisibleTab(currentTab.windowId, { format: "jpeg", quality: 60 });
      screenshotUrl = await uploadScreenshot(dataUrl);
  } catch (e) {
      console.warn("Screenshot failed", e);
  }

  const payload = new FormData();
  payload.append("userId", currentUser.uid);
  payload.append("title", currentTab.title);
  payload.append("type", "link");
  payload.append("content", finalUrl);
  
  if (screenshotUrl) {
      screenshotMd = `![Screenshot](${screenshotUrl})\n\n`;
      payload.append("notes", screenshotMd);
  }
  
  try {
      const response = await fetch(`${apiUrl}/api/items`, {
          method: "POST",
          body: payload
      });

      if (!response.ok) throw new Error("Save failed");
      
      const data = await response.json();
      lastSavedItemId = data.id;
      
      showView('saveStatus');
      
      // Check for text selection
      chrome.scripting.executeScript({
          target: {tabId: currentTab.id},
          func: () => window.getSelection().toString()
      }, (results) => {
          if (results?.[0]?.result) {
              const text = `"${results[0].result.trim()}"`;
              elements.noteInput.value = text + "\n\n";
              updateItem(); 
          }
      });

  } catch (error) {
      console.error("Capture failed:", error);
      alert("Failed to save. Is the backend running?");
  }
}

async function uploadScreenshot(dataUrl) {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], "screenshot.jpg", { type: "image/jpeg" });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", currentUser.uid);

    const uploadRes = await fetch(`${apiUrl}/api/upload`, {
        method: "POST",
        body: formData
    });
    
    if (uploadRes.ok) {
        const data = await uploadRes.json();
        return data.fileUrl; 
    }
    return null;
}

function showView(viewName) {
    Object.keys(views).forEach(key => {
        views[key].classList.toggle('hidden', key !== viewName);
    });
}

// Update Logic
let updateTimeout;
function updateItem() {
    if (!lastSavedItemId || !currentUser) return;
    
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(async () => {
        const payload = new FormData();
        payload.append("title", currentTab.title);
        
        const selectedTags = Array.from(elements.tagBtns)
            .filter(btn => btn.classList.contains('selected'))
            .map(btn => btn.dataset.tag)
            .join(',');
            
        payload.append("tags", selectedTags);
        // Combine stored screenshot MD with user notes
        payload.append("notes", screenshotMd + elements.noteInput.value);
        payload.append("userId", currentUser.uid);

        try {
            await fetch(`${apiUrl}/api/items/${lastSavedItemId}`, {
                method: "PUT",
                body: payload
            });
            elements.saveMessage.textContent = "Changes saved";
            elements.saveMessage.style.color = "#10b981";
            setTimeout(() => { elements.saveMessage.textContent = ""; }, 2000);
        } catch (e) {
            console.error("Update failed", e);
        }
    }, 500);
}

// Event Listeners
elements.noteInput.addEventListener('input', updateItem);

elements.tagBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        btn.classList.toggle('selected');
        updateItem();
    });
});

elements.openVaultBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: VAULT_URL });
});

elements.undoBtn.addEventListener('click', async () => {
    if (!lastSavedItemId || !currentUser) return;
    elements.undoBtn.disabled = true;
    try {
        const response = await fetch(`${apiUrl}/api/items/${lastSavedItemId}?userId=${currentUser.uid}`, {
            method: "DELETE"
        });
        if (response.ok) window.close();
    } catch (e) {
        elements.undoBtn.disabled = false;
    }
});

// Auth UI Logic
elements.tabSignIn.addEventListener('click', () => {
    elements.tabSignIn.classList.add('active');
    elements.tabSignUp.classList.remove('active');
    elements.signinForm.classList.remove('hidden');
    elements.signupForm.classList.add('hidden');
    elements.authError.textContent = "";
});

elements.tabSignUp.addEventListener('click', () => {
    elements.tabSignUp.classList.add('active');
    elements.tabSignIn.classList.remove('active');
    elements.signupForm.classList.remove('hidden');
    elements.signinForm.classList.add('hidden');
    elements.authError.textContent = "";
});

elements.signinBtn.addEventListener('click', async () => {
    const email = elements.signinEmail.value;
    const pass = elements.signinPass.value;
    if(!email || !pass) return;
    
    elements.signinBtn.disabled = true;
    elements.signinBtn.textContent = "Signing in...";
    try {
        await signInEmail(email, pass);
    } catch (e) {
        elements.authError.textContent = e.message;
        elements.signinBtn.disabled = false;
        elements.signinBtn.textContent = "Sign In";
    }
});

elements.signupBtn.addEventListener('click', async () => {
    const name = elements.signupName.value;
    const email = elements.signupEmail.value;
    const pass = elements.signupPass.value;
    if(!name || !email || !pass) return;

    elements.signupBtn.disabled = true;
    elements.signupBtn.textContent = "Creating...";
    try {
        await signUpEmail(email, pass, name);
    } catch (e) {
        elements.authError.textContent = e.message;
        elements.signupBtn.disabled = false;
        elements.signupBtn.textContent = "Create Account";
    }
});

elements.googleLoginBtn.addEventListener('click', async () => {
  try {
    await signInWithExtension();
  } catch (error) {
    elements.authError.textContent = error.message;
  }
});

init();