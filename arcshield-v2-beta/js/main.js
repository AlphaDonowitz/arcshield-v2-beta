import { initNavigation } from './ui/uiManager.js';
import { initSidebar } from './ui/sidebar.js';
import { initProfileUI } from './ui/profileUI.js';
import { web3Service } from './services/web3Service.js';
import { socialService } from './services/socialService.js';
import { bus } from './core/eventBus.js';

// Importação dos Módulos
import { initTokenFactory } from './modules/tokenFactory.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("System: Booting Arc Shield v16...");

    try {
        // 1. Inicializa UI Core
        initNavigation();
        initSidebar();
        initProfileUI();
        
        // 2. Inicializa Módulos Funcionais
        initTokenFactory(); 
        // initStudio(); -> Futuro
        // initMultisender(); -> Futuro

        if(window.lucide) window.lucide.createIcons();
    } catch (error) {
        console.error("Critical UI Error during boot:", error);
    }

    // 3. Inicializa Web3
    await web3Service.init();

    // 4. Listeners Globais
    bus.on('wallet:connected', (data) => {
        console.log("Main: Wallet connected, initializing social profile...");
        socialService.loadUserProfile(data.address);
    });

    bus.on('notification:error', (msg) => {
        alert("⚠️ " + msg); 
    });

    bus.on('notification:success', (msg) => {
        // Por enquanto usa alert, depois criaremos um Toast bonito
        console.log("SUCCESS:", msg);
        alert("✅ " + msg);
    });

    bus.on('notification:info', (msg) => {
        console.log("App Info:", msg);
    });

    console.log("System: Ready & Listening.");
});