import { web3Service } from '../services/web3Service.js';
import { CONTRACTS } from '../config.js';
import { bus } from '../core/eventBus.js';

// Estado Local do Módulo
let state = {
    tokenAddress: null,
    tokenSymbol: '',
    tokenDecimals: 18,
    recipients: [], // Array de { address, amount (Wei) }
    totalAmount: 0n
};

export function initMultisender() {
    const container = document.getElementById('multisender');
    if (!container) return;

    // 1. Renderiza Interface
    renderMultisenderUI(container);

    // 2. Escuta eventos externos (Vindo do User Hub)
    bus.on('multisender:selectToken', async (data) => {
        // Preenche o campo e valida automaticamente
        const input = document.getElementById('multiTokenAddr');
        if(input) {
            input.value = data.address;
            await validateToken(data.address);
        }
    });
}

function renderMultisenderUI(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header-icon"><i data-lucide="send"></i></div>
            <h3>Smart Drop</h3>
            <p class="bio-text">Distribua tokens para centenas de carteiras em uma única transação.</p>

            <div style="background:#18181b; padding:15px; border-radius:8px; border:1px solid #27272a; margin-bottom:20px;">
                <label>1. Token para Envio (Endereço do Contrato)</label>
                <div style="display:flex; gap:10px;">
                    <input type="text" id="multiTokenAddr" placeholder="0x..." style="font-family:monospace;">
                    <button id="btnCheckToken" class="btn-secondary" style="width:120px;">Verificar</button>
                </div>
                <div id="tokenInfoDisplay" style="display:none; margin-top:10px; font-size:0.9rem; color:var(--success-green);">
                    <i data-lucide="check-circle" style="width:14px; display:inline;"></i> 
                    Token Válido: <span id="lblTokenName" style="font-weight:700;">-</span>
                </div>
            </div>

            <div class="form-grid">
                <div class="full-width">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                        <label>2. Lista de Disparo (CSV ou Texto)</label>
                        <button class="btn-secondary small" id="btnLoadExample">Carregar Exemplo</button>
                    </div>
                    <textarea id="csvInput" rows="6" placeholder="0xCarteira1, 100&#10;0xCarteira2, 50.5" style="font-family:monospace; font-size:0.85rem;"></textarea>
                    
                    <div style="display:flex; justify-content:space-between; margin-top:5px; font-size:0.8rem; color:#666;">
                        <span id="statsValid">Válidos: 0</span>
                        <span id="statsInvalid" style="color:var(--error-red);">Inválidos: 0</span>
                    </div>
                </div>
            </div>

            <div class="multi-stats">
                <div class="multi-stat-card">
                    <h4>Total de Carteiras</h4>
                    <div class="val" id="valTotalWallets">0</div>
                </div>
                <div class="multi-stat-card">
                    <h4>Total de Tokens</h4>
                    <div class="val" id="valTotalTokens">0</div>
                </div>
            </div>

            <div class="form-grid">
                <button id="btnApprove" class="btn-secondary full" disabled>
                    1. Aprovar Contrato
                </button>
                <button id="btnSend" class="btn-primary full" disabled>
                    <i data-lucide="send"></i> 2. Disparar Airdrop
                </button>
            </div>
        </div>
    `;

    if(window.lucide) window.lucide.createIcons();
    attachListeners();
}

function attachListeners() {
    // Verificar Token Manualmente
    document.getElementById('btnCheckToken').addEventListener('click', () => {
        const addr = document.getElementById('multiTokenAddr').value;
        validateToken(addr);
    });

    // Processar CSV ao digitar
    document.getElementById('csvInput').addEventListener('input', processCSV);

    // Carregar Exemplo
    document.getElementById('btnLoadExample').addEventListener('click', () => {
        document.getElementById('csvInput').value = 
`0x742d35Cc6634C0532925a3b844Bc454e4438f44e, 100
0x8894e0a0c962CB723c1976a4421c95949bE2D4E3, 50.5`;
        processCSV();
    });

    // Ação Aprovar
    document.getElementById('btnApprove').addEventListener('click', async () => {
        await executeApprove();
    });

    // Ação Enviar
    document.getElementById('btnSend').addEventListener('click', async () => {
        await executeMultisend();
    });
}

// --- Lógica de Validação ---

async function validateToken(address) {
    if(!web3Service.isConnected) {
        bus.emit('notification:error', "Conecte a carteira primeiro.");
        return;
    }

    try {
        const btn = document.getElementById('btnCheckToken');
        btn.innerText = "...";
        
        const contract = web3Service.getContract(address); // ERC20 Padrão
        const symbol = await contract.symbol();
        const decimals = await contract.decimals();

        // Atualiza Estado
        state.tokenAddress = address;
        state.tokenSymbol = symbol;
        state.tokenDecimals = Number(decimals);

        // Atualiza UI
        document.getElementById('tokenInfoDisplay').style.display = 'block';
        document.getElementById('lblTokenName').innerText = `${symbol} (Decimals: ${decimals})`;
        btn.innerText = "OK";
        
        // Reprocessa CSV caso já tenha dados, agora com os decimais corretos
        processCSV();

    } catch (e) {
        console.error(e);
        bus.emit('notification:error', "Endereço inválido ou não é um Token ERC20.");
        document.getElementById('btnCheckToken').innerText = "Verificar";
        document.getElementById('tokenInfoDisplay').style.display = 'none';
        state.tokenAddress = null;
    }
}

function processCSV() {
    if(!state.tokenAddress) return; // Só processa se tiver token válido

    const raw = document.getElementById('csvInput').value;
    const lines = raw.split(/\r?\n/);
    
    state.recipients = [];
    state.totalAmount = 0n;
    
    let validCount = 0;
    let invalidCount = 0;

    lines.forEach(line => {
        if(!line.trim()) return;
        
        // Aceita separadores: virgula, ponto-virgula ou tab
        const parts = line.split(/[;,\t]+/);
        
        if(parts.length >= 2) {
            const addr = parts[0].trim();
            const amountStr = parts[1].trim();

            if(ethers.isAddress(addr) && !isNaN(amountStr)) {
                try {
                    const wei = ethers.parseUnits(amountStr, state.tokenDecimals);
                    state.recipients.push({ address: addr, amount: wei });
                    state.totalAmount += wei;
                    validCount++;
                } catch(e) { invalidCount++; }
            } else { invalidCount++; }
        } else { invalidCount++; }
    });

    // Atualiza Stats UI
    document.getElementById('statsValid').innerText = `Válidos: ${validCount}`;
    document.getElementById('statsInvalid').innerText = `Inválidos: ${invalidCount}`;
    document.getElementById('valTotalWallets').innerText = validCount;
    
    // Formata total para exibir
    const totalFmt = ethers.formatUnits(state.totalAmount, state.tokenDecimals);
    document.getElementById('valTotalTokens').innerText = `${totalFmt} ${state.tokenSymbol}`;

    // Habilita Botão de Aprovação se tiver dados válidos
    const btnApprove = document.getElementById('btnApprove');
    if(validCount > 0 && state.totalAmount > 0n) {
        btnApprove.disabled = false;
        btnApprove.classList.remove('btn-secondary');
        btnApprove.classList.add('btn-primary');
    } else {
        btnApprove.disabled = true;
    }
}

// --- Transações ---

async function executeApprove() {
    const btn = document.getElementById('btnApprove');
    try {
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Aprovando...`;
        btn.disabled = true;

        const tokenContract = web3Service.getContract(state.tokenAddress);
        
        // Aprova o contrato Multisender para gastar os tokens do usuário
        const tx = await tokenContract.approve(CONTRACTS.multi, state.totalAmount);
        
        bus.emit('notification:info', "Aprovação enviada. Aguarde...");
        await tx.wait();

        bus.emit('notification:success', "Tokens Aprovados!");
        btn.innerHTML = `<i data-lucide="check"></i> Aprovado`;
        
        // Habilita o envio final
        const btnSend = document.getElementById('btnSend');
        btnSend.disabled = false;

    } catch (e) {
        console.error(e);
        bus.emit('notification:error', "Erro na aprovação: " + (e.reason || e.message));
        btn.innerHTML = "1. Aprovar Contrato";
        btn.disabled = false;
    } finally {
        if(window.lucide) window.lucide.createIcons();
    }
}

async function executeMultisend() {
    const btn = document.getElementById('btnSend');
    try {
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Enviando...`;
        btn.disabled = true;

        const multiContract = web3Service.getContract('multi');
        
        // Prepara arrays para o contrato
        const recipients = state.recipients.map(r => r.address);
        const amounts = state.recipients.map(r => r.amount);

        // Envia
        const tx = await multiContract.multisendToken(state.tokenAddress, recipients, amounts);
        
        bus.emit('notification:info', "Airdrop iniciado! Aguarde confirmação.");
        await tx.wait();

        bus.emit('notification:success', `Sucesso! Enviado para ${recipients.length} carteiras.`);
        btn.innerHTML = `<i data-lucide="check-circle"></i> Airdrop Concluído!`;

    } catch (e) {
        console.error(e);
        bus.emit('notification:error', "Erro no envio: " + (e.reason || e.message));
        btn.innerHTML = `<i data-lucide="send"></i> 2. Disparar Airdrop`;
        btn.disabled = false;
    } finally {
        if(window.lucide) window.lucide.createIcons();
    }
}
