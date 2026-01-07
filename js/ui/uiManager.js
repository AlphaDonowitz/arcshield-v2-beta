import { bus } from '../core/eventBus.js';

export function initNavigation() {
    console.log("UI: Procurando botão de entrada...");

    // 1. Landing Page
    const btnEnter = document.getElementById('btnEnterApp');
    const landingPage = document.getElementById('landingPage');
    const dashboardLayout = document.getElementById('dashboardLayout');

    if (btnEnter) {
        btnEnter.onclick = function(e) {
            e.preventDefault();
            if (landingPage) {
                landingPage.style.opacity = '0';
                setTimeout(() => { landingPage.style.display = 'none'; }, 500);
            }
            if (dashboardLayout) dashboardLayout.style.display = 'flex';
        };
    }

    // 2. Navegação Lateral
    const buttons = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.page-section');
    const titleEl = document.getElementById('pageTitle');

    // Mapeamento de Títulos Atualizado
    const titles = { 
        'studio': 'NFT Drop Manager', // <--- Atualizado
        'token-launcher': 'Token Factory', 
        'multisender': 'Smart Drop', 
        'locker': 'Liquidity Locker', 
        'vesting': 'Vesting Schedule', 
        'bridge': 'CCTP Bridge', 
        'leaderboard': 'User Hub' 
    };

    function navigateTo(targetId, triggerButton) {
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if(btn === triggerButton || btn.dataset.target === targetId) {
                btn.classList.add('active');
            }
        });

        sections.forEach(sec => {
            sec.classList.remove('active');
            if(sec.id === targetId) sec.classList.add('active');
        });

        if(titleEl) titleEl.innerText = titles[targetId] || 'Dashboard';
        
        bus.emit('navigation:changed', targetId);
    }

    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = btn.dataset.target;
            if(target) {
                if(!btn.getAttribute('href')) e.preventDefault();
                navigateTo(target, btn);
            }
        });
    });
}
