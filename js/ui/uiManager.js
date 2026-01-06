import { bus } from '../core/eventBus.js';

export function initNavigation() {
    const buttons = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.page-section');
    const titleEl = document.getElementById('pageTitle');

    const titles = { 
        'studio': 'NFT Studio AI', 
        'token-launcher': 'Token Factory', 
        'multisender': 'Smart Drop', 
        'locker': 'Liquidity Locker', 
        'vesting': 'Vesting Schedule', 
        'bridge': 'CCTP Bridge', 
        'leaderboard': 'User Hub' 
    };

    // Função de Navegação Interna
    function navigateTo(targetId, triggerButton) {
        // 1. Atualiza Visual dos Botões
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if(btn === triggerButton || btn.dataset.target === targetId) {
                btn.classList.add('active');
            }
        });

        // 2. Atualiza Visual das Seções
        sections.forEach(sec => {
            sec.classList.remove('active');
            if(sec.id === targetId) {
                sec.classList.add('active');
            }
        });

        // 3. Atualiza Título
        if(titleEl) titleEl.innerText = titles[targetId] || 'Dashboard';
        
        // 4. CRUCIAL: Avisa todo o sistema que a página mudou
        // O User Hub escuta isso para recarregar a lista
        console.log(`UI: Navegando para ${targetId}`);
        bus.emit('navigation:changed', targetId);
    }

    // Listeners de Clique
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Previne comportamento padrão se for link
            e.preventDefault();
            const target = btn.dataset.target;
            if(target) navigateTo(target, btn);
        });
    });

    // Landing Page
    const btnEnter = document.getElementById('btnEnterApp');
    if(btnEnter) {
        btnEnter.addEventListener('click', () => {
            document.getElementById('landingPage').style.display = 'none';
            document.getElementById('dashboardLayout').style.display = 'flex';
        });
    }

    console.log("UI: Navigation initialized");
}
