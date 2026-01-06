import { web3Service } from '../services/web3Service.js';
import { socialService } from '../services/socialService.js';
import { bus } from '../core/eventBus.js';

export function initTokenFactory() {
    const container = document.getElementById('token-launcher');
    if (!container) return;

    // 1. Renderiza o Formulário (HTML Injection)
    container.innerHTML = `
        <div class="card">
            <div class="card-header-icon"><i data-lucide="coins"></i></div>
            <h3>Token Factory</h3>
            <p class="bio-text">Crie sua própria criptomoeda na Arc Network em segundos. Sem código.</p>
            
            <div class="form-grid">
                <div>
                    <label>Nome do Token</label>
                    <input type="text" id="tfName" placeholder="Ex: Bitcoin Arc">
                </div>
                <div>
                    <label>Símbolo</label>
                    <input type="text" id="tfSymbol" placeholder="Ex: BTC">
                </div>
                <div class="full-width">
                    <label>Supply Inicial</label>
                    <input type="number" id="tfSupply" placeholder="Ex: 1000000">
                </div>
            </div>

            <button id="btnDeployToken" class="btn-primary full mt-4">
                <i data-lucide="rocket"></i> Criar Token
            </button>
            
            <div id="tfResult" style="display:none; margin-top:20px;" class="code-block"></div>
        </div>
    `;

    // Atualiza ícones recém injetados
    if(window.lucide) window.lucide.createIcons();

    // 2. Lógica do Botão
    const btn = document.getElementById('btnDeployToken');
    btn.addEventListener('click', async () => {
        if (!web3Service.isConnected) {
            bus.emit('notification:error', "Conecte sua carteira primeiro!");
            return;
        }

        const name = document.getElementById('tfName').value;
        const symbol = document.getElementById('tfSymbol').value;
        const supply = document.getElementById('tfSupply').value;

        if (!name || !symbol || !supply) {
            bus.emit('notification:error', "Preencha todos os campos.");
            return;
        }

        try {
            btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Confirmando...`;
            btn.disabled = true;

            // Instancia o contrato
            const factory = web3Service.getContract('tokenFactory');
            
            // Envia Transação
            const tx = await factory.createToken(name, symbol, supply);
            
            bus.emit('notification:info', "Transação enviada. Aguardando confirmação...");
            
            // Aguarda Mineração
            const receipt = await tx.wait();

            // Captura o endereço do novo token nos logs de evento
            let newTokenAddress = null;
            // Varre os logs para achar o evento TokenCreated
            for (const log of receipt.logs) {
                try {
                    const parsed = factory.interface.parseLog(log);
                    if (parsed.name === 'TokenCreated') {
                        newTokenAddress = parsed.args[0];
                        break;
                    }
                } catch (e) {}
            }

            // Sucesso!
            btn.innerHTML = `<i data-lucide="check"></i> Criado!`;
            bus.emit('notification:success', `Token criado com sucesso!`);
            
            // Mostra resultado
            const resDiv = document.getElementById('tfResult');
            resDiv.style.display = 'block';
            resDiv.innerHTML = `
                <div style="color:var(--success-green); font-weight:bold; margin-bottom:5px;">Sucesso!</div>
                Contrato: <span class="mono">${newTokenAddress || "Verifique no Explorer"}</span>
                <br><a href="${web3Service.getNetworkConfig()?.explorer}/address/${newTokenAddress}" target="_blank" style="color:var(--primary-blue)">Ver no Explorer</a>
            `;

            // Salva no Supabase (Gamificação)
            if (newTokenAddress) {
                await socialService.registerCreation({
                    type: 'ERC20',
                    address: newTokenAddress,
                    name: name,
                    symbol: symbol,
                    supply: supply
                });
                // Dá XP
                await socialService.addPoints(100);
            }

        } catch (error) {
            console.error(error);
            bus.emit('notification:error', "Erro na criação: " + (error.reason || error.message));
            btn.innerHTML = `<i data-lucide="rocket"></i> Criar Token`;
        } finally {
            btn.disabled = false;
            if(window.lucide) window.lucide.createIcons();
        }
    });
}