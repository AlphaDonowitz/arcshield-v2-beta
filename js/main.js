import { bus } from './core/eventBus.js';
import { initNavigation } from './ui/uiManager.js';
import { initSidebar } from './ui/sidebar.js';
import { initProfileUI } from './ui/profileUI.js';
import { web3Service } from './services/web3Service.js';
import { socialService } from './services/socialService.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("System: Booting Arc Shield v17 (Golden Build)...");

    // 1. Interface (Funciona sem Web3)
    try {
        initNavigation();
        initSidebar();
        initProfileUI();
        if(window.lucide) window.lucide.createIcons();
    } catch (e) { console.error("UI Init Error", e); }

    // 2. Web3 (Fundamental)
    try {
        await web3Service.init();
    } catch (e) { console.error("Web3 Init Error", e); }

    // 3. Carregamento Seguro dos Módulos
    const loadModule = async (path, initFunction) => {
        try {
            const module = await import(path);
            if (module[initFunction]) {
                module[initFunction]();
            }
        } catch (e) {
            console.warn(`Módulo ${path} não carregado (possível erro interno ou 404):`, e);
        }
    };

    await loadModule('./modules/tokenFactory.js', 'initTokenFactory');
    await loadModule('./modules/userHub.js', 'initUserHub');
    await loadModule('./modules/multisender.js', 'initMultisender');
    await loadModule('./modules/studio.js', 'initStudio');
    await loadModule('./modules/locker.js', 'initLocker');
    await loadModule('./modules/vesting.js', 'initVesting');

    // 4. Listeners Globais
    bus.on('wallet:connected', (data) => socialService.loadUserProfile(data.address));
    bus.on('notification:error', (msg) => alert("⚠️ " + msg));
    bus.on('notification:success', (msg) => alert("✅ " + msg));
    bus.on('notification:info', (msg) => console.log("Info:", msg));

    console.log("System: Ready.");
});
