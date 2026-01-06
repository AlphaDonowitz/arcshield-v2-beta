import { initNavigation } from './ui/uiManager.js';
import { initSidebar } from './ui/sidebar.js';
import { initProfileUI } from './ui/profileUI.js';
import { web3Service } from './services/web3Service.js';
import { socialService } from './services/socialService.js';
import { bus } from './core/eventBus.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("System: Booting Arc Shield v16...");

    // 1. Inicializa Elementos de Interface (UI)
    try {
        initNavigation();
        initSidebar();
        initProfileUI();
        
        // Inicializa ícones Lucide se disponível
        if(window.lucide) window.lucide.createIcons();
    } catch (error) {
        console.error("Critical UI Error during boot:", error);
    }

    // 2. Inicializa Serviços Core (Web3)
    // O Web3Service verificará automaticamente se já existe uma sessão salva
    await web3Service.init();

    // 3. Orquestração de Eventos (O "Cérebro" lógico)
    
    // QUANDO a carteira conecta -> ENTÃO carregue o perfil social
    bus.on('wallet:connected', (data) => {
        console.log("Main: Wallet connected, initializing social profile...");
        socialService.loadUserProfile(data.address);
    });

    // QUANDO houver erro -> ENTÃO mostre um alerta (Futuro: Toast Notification)
    bus.on('notification:error', (msg) => {
        console.error("App Notification:", msg);
        alert(msg); 
    });

    // QUANDO houver info -> ENTÃO log no console
    bus.on('notification:info', (msg) => {
        console.log("App Info:", msg);
    });

    console.log("System: Ready & Listening.");
});