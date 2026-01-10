(function() {
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

    const style = document.createElement('style');
    style.textContent = `
      #dropvault-fab-container {
        position: fixed;
        bottom: 32px;
        right: 12px;
        display: flex;
        flex-direction: column-reverse;
        align-items: center;
        gap: 12px;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        pointer-events: auto;
        transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      }

      #dropvault-fab-container.side-hidden {
        transform: translateX(52px); 
      }

      .dropvault-fab-trigger {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4f46e5, #818cf8) !important;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: none !important;
        padding: 0;
        z-index: 2;
        opacity: 0.85;
      }

      #dropvault-fab-container:hover .dropvault-fab-trigger {
        opacity: 1;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
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
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
        color: #4f46e5;
        border-color: #4f46e5 !important;
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
    `;
    shadow.appendChild(style);

    const container = document.createElement('div');
    container.id = 'dropvault-fab-container';
    container.className = 'side-hidden';

    const menu = document.createElement('div');
    menu.className = 'dropvault-fab-menu';

    const actions = [
      { id: 'dv-action-vault', label: 'Open Vault', icon: '<svg class="dropvault-fab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>' },
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
        // Auto-expand on hover
        menu.classList.add('active');
        trigger.classList.add('active');
        trigger.style.transform = 'rotate(45deg)';
    };
    
    container.onmouseleave = () => {
        resetHideTimer();
    };

    // Keep click as a manual toggle fallback
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

    resetHideTimer();

    function handleAction(id) {
      if (id === 'dv-action-vault') {
        window.open('http://localhost:5173', '_blank');
      } else if (id === 'dv-action-search') {
        window.open('http://localhost:5173', '_blank');
      } else if (id === 'dv-action-capture') {
        chrome.runtime.sendMessage({ action: "trigger-capture" });
      }
      
      trigger.classList.remove('active');
      menu.classList.toggle('active');
      trigger.style.transform = 'rotate(0deg)';
      resetHideTimer();
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

})();
