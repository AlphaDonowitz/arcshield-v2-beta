import { web3Service } from '../services/web3Service.js';
import { bus } from '../core/eventBus.js';
import { ERC20_ABI, ERC20_BYTECODE } from '../config/tokenData.js';

export function initTokenFactory() {
    const container = document.getElementById('token-launcher');
    if (!container) return;

    container.innerHTML = `
        <div class="card">
            <div style="margin-bottom:20px;">
                <div style="background:rgba(59, 130, 246, 0.1); color:#3b82f6; padding:8px 12px; border-radius:6px; display:inline-flex; align-items:center; font-size:0.8rem; margin-bottom:15px;">
                    <i data-lucide="info" style="width:14px; margin-right:6px;"></i>
                    Deploy Real na Arc Testnet
                </div>
                <h3>Token Factory</h3>
                <p class="text-secondary">Crie tokens ERC20 reais (Standard OpenZeppelin). Taxa de Gás necessária.</p>
            </div>

            <div class="form-grid">
                <div>
                    <label>Nome do Token</label>
                    <input type="text" id="tkName" placeholder="Ex: Arc Gold">
                </div>
                <div>
                    <label>Símbolo</label>
                    <input type="text" id="tkSymbol" placeholder="Ex: ARCG">
                </div>
                <div class="full-width">
                    <label>Supply Inicial (Inteiro)</label>
                    <input type="number" id="tkSupply" placeholder="Ex: 1000000">
                    <p style="font-size:0.75rem; color:#666; margin-top:5px;">
                        Serão criados <span id="supplyPreview">0</span> tokens (18 Decimais).
                    </p>
                </div>
            </div>

            <div id="deployStatus" style="margin-top:20px; padding:15px; background:#121215; border-radius:6px; font-size:0.85rem; display:none;">
                <div style="margin-bottom:5px; font-weight:600; color:#fff;">Status:</div>
                <div id="deployMsg" style="color:#888;">Aguardando...</div>
                <a id="explorerLink" href="#" target="_blank" style="display:none; color:var(--primary-blue); margin-top:10px;">Ver no Explorer</a>
            </div>

            <button id="btnCreateToken" class="btn-primary full mt-4">
                <i data-lucide="rocket"></i> Criar Token (Deploy)
            </button>
        </div>
    `;

    if(window.lucide) window.lucide.createIcons();

    // Listeners
    document.getElementById('btnCreateToken').addEventListener('click', deployToken);
    
    document.getElementById('tkSupply').addEventListener('input', (e) => {
        const val = e.target.value;
        document.getElementById('supplyPreview').innerText = val ? Number(val).toLocaleString() : '0';
    });
}

async function deployToken() {
    // 1. Validações
    const name = document.getElementById('tkName').value;
    const symbol = document.getElementById('tkSymbol').value;
    const supply = document.getElementById('tkSupply').value;

    if (!name || !symbol || !supply) {
        return bus.emit('notification:error', "Preencha todos os campos.");
    }

    if (!web3Service.isConnected || !web3Service.signer) {
        return bus.emit('notification:error', "Conecte sua carteira primeiro.");
    }

    const btn = document.getElementById('btnCreateToken');
    const statusBox = document.getElementById('deployStatus');
    const statusMsg = document.getElementById('deployMsg');
    const explorerLink = document.getElementById('explorerLink');

    try {
        // UI Update
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Calculando Gás...`;
        statusBox.style.display = 'block';
        statusMsg.innerText = "Iniciando transação...";
        explorerLink.style.display = 'none';

        // 2. Factory
        const factory = new window.ethers.ContractFactory(ERC20_ABI, ERC20_BYTECODE, web3Service.signer);

        // 3. Converte Supply para Wei
        const initialSupplyWei = window.ethers.parseUnits(supply.toString(), 18);

        // 4. Deploy
        statusMsg.innerText = "Por favor, confirme na MetaMask...";
        
        const contract = await factory.deploy(name, symbol, initialSupplyWei);
        
        statusMsg.innerHTML = `Transação enviada! <br>Aguardando confirmação da rede...`;

        // 5. Wait
        await contract.waitForDeployment();
        const contractAddress = await contract.getAddress();

        // 6. Sucesso
        statusMsg.innerHTML = `<span style="color:var(--success-green)">Deploy Confirmado!</span><br>Endereço: <span class="mono">${contractAddress}</span>`;
        
        bus.emit('notification:success', `Token ${symbol} criado com sucesso!`);
        
        // Regista no Social Service (LocalStorage/Supabase)
        // Isso é importante para aparecer no User Hub
        import('../services/socialService.js').then(module => {
            module.socialService.registerCreation({
                name, symbol, address: contractAddress, supply, type: 'ERC20'
            });
        });

        btn.innerHTML = `<i data-lucide="check"></i> Token Criado`;

        // Link Dinâmico Correto
        const networkConfig = web3Service.getNetworkConfig();
        explorerLink.href = `${networkConfig.explorer}/address/${contractAddress}`; 
        explorerLink.style.display = 'block';
        explorerLink.innerText = "Ver no Arc Explorer";

        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="rocket"></i> Criar Outro Token`;
        }, 5000);

    } catch (error) {
        console.error("Deploy Error:", error);
        let errorText = error.message || "Erro desconhecido";
        if(error.code === 'ACTION_REJECTED') errorText = "Rejeitado pelo usuário.";
        
        statusMsg.innerHTML = `<span style="color:var(--error-red)">Erro: ${errorText}</span>`;
        bus.emit('notification:error', "Falha no Deploy.");
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="refresh-cw"></i> Tentar Novamente`;
    }
}
