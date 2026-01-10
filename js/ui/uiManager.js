import { bus } from '../core/eventBus.js';

export function initNavigation() {
    const btnEnter = document.getElementById('btnEnterApp');
    const landing = document.getElementById('landingPage');
    const layout = document.getElementById('dashboardLayout');

    if (btnEnter) {
        btnEnter.onclick = (e) => {
            e.preventDefault();
            if (landing) {
                landing.style.opacity = '0';
                setTimeout(() => { landing.style.display = 'none'; }, 500);
            }
            if (layout) layout.style.display = 'flex';
        };
    }

    const buttons = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.page-section');
    const titleEl = document.getElementById('pageTitle');
    const titles = {
        'studio': 'NFT Drop Manager',
        'token-launcher': 'Token Factory',
        'multisender': 'Smart Drop',
        'locker': 'Liquidity Locker',
        'vesting': 'Vesting Schedule',
        'leaderboard': 'User Hub'
    };

    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = btn.dataset.target;
            if (!target) return;
            if (!btn.getAttribute('href')) e.preventDefault();

            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            sections.forEach(s => {
                s.classList.remove('active');
                if (s.id === target) s.classList.add('active');
            });

            if (titleEl) titleEl.innerText = titles[target] || 'Dashboard';
            bus.emit('navigation:changed', target);
        });
    });
}
js/ui/sidebar.js e js/ui/profileUI.js
Componentes de conexão e perfil.
// js/ui/sidebar.js
import { web3Service } from '../services/web3Service.js';
import { bus } from '../core/eventBus.js';

export function initSidebar() {
    const btn = document.getElementById('btnConnect');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        if (!web3Service.isConnected) {
            btn.innerText = "Conectando...";
            await web3Service.connectWallet();
        } else if (confirm("Desconectar carteira?")) {
            await web3Service.disconnect();
        }
    });
    bus.on('wallet:connected', (data) => {
        btn.style.borderColor = 'var(--success-green)';
        btn.style.background = 'rgba(34, 197, 94, 0.1)';
    });
}

// js/ui/profileUI.js
import { bus } from '../core/eventBus.js';
export function initProfileUI() {
    const container = document.getElementById('userProfileSnippet');
    if (!container) return;
    bus.on('profile:loaded', (user) => {
        container.innerHTML = `<span class="username">${user.username}</span><span class="xp">${user.points || 0} XP</span>`;
    });
}
