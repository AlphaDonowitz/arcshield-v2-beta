// js/main.js - Versão Blindada com Carregamento Dinâmico

// Importações Críticas (Core e UI)
// Estas precisam funcionar para o site abrir
import { bus } from './core/eventBus.js';
import { initNavigation } from './ui/uiManager.js';
import { initSidebar } from './ui/sidebar.js';
import { initProfileUI } from './ui/profileUI.js';
import { web3Service } from './services/web3Service.js';
import { socialService } from './services/socialService.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("System: Booting Arc Shield v16.3 (Safe Mode)...");

    // 1. Inicializa a Interface (PRIORIDADE MÁXIMA)
    // Se isso falhar, o botão não funciona.
    try {
        console.log("System: Iniciando UI Manager...");
        initNavigation(); // <--- Isso ativa o botão da Landing Page
        initSidebar();
        initProfileUI();
        
        if(window.lucide) window.lucide.createIcons();
    } catch (error) {
        console.error("FATAL: Erro ao iniciar UI. O site pode não responder.", error);
        alert("Erro crítico de sistema. Verifique o console.");
    }

    // 2. Carregamento Seguro dos Módulos (Feature Flags)
    // Se um módulo quebrar, o resto do site continua funcionando.
    
    // -> Carrega Token Factory
    try {
        const module = await import('./modules/tokenFactory.js');
        module.initTokenFactory();
        console.log("Module: Token Factory Loaded");
    } catch (e) { console.error("Falha ao carregar Token Factory:", e); }

    // -> Carrega User Hub
    try {
        const module = await import('./modules/userHub.js');
        module.initUserHub();
        console.log("Module: User Hub Loaded");
    } catch (e) { console.error("Falha ao carregar User Hub:", e); }

    // -> Carrega Multisender
    try {
        const module = await import('./modules/multisender.js');
        module.initMultisender();
        console.log("Module: Multisender Loaded");
    } catch (e) { console.error("Falha ao carregar Multisender:", e); }

    // -> Carrega Studio (O mais complexo e propenso a erros)
    try {
        const module = await import('./modules/studio.js');
        module.initStudio();
        console.log("Module: Studio Loaded");
    } catch (e) { 
        console.error("Falha ao carregar Studio:", e);
        // Opcional: Avisar na UI que o módulo falhou
        const studioCard = document.querySelector('#studio .card');
        if(studioCard) studioCard.innerHTML = `<h3>Erro no Módulo</h3><p>Não foi possível carregar o Studio. Erro: ${e.message}</p>`;
    }

    // 3. Inicializa Web3 e Listeners Globais
    try {
        await web3Service.init();

        bus.on('wallet:connected', (data) => {
            socialService.loadUserProfile(data.address);
        });

        bus.on('notification:error', (msg) => { alert("⚠️ " + msg); });
        bus.on('notification:success', (msg) => { alert("✅ " + msg); });
        bus.on('notification:info', (msg) => { console.log("Info:", msg); });
        
    } catch (e) {
        console.error("System: Erro no Web3 Init", e);
    }

    console.log("System: Ready.");
});
