import { auth, signInWithExtension, signOut, signInEmail, signUpEmail } from './firebase.js';
import { onAuthStateChanged } from "firebase/auth";

// DOM Elements
const views = {
  loading: document.getElementById('loading-view'),
  auth: document.getElementById('auth-view'),
  dropZone: document.getElementById('drop-zone-view')
};

const elements = {
  // App
  appContainer: document.getElementById('app-container'),
  
  // Auth
  tabSignIn: document.getElementById('tab-signin'),
  tabSignUp: document.getElementById('tab-signup'),
  signinForm: document.getElementById('signin-form'),
  signupForm: document.getElementById('signup-form'),
  signinBtn: document.getElementById('signin-btn'),
  signupBtn: document.getElementById('signup-btn'),
  googleLoginBtn: document.getElementById('google-login-btn'),
  authError: document.getElementById('auth-error'),
  
  // Inputs
  signinEmail: document.getElementById('signin-email'),
  signinPass: document.getElementById('signin-password'),
  signupName: document.getElementById('signup-name'),
  signupEmail: document.getElementById('signup-email'),
  signupPass: document.getElementById('signup-password'),
  
  // Drop Zone
  dropArea: document.getElementById('dv-drop-target'),
  statusList: document.getElementById('dv-status-list'),
  capturePageBtn: document.getElementById('capture-page-btn'),
  signoutBtn: document.getElementById('signout-btn')
};

// State
let currentUser = null;
let apiUrl = "http://localhost:8000";

// Initialize
async function init() {
  const storage = await chrome.storage.local.get(['apiUrl']);
  if (storage.apiUrl) {
    apiUrl = storage.apiUrl;
  }
}

// Auth Listener
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    chrome.storage.local.set({ userId: user.uid });
    showView('dropZone');
  } else {
    showView('auth');
  }
});

function showView(viewName) {
    Object.keys(views).forEach(key => {
        if (views[key]) views[key].classList.toggle('hidden', key !== viewName);
    });
}

// --- Drag & Drop Logic ---

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  elements.dropArea.addEventListener(eventName, preventDefaults, false);
});

elements.dropArea.addEventListener('dragenter', () => elements.dropArea.classList.add('drag-active'), false);
elements.dropArea.addEventListener('dragleave', () => elements.dropArea.classList.remove('drag-active'), false);
elements.dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
  elements.dropArea.classList.remove('drag-active');
  const dt = e.dataTransfer;
  const files = dt.files;

  if (files && files.length > 0) {
    handleFiles(files);
  } else {
    // Try to extract data
    const html = dt.getData('text/html');
    const text = dt.getData('text/plain');
    const uriList = dt.getData('text/uri-list');
    
    // Check for image in HTML
    if (html) {
       const parser = new DOMParser();
       const doc = parser.parseFromString(html, 'text/html');
       const img = doc.querySelector('img');
       if (img && img.src) {
           addStatusItem(`Saving Image...`, 'spinner');
           uploadLinkOrText(img.src, "image", `Source: ${img.src}`);
           return;
       }
    }

    if (uriList || (text && text.match(/^https?:\/\//))) {
         const link = uriList || text;
         addStatusItem(`Saving Link...`, 'spinner');
         uploadLinkOrText(link, "link");
    } else if (text) {
         addStatusItem(`Saving Note...`, 'spinner');
         uploadLinkOrText(text, "note");
    }
  }
}

function addStatusItem(text, icon = 'check') {
   const item = document.createElement('div');
   item.className = 'dv-status-item';
   item.innerHTML = `
     <div class="dv-status-icon">
       ${icon === 'check' 
         ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#10b981"><polyline points="20 6 9 17 4 12"></polyline></svg>' 
         : (icon === 'error' 
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#ef4444"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
            : '<div class="spinner" style="display:block; border-color: #6b7280; border-top-color: transparent;"></div>')
        }
     </div>
     <div class="dv-status-text">${text}</div>
   `;
   elements.statusList.prepend(item);
   // Remove success/error items after 5s, keep spinner until replaced? 
   // Actually simpler to just add new items.
   if (icon !== 'spinner') {
       setTimeout(() => item.remove(), 5000);
   }
   return item;
}

function handleFiles(files) {
  ([...files]).forEach(file => {
      const statusItem = addStatusItem(`Uploading ${file.name}...`, 'spinner');
      
      const formData = new FormData();
      if (currentUser) formData.append("userId", currentUser.uid);
      formData.append("file", file);

      fetch(`${apiUrl}/api/upload`, { method: "POST", body: formData })
          .then(async (res) => {
              if (!res.ok) throw new Error("Upload failed");
              const data = await res.json();
              const initialType = file.type === "application/pdf" ? "pdf" : (file.type.startsWith("image/") ? "image" : "file");
              
              // Create Item
              const itemPayload = new FormData();
              itemPayload.append("userId", currentUser.uid);
              itemPayload.append("title", file.name);
              itemPayload.append("type", initialType);
              itemPayload.append("file_path", data.fileUrl);
              
              return fetch(`${apiUrl}/api/items`, { method: "POST", body: itemPayload });
          })
          .then(() => {
              statusItem.remove();
              addStatusItem(`Saved ${file.name}`);
          })
          .catch((e) => {
              statusItem.remove();
              addStatusItem(`Failed ${file.name}`, 'error');
              console.error(e);
          });
  });
}

function uploadLinkOrText(content, type, notes = "") {
    const title = type === 'link' ? "Dropped Link" : (type === 'image' ? "Dropped Image" : content.substring(0, 30) + "...");
    const payload = new FormData();
    payload.append("userId", currentUser.uid);
    payload.append("title", title);
    payload.append("type", type);
    
    if (type === 'note') {
        payload.append("notes", content);
    } else {
        payload.append("content", content);
        if (notes) payload.append("notes", notes);
    }

    fetch(`${apiUrl}/api/items`, { method: "POST", body: payload })
        .then(res => {
            if(!res.ok) throw new Error("Failed");
            addStatusItem(`Saved ${type}`);
        })
        .catch(e => {
            addStatusItem(`Failed to save ${type}`, 'error');
        });
}


// --- Auth UI Logic (Identical to Popup) ---
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

elements.signoutBtn.addEventListener('click', async () => {
    await signOut(auth);
});

elements.capturePageBtn.addEventListener('click', () => {
    // Trigger capture in background or active tab
    // We can use the existing "run-capture" command logic or duplicate it.
    // Simplest is to send a message to background.js to trigger the capture logic.
    chrome.runtime.sendMessage({ action: "trigger-capture-from-sidepanel" });
});

// Listener for background messages (e.g., capture status)
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "capture-status") {
        addStatusItem(msg.text, msg.type === 'success' ? 'check' : 'error');
    }
});

init();
