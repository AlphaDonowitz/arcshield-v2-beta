import { bus } from '../core/eventBus.js';

export function initNavigation() {
    console.log("UI: Inicializando navegação...");

    // --- 1. Lógica da Landing Page (PRIORIDADE) ---
    const btnEnter = document.getElementById('btnEnterApp');
    const landingPage = document.getElementById('landingPage');
    const dashboardLayout = document.getElementById('dashboardLayout');

    if (btnEnter && landingPage && dashboardLayout) {
        console.log("UI: Botão de entrada encontrado via JS.");
        
        btnEnter.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("UI: Entrando no App...");
            
            // Oculta Landing Page
            landingPage.style.opacity = '0';
            setTimeout(() => {
                landingPage.style.display = 'none';
            }, 300); // Pequena transição suave

            // Mostra Dashboard
            dashboardLayout.style.display = 'flex';
        });
    } else {
        console.error("UI CRÍTICO: Elementos da Landing Page não encontrados no HTML.");
    }

    // --- 2. Lógica das Abas (Navegação Interna) ---
    const buttons = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.page-section');
    const titleEl = document.getElementById('pageTitle');

    const titles = { 
        'studio': 'NFT Studio HD', 
        'token-launcher': 'Token Factory', 
        'multisender': 'Smart Drop', 
        'locker': 'Liquidity Locker', 
        'vesting': 'Vesting Schedule', 
        'bridge': 'CCTP Bridge', 
        'leaderboard': 'User Hub' 
    };

    function navigateTo(targetId, triggerButton) {
        // Atualiza Botões
        buttons.forEach(btn => {
            btn.classList.remove('active');
            // Marca ativo se for o botão clicado OU se o target coincidir
            if(btn === triggerButton || btn.dataset.target === targetId) {
                btn.classList.add('active');
            }
        });

        // Atualiza Seções
        sections.forEach(sec => {
            sec.classList.remove('active');
            if(sec.id === targetId) {
                sec.classList.add('active');
            }
        });

        // Atualiza Título
        if(titleEl) titleEl.innerText = titles[targetId] || 'Dashboard';
        
        // Emite evento global
        console.log(`UI: Navegando para ${targetId}`);
        bus.emit('navigation:changed', targetId);
    }

    // Listeners de Clique nas Abas
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Se for um link real (href), deixa navegar. Se não, previne.
            if (!btn.getAttribute('href')) {
                e.preventDefault();
            }
            const target = btn.dataset.target;
            if(target) navigateTo(target, btn);
        });
    });
}
