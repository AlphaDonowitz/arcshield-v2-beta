import { initNavigation } from './ui/uiManager.js';
import { initSidebar } from './ui/sidebar.js';
import { initProfileUI } from './ui/profileUI.js';
import { web3Service } from './services/web3Service.js';
import { socialService } from './services/socialService.js';
import { bus } from '../core/eventBus.js';

// Módulos
import { initTokenFactory } from './modules/tokenFactory.js';
import { initUserHub } from './modules/userHub.js'; 
import { initMultisender } from './modules/multisender.js';
import { initStudio } from './modules/studio.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("System: Booting Arc Shield v16.2 (HD Generator Engine)...");

    try {
        // 1. Inicializa UI Core
        initNavigation();
        initSidebar();
        initProfileUI();
        
        // 2. Inicializa Módulos
        initTokenFactory(); 
        initUserHub(); 
        initMultisender();
        initStudio(); 
        
        if(window.lucide) window.lucide.createIcons();
    } catch (error) {
        console.error("Critical UI Error during boot:", error);
    }

    // 3. Inicializa Web3
    await web3Service.init();

    // 4. Listeners Globais
    bus.on('wallet:connected', (data) => {
        socialService.loadUserProfile(data.address);
    });

    bus.on('notification:error', (msg) => { alert("⚠️ " + msg); });
    bus.on('notification:success', (msg) => { alert("✅ " + msg); });
    bus.on('notification:info', (msg) => { console.log("App Info:", msg); });

    console.log("System: Ready & Listening.");
});
