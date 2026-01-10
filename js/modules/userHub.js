import { socialService } from '../services/socialService.js';
import { bus } from '../core/eventBus.js';
export function initUserHub() {
    const container = document.getElementById('leaderboard');
    if (!container) return;
    bus.on('navigation:changed', async (id) => {
        if (id === 'leaderboard') {
            const tokens = await socialService.getUserTokens();
            container.innerHTML = `<h3>Meus Projetos</h3>` + tokens.map(t => `<div class="card">${t.name} - ${t.address}</div>`).join('');
        }
    });
}
