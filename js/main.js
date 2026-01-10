import { bus } from './core/eventBus.js';
import { initNavigation } from './ui/uiManager.js';
import { initSidebar } from './ui/sidebar.js';
import { initProfileUI } from './ui/profileUI.js';
import { web3Service } from './services/web3Service.js';
import { socialService } from './services/socialService.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("System: Booting ArcShield v17.0 (Stable)...");
    try {
        initNavigation();
        initSidebar();
        initProfileUI();
        if (window.lucide) window.lucide.createIcons();
    } catch (e) { console.error("Erro na UI:", e); }

    try { await web3Service.init(); } catch (e) { console.error("Web3 Offline"); }

    const load = async (path, fn) => {
        try { const m = await import(path); if (m[fn]) m[fn](); } catch (e) { console.warn(`Módulo ${path} falhou.`); }
    };

    await load('./modules/tokenFactory.js', 'initTokenFactory');
    await load('./modules/userHub.js', 'initUserHub');
    await load('./modules/multisender.js', 'initMultisender');
    await load('./modules/studio.js', 'initStudio');
    await load('./modules/locker.js', 'initLocker');

    bus.on('wallet:connected', (data) => socialService.loadUserProfile(data.address));
});
