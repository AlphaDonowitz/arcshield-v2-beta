import { bus } from '../core/eventBus.js';
import { web3Service } from '../services/web3Service.js';
import { tokenBytecode, tokenAbi } from '../config/tokenData.js';

export function initTokenFactory() {
    const container = document.getElementById('token-factory');
    
    // Se o container não existir (estamos em outra rota), paramos.
    // Mas se o usuario clicar no menu, o router deve criar a div.
    // Vamos assumir que o 'main-content' é o alvo ou o elemento com ID específico.
    // Para garantir, vamos renderizar na div que o router expõe.
    
    // Procura o container principal onde o conteúdo deve ser injetado
    // Baseado na estrutura SPA, o container pode ser identificado dinamicamente
    const target = document.querySelector('.main-content') || document.getElementById('app');
    
    // Escuta evento de navegação para renderizar apenas quando a aba for ativa
    bus.on('navigation:changed', (viewId) => {
        if (viewId === 'token-factory') {
            renderUI(document.getElementById('token-factory') || target);
        }
    });

    // Se já estiver na tela (reload), renderiza direto
    const directContainer = document.getElementById('token-factory');
    if (directContainer) {
        renderUI(directContainer);
    }
}

function renderUI(container) {
    if (!container) return;

    container.innerHTML = `
        <div class="card fade-in">
            <div class="card-header-icon">
                <i data-lucide="coins"></i>
            </div>
            <h3>Criar Token ERC20</h3>
            <p class="bio-text">Lance sua própria criptomoeda na Arc Network em segundos. Padrão verificado e seguro.</p>

            <div class="form-grid">
                <div>
                    <label>Nome do Token</label>
                    <input type="text" id="token-name" placeholder="Ex: Bitcoin Arc" autocomplete="off">
                </div>
                <div>
                    <label>Símbolo</label>
                    <input type="text" id="token-symbol" placeholder="Ex: BTC" maxlength="10" autocomplete="off">
                </div>
                <div class="full-width">
                    <label>Supply Inicial (Quantidade)</label>
                    <input type="number" id="token-supply" placeholder="Ex: 1000000" min="1">
                </div>
            </div>

            <div id="deploy-status" style="margin-bottom: 20px; font-size: 0.9rem; min-height: 20px;"></div>

            <button id="btn-deploy-token" class="btn-primary full">
                <i data-lucide="rocket"></i> Criar Token
            </button>
        </div>
    `;

    // Reativa os ícones
    if (window.lucide) window.lucide.createIcons();

    // Attach Listener
    document.getElementById('btn-deploy-token').addEventListener('click', handleDeploy);
}

async function handleDeploy() {
    const btn = document.getElementById('btn-deploy-token');
    const statusMsg = document.getElementById('deploy-status');
    
    const nameInput = document.getElementById('token-name');
    const symbolInput = document.getElementById('token-symbol');
    const supplyInput = document.getElementById('token-supply');

    const name = nameInput.value.trim();
    const symbol = symbolInput.value.trim();
    const supply = supplyInput.value.trim();

    // 1. Validação
    if (!name || !symbol || !supply) {
        bus.emit('notification:error', "Preencha todos os campos.");
        return;
    }

    if (!web3Service.isConnected) {
        bus.emit('notification:error', "Conecte sua carteira primeiro.");
        web3Service.connectWallet();
        return;
    }

    try {
        // 2. Bloqueio de UI
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Preparando...`;
        if (window.lucide) window.lucide.createIcons();
        
        statusMsg.innerHTML = `<span style="color:var(--text-secondary)">Inicializando transação...</span>`;

        // 3. Obter Signer e Factory
        const signer = web3Service.signer;
        if (!signer) throw new Error("Signer não disponível. Reconecte a carteira.");

        const factory = new window.ethers.ContractFactory(tokenAbi, tokenBytecode, signer);

        // 4. Deploy
        statusMsg.innerHTML = `<span style="color:var(--primary-blue)">Aguardando assinatura na carteira...</span>`;
        
        // Converte supply para BigInt com 18 decimais (padrão)
        // Se o contrato espera supply bruto (sem decimais), remova o parseUnits.
        // Pelo código do StandardToken.sol que forneci: _mint(msg.sender, _initialSupply * 10**decimals);
        // Isso significa que devemos passar o número INTEIRO, e o contrato multiplica.
        // Se passarmos parseUnits, vai multiplicar duas vezes.
        // AUDITORIA: O construtor recebe uint256 _initialSupply.
        // Se passarmos 1000, o contrato faz 1000 * 10^18. 
        // Portanto, passamos apenas o valor inputado.
        
        const contract = await factory.deploy(name, symbol, supply);
        
        btn.innerHTML = `<i data-lucide="loader" class="spin"></i> Minerando...`;
        if (window.lucide) window.lucide.createIcons();
        statusMsg.innerHTML = `<span style="color:var(--primary-blue)">Transação enviada: ${contract.deploymentTransaction().hash.slice(0,10)}...</span>`;

        await contract.waitForDeployment();
        const contractAddress = await contract.getAddress();

        // 5. Sucesso e Persistência
        console.log(`Token Deployed: ${contractAddress}`);
        
        // Salvar no Supabase (se disponível)
        if (window.supabase) {
            statusMsg.innerHTML = `<span style="color:var(--primary-blue)">Salvando registro...</span>`;
            const { error } = await window.supabase
                .from('tokens_created')
                .insert([{
                    owner_address: web3Service.userAddress,
                    contract_address: contractAddress,
                    name: name,
                    symbol: symbol,
                    initial_supply: supply,
                    created_at: new Date().toISOString(),
                    chain_id: web3Service.chainId
                }]);
            
            if (error) console.error("Supabase Error:", error);
        }

        // Finalização
        statusMsg.innerHTML = `<span style="color:var(--success-green)">Sucesso! Token: ${contractAddress}</span>`;
        bus.emit('notification:success', `Token ${symbol} criado!`);
        bus.emit('token:created', { address: contractAddress, name, symbol });

        if (window.confetti) {
            window.confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        }

        // Reset Form
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="rocket"></i> Criar Outro Token`;
            nameInput.value = '';
            symbolInput.value = '';
            supplyInput.value = '';
            statusMsg.innerHTML = '';
            if (window.lucide) window.lucide.createIcons();
        }, 5000);

    } catch (error) {
        console.error("Deploy Failed:", error);
        let msg = error.reason || error.message || "Erro desconhecido";
        
        if (msg.includes("user rejected")) msg = "Transação rejeitada pelo usuário.";
        
        statusMsg.innerHTML = `<span style="color:var(--error-red)">${msg}</span>`;
        bus.emit('notification:error', "Falha no Deploy.");
        
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="refresh-cw"></i> Tentar Novamente`;
        if (window.lucide) window.lucide.createIcons();
    }
}
