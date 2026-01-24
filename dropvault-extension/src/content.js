(function() {
  let shadowRoot = null;

  function inject() {
    if (document.getElementById('dropvault-root')) return;
    
    const target = document.body || document.documentElement;
    if (!target) return;

    const host = document.createElement('div');
    host.id = 'dropvault-root';
    host.style.all = 'initial';
    host.style.position = 'fixed';
    host.style.bottom = '0';
    host.style.right = '0';
    host.style.zIndex = '2147483647';
    target.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    shadowRoot = shadow;

    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

      * {
        box-sizing: border-box;
      }

      /* --- FAB Styles --- */
      #dropvault-fab-container {
        position: fixed;
        bottom: 32px;
        right: 0px;
        display: flex;
        flex-direction: column-reverse;
        align-items: center;
        gap: 12px;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        pointer-events: auto;
        transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 100;
      }

      #dropvault-fab-container.side-hidden {
        transform: translateX(48px); 
      }

      .dropvault-fab-trigger {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: hsl(234, 89%, 72%) !important;
        box-shadow: 0 4px 14px rgba(79, 70, 229, 0.25);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: none !important;
        padding: 0;
        z-index: 2;
        opacity: 0.95;
      }

      #dropvault-fab-container:hover .dropvault-fab-trigger {
        opacity: 1;
        background: hsl(234, 89%, 68%) !important;
        box-shadow: 0 6px 20px rgba(79, 70, 229, 0.35);
        transform: scale(1.05);
      }

      .dropvault-fab-menu {
        display: flex;
        flex-direction: column;
        gap: 8px;
        opacity: 0;
        visibility: hidden;
        transform: translateY(20px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .dropvault-fab-menu.active {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }

      .dropvault-fab-item {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: white !important;
        border: 1px solid #e5e7eb !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #4b5563;
        transition: all 0.2s;
        position: relative;
        padding: 0;
      }

      .dropvault-fab-item:hover {
        background: #f9fafb !important;
        color: hsl(234, 89%, 65%);
        border-color: hsl(234, 89%, 65%) !important;
      }

      .dropvault-fab-item::before {
        content: attr(data-label);
        position: absolute;
        right: 54px;
        background: #1f2937;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        transition: all 0.2s;
        pointer-events: none;
      }

      .dropvault-fab-item:hover::before {
        opacity: 1;
        visibility: visible;
        right: 60px;
      }

      .dropvault-fab-icon {
        width: 22px;
        height: 22px;
        stroke-width: 2.5;
      }
      
      .main-logo-icon {
        width: 28px;
        height: 28px;
        fill: white;
      }

      /* --- Side Drawer Styles --- */
      .dv-drawer-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.2);
        backdrop-filter: blur(2px);
        z-index: 90;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease;
      }
      .dv-drawer-overlay.open {
        opacity: 1;
        visibility: visible;
      }

      .dv-drawer {
        position: fixed;
        top: 0;
        right: -320px;
        width: 320px;
        height: 100vh;
        background: white;
        box-shadow: -5px 0 25px rgba(0,0,0,0.1);
        z-index: 95;
        transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
      }
      .dv-drawer.open {
        right: 0;
      }

      .dv-drawer-header {
        padding: 20px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .dv-drawer-title {
        font-size: 16px;
        font-weight: 600;
        color: #111827;
        margin: 0;
      }
      .dv-close-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: #6b7280;
        padding: 4px;
        border-radius: 4px;
      }
      .dv-close-btn:hover {
        background: #f3f4f6;
        color: #111827;
      }

      .dv-drop-area {
        flex: 1;
        margin: 20px;
        border: 2px dashed #e5e7eb;
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #9ca3af;
        transition: all 0.2s;
        text-align: center;
        padding: 20px;
      }
      .dv-drop-area.drag-active {
        border-color: hsl(234, 89%, 72%);
        background: hsla(234, 89%, 72%, 0.05);
        color: hsl(234, 89%, 72%);
      }
      .dv-drop-icon {
        width: 48px;
        height: 48px;
        margin-bottom: 12px;
        stroke-width: 1.5;
      }
      .dv-drop-text {
        font-size: 14px;
        font-weight: 500;
      }
      .dv-drop-subtext {
        font-size: 12px;
        margin-top: 4px;
        opacity: 0.7;
      }

      .dv-status-list {
        padding: 0 20px 20px;
        overflow-y: auto;
        max-height: 200px;
      }
      .dv-status-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        background: #f9fafb;
        border-radius: 8px;
        margin-bottom: 8px;
        font-size: 13px;
        color: #374151;
      }
      .dv-status-icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }
      .dv-status-text {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
      }

      /* --- Modal Styles (Existing) --- */
      .dv-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.4);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: all 0.2s ease-in-out;
      }
      .dv-modal-overlay.open {
        opacity: 1;
        visibility: visible;
      }
      .dv-modal {
        background: white;
        border-radius: 20px;
        width: 90%;
        max-width: 420px;
        padding: 28px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
        transform: scale(0.95);
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        border: 1px solid rgba(229, 231, 235, 0.5);
      }
      .dv-modal-overlay.open .dv-modal {
        transform: scale(1);
      }
      .dv-modal-header { margin-bottom: 24px; }
      .dv-modal-title { font-size: 20px; font-weight: 600; color: #111827; margin: 0; letter-spacing: -0.025em; }
      .dv-form-group { margin-bottom: 20px; }
      .dv-label { display: block; font-size: 13px; font-weight: 600; color: #4b5563; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
      .dv-input, .dv-textarea { width: 100%; padding: 12px 14px; border-radius: 12px; border: 1.5px solid #e5e7eb; font-size: 14px; outline: none; transition: all 0.2s; box-sizing: border-box; color: #1f2937; font-family: inherit; background: #fdfdfd; }
      .dv-input:focus, .dv-textarea:focus { border-color: hsl(234, 89%, 72%); background: white; box-shadow: 0 0 0 4px hsla(234, 89%, 72%, 0.15); }
      .dv-textarea { min-height: 100px; resize: vertical; }
      .dv-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 28px; }
      .dv-btn { padding: 11px 22px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s ease; display: flex; align-items: center; gap: 8px; }
      .dv-btn-cancel { background: transparent; color: #6b7280; border: 1.5px solid #e5e7eb; }
      .dv-btn-cancel:hover { background: #f9fafb; color: #111827; border-color: #d1d5db; }
      .dv-btn-save { background: hsl(234, 89%, 72%); color: white; box-shadow: 0 4px 10px hsla(234, 89%, 72%, 0.3); }
      .dv-btn-save:hover { background: hsl(234, 89%, 68%); transform: translateY(-2px); box-shadow: 0 6px 15px hsla(234, 89%, 72%, 0.4); }
      .dv-btn-save:active { transform: translateY(0); }
      .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: white; animation: spin 1s linear infinite; display: none; }
      .dv-btn-save.loading .spinner { display: block; }
      .dv-btn-save.loading span { opacity: 0.7; }
      @keyframes spin { to { transform: rotate(360deg); } }
    `;
    shadow.appendChild(style);

    // --- Drawer Construction ---
    // drawerOverlay removed as requested
    
    const drawer = document.createElement('div');
    drawer.className = 'dv-drawer';
    drawer.innerHTML = `
      <div class="dv-drawer-header">
        <h3 class="dv-drawer-title">Drop Zone</h3>
        <button class="dv-close-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div class="dv-drop-area" id="dv-drop-target">
        <svg class="dv-drop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
        <div class="dv-drop-text">Drag items here</div>
        <div class="dv-drop-subtext">Images, Links, or Text</div>
      </div>
      <div class="dv-status-list" id="dv-status-list">
        <!-- Status items will appear here -->
      </div>
    `;

    // drawerOverlay removed as requested
    
    shadow.appendChild(drawer);

    const closeDrawerBtn = drawer.querySelector('.dv-close-btn');
    const dropArea = drawer.querySelector('#dv-drop-target');
    const statusList = drawer.querySelector('#dv-status-list');

    function toggleDrawer() {
      const isOpen = drawer.classList.contains('open');
      if (isOpen) {
        drawer.classList.remove('open');
        // Reset page layout
        document.documentElement.style.marginRight = '';
        document.documentElement.style.width = '';
        document.documentElement.style.transition = '';
      } else {
        drawer.classList.add('open');
        // Shift page content
        document.documentElement.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        document.documentElement.style.marginRight = '320px';
        document.documentElement.style.width = 'calc(100% - 320px)';
      }
    }

    closeDrawerBtn.onclick = toggleDrawer;
    // drawerOverlay removed as requested

    // --- Drag & Drop Logic ---
    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, preventDefaults, false);
    });

    dropArea.addEventListener('dragenter', () => dropArea.classList.add('drag-active'), false);
    dropArea.addEventListener('dragleave', () => dropArea.classList.remove('drag-active'), false);
    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
      dropArea.classList.remove('drag-active');
      const dt = e.dataTransfer;
      const files = dt.files;

      if (files.length > 0) {
        handleFiles(files);
      } else {
        // Try to extract data
        const html = dt.getData('text/html');
        const text = dt.getData('text/plain');
        
        // Check for image in HTML
        if (html) {
           const parser = new DOMParser();
           const doc = parser.parseFromString(html, 'text/html');
           const img = doc.querySelector('img');
           if (img && img.src) {
               addStatusItem(`Saving Image...`, 'spinner');
               chrome.runtime.sendMessage({
                   action: "trigger-capture-with-data",
                   data: { title: "Dropped Image", content: img.src, type: "image", notes: `Source: ${img.src}` }
               }, () => addStatusItem(`Saved Image`));
               return;
           }
        }

        if (text) {
             handleText(text, html);
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
             : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'}
         </div>
         <div class="dv-status-text">${text}</div>
       `;
       statusList.prepend(item);
       setTimeout(() => item.remove(), 5000);
    }

    function handleFiles(files) {
      ([...files]).forEach(file => {
          addStatusItem(`Uploading ${file.name}...`, 'spinner');
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onloadend = () => {
              chrome.runtime.sendMessage({
                  action: "upload-file-from-content",
                  data: {
                      name: file.name,
                      type: file.type,
                      dataUrl: reader.result
                  }
              }, (response) => {
                  if (response && response.success) {
                      addStatusItem(`Saved ${file.name}`);
                  } else {
                      addStatusItem(`Failed ${file.name}`, 'error');
                  }
              });
          };
      });
    }

    function handleText(text, html) {
        // Simple heuristic for links
        if (text.startsWith('http')) {
            addStatusItem(`Saving Link...`, 'spinner');
            chrome.runtime.sendMessage({ 
                action: "trigger-capture-with-data",
                data: { title: "Dropped Link", content: text, type: "link" }
            }, (res) => {
                addStatusItem(`Saved Link`);
            });
        } else {
            addStatusItem(`Saving Note...`, 'spinner');
            chrome.runtime.sendMessage({ 
                action: "trigger-capture-with-data",
                data: { title: "Dropped Note", notes: text, type: "note" }
            }, (res) => {
                addStatusItem(`Saved Note`);
            });
        }
    }

    // --- FAB Construction (Modified) ---
    const container = document.createElement('div');
    container.id = 'dropvault-fab-container';
    container.className = 'side-hidden';

    const menu = document.createElement('div');
    menu.className = 'dropvault-fab-menu';

    const actions = [
      { id: 'dv-action-vault', label: 'Open Drop Zone', icon: '<svg class="dropvault-fab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>' },
      { id: 'dv-action-search', label: 'Search', icon: '<svg class="dropvault-fab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>' },
      { id: 'dv-action-capture', label: 'Capture Page', icon: '<svg class="dropvault-fab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>' }
    ];

    actions.forEach(action => {
      const item = document.createElement('button');
      item.className = 'dropvault-fab-item';
      item.setAttribute('data-label', action.label);
      item.innerHTML = action.icon;
      item.onclick = (e) => {
          e.stopPropagation();
          handleAction(action.id);
      };
      menu.appendChild(item);
    });

    const trigger = document.createElement('button');
    trigger.className = 'dropvault-fab-trigger';
    trigger.innerHTML = `
      <svg class="main-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
    `;
    
    let hideTimeout;
    const NORMAL_HIDE_DELAY = 3000;
    const EXPANDED_HIDE_DELAY = 6000;

    function resetHideTimer() {
        clearTimeout(hideTimeout);
        const isExpanded = menu.classList.contains('active');
        const delay = isExpanded ? EXPANDED_HIDE_DELAY : NORMAL_HIDE_DELAY;

        hideTimeout = setTimeout(() => {
            menu.classList.remove('active');
            trigger.classList.remove('active');
            trigger.style.transform = 'rotate(0deg)';
            container.classList.add('side-hidden');
        }, delay);
    }

    container.onmouseenter = () => {
        clearTimeout(hideTimeout);
        container.classList.remove('side-hidden');
        menu.classList.add('active');
        trigger.classList.add('active');
        trigger.style.transform = 'rotate(45deg)';
    };
    
    container.onmouseleave = () => {
        resetHideTimer();
    };

    trigger.onclick = (e) => {
      e.stopPropagation();
      const isActive = trigger.classList.toggle('active');
      menu.classList.toggle('active');
      trigger.style.transform = isActive ? 'rotate(45deg)' : 'rotate(0deg)';
      resetHideTimer();
    };

    container.appendChild(menu);
    container.appendChild(trigger);
    shadow.appendChild(container);

    // --- Modal Construction (Existing) ---
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'dv-modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'dv-modal';
    
    modal.innerHTML = `
      <div class="dv-modal-header">
        <h3 class="dv-modal-title">Save to DropVault</h3>
      </div>
      <div class="dv-form-group">
        <label class="dv-label">Title</label>
        <input type="text" id="dv-input-title" class="dv-input" placeholder="Page Title">
      </div>
      <div class="dv-form-group">
        <label class="dv-label">Tags</label>
        <input type="text" id="dv-input-tags" class="dv-input" placeholder="research, design, inspiration">
      </div>
      <div class="dv-form-group">
        <label class="dv-label">Notes</label>
        <textarea id="dv-input-notes" class="dv-textarea" placeholder="Add some context..."></textarea>
      </div>
      <div class="dv-actions">
        <button id="dv-btn-cancel" class="dv-btn dv-btn-cancel">Cancel</button>
        <button id="dv-btn-save" class="dv-btn dv-btn-save">
          <div class="spinner"></div>
          <span>Save Item</span>
        </button>
      </div>
    `;

    modalOverlay.appendChild(modal);
    shadow.appendChild(modalOverlay);
    
    const cancelBtn = modal.querySelector('#dv-btn-cancel');
    const saveBtn = modal.querySelector('#dv-btn-save');
    const titleInput = modal.querySelector('#dv-input-title');
    const tagsInput = modal.querySelector('#dv-input-tags');
    const notesInput = modal.querySelector('#dv-input-notes');

    function closeModal() {
      modalOverlay.classList.remove('open');
      saveBtn.classList.remove('loading');
      saveBtn.disabled = false;
    }

    cancelBtn.onclick = closeModal;
    modalOverlay.onclick = (e) => {
      if (e.target === modalOverlay) closeModal();
    };

    saveBtn.onclick = () => {
      const title = titleInput.value;
      const tags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
      const notes = notesInput.value;

      saveBtn.classList.add('loading');
      saveBtn.disabled = true;

      chrome.runtime.sendMessage({ 
        action: "trigger-capture-with-data",
        data: { title, tags, notes }
      }, (response) => {
        closeModal();
      });
    };
    
    window.openDropVaultModal = () => {
      titleInput.value = document.title;
      tagsInput.value = '';
      notesInput.value = '';
      modalOverlay.classList.add('open');
      setTimeout(() => titleInput.focus(), 100);
    };

    resetHideTimer();
  }

  function handleAction(id) {
    const container = shadowRoot.getElementById('dropvault-fab-container');
    const trigger = container.querySelector('.dropvault-fab-trigger');
    const menu = container.querySelector('.dropvault-fab-menu');

    if (id === 'dv-action-vault') {
      // Toggle Drawer
      const shadow = document.getElementById('dropvault-root').shadowRoot;
      const drawer = shadow.querySelector('.dv-drawer');
      // const overlay = shadow.querySelector('.dv-drawer-overlay'); // Removed overlay

      if (drawer.classList.contains('open')) {
        drawer.classList.remove('open');
        // Reset page layout
        document.documentElement.style.marginRight = '';
        document.documentElement.style.transition = '';
      } else {
        drawer.classList.add('open');
        // Shift page content
        document.documentElement.style.transition = 'margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        document.documentElement.style.marginRight = '320px';
      }

      // Instantly hide FAB
      trigger.classList.remove('active');
      menu.classList.remove('active');
      trigger.style.transform = 'rotate(0deg)';
      container.classList.add('side-hidden');
      
    } else if (id === 'dv-action-search') {
      window.open('http://localhost:5173', '_blank');
      // Standard close
      trigger.classList.remove('active');
      menu.classList.remove('active');
      trigger.style.transform = 'rotate(0deg)';

    } else if (id === 'dv-action-capture') {
      if (window.openDropVaultModal) window.openDropVaultModal();
      // Standard close
      trigger.classList.remove('active');
      menu.classList.remove('active');
      trigger.style.transform = 'rotate(0deg)';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
  
  const observer = new MutationObserver(() => {
    if (!document.getElementById('dropvault-root')) inject();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "open-modal") {
      inject();
      if (window.openDropVaultModal) window.openDropVaultModal();
    }
  });

})();