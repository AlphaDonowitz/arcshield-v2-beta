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
    function navigateTo(targetId) {
        // Atualiza Botões
        buttons.forEach(btn => {
            if(btn.dataset.target === targetId) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // Atualiza Seções
        sections.forEach(sec => {
            if(sec.id === targetId) sec.classList.add('active');
            else sec.classList.remove('active');
        });

        // Atualiza Título
        if(titleEl) titleEl.innerText = titles[targetId] || 'Dashboard';
        
        // Emite evento caso algum módulo precise saber que a página mudou
        bus.emit('navigation:changed', targetId);
    }

    // Listeners
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            navigateTo(target);
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