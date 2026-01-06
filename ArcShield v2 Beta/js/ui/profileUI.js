import { bus } from '../core/eventBus.js';

export function initProfileUI() {
    const container = document.getElementById('userProfileSnippet');
    if(!container) return;

    // Renderiza o HTML do perfil
    const render = (user) => {
        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; background: var(--bg-card); padding: 5px 12px; border-radius: 20px; border: 1px solid var(--border-color);">
                <div style="text-align: right;">
                    <div style="font-size: 0.8rem; font-weight: 700; color: #fff;">${user.username}</div>
                    <div style="font-size: 0.7rem; color: var(--primary-blue);">${user.points || 0} XP</div>
                </div>
                <img src="${user.avatar_url}" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid #333; background: #000;">
            </div>
        `;
    };

    // Listeners
    bus.on('profile:loaded', (user) => render(user));
    bus.on('profile:updated', (user) => render(user));
    
    // Limpa UI ao desconectar
    bus.on('wallet:disconnected', () => {
        container.innerHTML = '';
    });
}