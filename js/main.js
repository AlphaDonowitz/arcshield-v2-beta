import { bus } from './core/eventBus.js';
import { initNavigation } from './ui/uiManager.js';
import { initSidebar } from './ui/sidebar.js';
import { initProfileUI } from './ui/profileUI.js';
import { web3Service } from './services/web3Service.js';
import { socialService } from './services/socialService.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("System: Booting Arc Shield v16.5 (Locker Module)...");

    try {
        initNavigation();
        initSidebar();
        initProfileUI();
        if(window.lucide) window.lucide.createIcons();
    } catch (error) {
        console.error("FATAL: UI Error.", error);
    }

    // Carregamento Dinâmico de Módulos
    try {
        const module = await import('./modules/tokenFactory.js');
        module.initTokenFactory();
    } catch (e) { console.error("TokenFactory Error:", e); }

    try {
        const module = await import('./modules/userHub.js');
        module.initUserHub();
    } catch (e) { console.error("UserHub Error:", e); }

    try {
        const module = await import('./modules/multisender.js');
        module.initMultisender();
    } catch (e) { console.error("Multisender Error:", e); }

    try {
        const module = await import('./modules/studio.js');
        module.initStudio();
    } catch (e) { console.error("Studio Error:", e); }

    // --- NOVO: LOCKER ---
    try {
        const module = await import('./modules/locker.js');
        module.initLocker();
        console.log("Module: Locker Loaded");
    } catch (e) { console.error("Locker Error:", e); }

    try {
        await web3Service.init();
        bus.on('wallet:connected', (data) => socialService.loadUserProfile(data.address));
        bus.on('notification:error', (msg) => alert("⚠️ " + msg));
        bus.on('notification:success', (msg) => alert("✅ " + msg));
        bus.on('notification:info', (msg) => console.log("Info:", msg));
    } catch (e) {
        console.error("Web3 Init Error", e);
    }
});
