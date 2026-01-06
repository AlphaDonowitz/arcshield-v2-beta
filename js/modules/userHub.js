import { socialService } from '../services/socialService.js';
import { web3Service } from '../services/web3Service.js';
import { bus } from '../core/eventBus.js';

export function initUserHub() {
    const container = document.getElementById('leaderboard'); 
    if (!container) return;

    // 1. Carrega quando o perfil é identificado (Login)
    bus.on('profile:loaded', async () => {
        // Apenas carrega se a aba estiver ativa para economizar recursos
        if(container.classList.contains('active')) {
            await renderUserHub(container);
        }
    });

    // 2. CORREÇÃO: Carrega sempre que o usuário clica na aba "User Hub"
    bus.on('navigation:changed', async (targetId) => {
        if (targetId === 'leaderboard') {
            await renderUserHub(container);
        }
    });
}

async function renderUserHub(container) {
    // Spinner de carregamento
    container.innerHTML = `
        <div class="card" style="display:flex; justify-content:center; align-items:center; min-height:200px;">
            <div style="text-align:center;">
                <i data-lucide="loader-2" class="spin" style="width:32px; height:32px; margin-bottom:10px; color:var(--primary-blue)"></i>
                <p>Buscando seus projetos...</p>
            </div>
        </div>`;
    if(window.lucide) window.lucide.createIcons();
    
    // Busca dados frescos do Supabase
    const tokens = await socialService.getUserTokens();

    // Estado Vazio
    if (tokens.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align:center; padding:40px;">
                <i data-lucide="ghost" style="width:48px; height:48px; color:#666; margin-bottom:10px;"></i>
                <h3>Nenhum projeto encontrado</h3>
                <p class="bio-text">Você ainda não criou nenhum token ou NFT na Arc Shield.</p>
                <button class="btn-primary" style="max-width:200px; margin:0 auto;" onclick="document.querySelector('[data-target=token-launcher]').click()">
                    Criar meu primeiro Token
                </button>
            </div>`;
        if(window.lucide) window.lucide.createIcons();
        return;
    }

    // Renderiza Lista
    let html = `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3>Gerenciador de Projetos</h3>
                <button class="btn-secondary small" onclick="document.querySelector('[data-target=leaderboard]').click()">
                    <i data-lucide="refresh-cw" style="width:12px; margin-right:5px;"></i> Atualizar
                </button>
            </div>
            <div class="token-list">
    `;

    tokens.forEach(t => {
        const isERC20 = t.contract_type === 'ERC20';
        
        // Estrutura padrão CoinGecko
        const listingData = {
            id: t.symbol.toLowerCase().replace(/\s+/g, '-'),
            symbol: t.symbol,
            name: t.name,
            asset_platform_id: "arc-network",
            platforms: { "arc-network": t.address },
            detail_platforms: { "arc-network": { "decimal_place": 18, "contract_address": t.address } }
        };
        const jsonString = encodeURIComponent(JSON.stringify(listingData, null, 2));

        html += `
            <div style="background:#18181b; padding:20px; border-radius:8px; border:1px solid #27272a; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; align-items:start; flex-wrap:wrap; gap:10px;">
                    <div style="display:flex; gap:15px; align-items:center;">
                        <img src="${t.logo_url || 'https://robohash.org/'+t.address+'?set=set1'}" style="width:48px; height:48px; border-radius:8px; background:#000;">
                        <div>
                            <div style="font-weight:700; font-size:1.1rem; color:#fff;">${t.name} <span class="badge">${t.contract_type}</span></div>
                            <div class="mono" style="color:#666; font-size:0.8rem; margin-top:5px;">${t.address}</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <a href="${web3Service.getNetworkConfig().explorer}/address/${t.address}" target="_blank" class="btn-secondary small" style="text-decoration:none;">
                            <i data-lucide="external-link" style="width:14px;"></i> Explorer
                        </a>
                    </div>
                </div>

                <hr style="border:0; border-top:1px solid #27272a; margin:15px 0;">
                
                <label style="font-size:0.7rem; color:#666; font-weight:700; margin-bottom:8px; display:block;">AÇÕES RÁPIDAS</label>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:10px;">
                    
                    <a href="data:text/json;charset=utf-8,${jsonString}" download="${t.symbol}_listing.json" class="btn-secondary small" style="justify-content:center; text-decoration:none;">
                        <i data-lucide="file-json" style="width:14px; margin-right:5px;"></i> JSON (CoinGecko)
                    </a>

                    ${isERC20 ? `
                    <button class="btn-primary small" id="btnAirdrop_${t.address}" style="justify-content:center;">
                        <i data-lucide="send" style="width:14px; margin-right:5px;"></i> Enviar Airdrop
                    </button>` : ''}

                    <button class="btn-secondary small" onclick="alert('A Bridge para Mainnet estará disponível na v2 do protocolo.')" style="justify-content:center;">
                        <i data-lucide="arrow-left-right" style="width:14px; margin-right:5px;"></i> Bridge
                    </button>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    container.innerHTML = html;

    // Listeners dos botões de Airdrop
    tokens.forEach(t => {
        const btn = document.getElementById(`btnAirdrop_${t.address}`);
        if(btn) {
            btn.addEventListener('click', () => {
                // Navega para a aba Multisender
                const multiBtn = document.querySelector('[data-target=multisender]');
                if(multiBtn) multiBtn.click();
                
                // Emite evento avisando que queremos usar este token
                setTimeout(() => {
                    bus.emit('multisender:selectToken', { address: t.address, symbol: t.symbol });
                }, 300);
            });
        }
    });

    if(window.lucide) window.lucide.createIcons();
}
