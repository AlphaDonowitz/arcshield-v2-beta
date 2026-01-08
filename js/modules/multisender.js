import { web3Service } from '../services/web3Service.js';
import { CONTRACTS, ABIS } from '../config.js'; // Importa ABIS padronizadas
import { bus } from '../core/eventBus.js';

let state = {
    tokenAddress: null,
    tokenSymbol: '',
    tokenDecimals: 18,
    recipients: [], 
    totalAmount: 0n
};

export function initMultisender() {
    const container = document.getElementById('multisender');
    if (!container) return;

    // Verifica se o contrato está configurado
    if(!CONTRACTS.multi || CONTRACTS.multi.startsWith("0x0000")) {
        container.innerHTML = `
            <div class="card" style="text-align:center; padding:40px;">
                <i data-lucide="hammer" style="width:48px; height:48px; color:#666; margin-bottom:15px;"></i>
                <h3>Em Manutenção</h3>
                <p class="bio-text">O contrato Smart Drop está sendo atualizado na Arc Testnet.</p>
            </div>
        `;
        if(window.lucide) window.lucide.createIcons();
        return;
    }

    renderMultisenderUI(container);

    bus.on('multisender:selectToken', async (data) => {
        const input = document.getElementById('multiTokenAddr');
        if(input) {
            input.value = data.address;
            await validateToken(data.address);
        }
    });
}

function renderMultisenderUI(container) {
    // Mantenha o seu HTML original aqui (renderMultisenderUI do código anterior), 
    // ele estava ótimo. A mudança principal foi no initMultisender acima.
    // ... (Use o código HTML que você já enviou)
    
    // Vou reinserir o HTML encurtado para garantir o contexto, 
    // mas você pode usar exatamente o que me mandou antes dentro desta função.
    container.innerHTML = `
        <div class="card">
            <div class="card-header-icon"><i data-lucide="send"></i></div>
            <h3>Smart Drop</h3>
            <p class="bio-text">Distribua tokens para várias carteiras. (Requer contrato Multisender)</p>
            
            <div style="background:#18181b; padding:15px; border-radius:8px; border:1px solid #27272a; margin-bottom:20px;">
                <label>1. Token Address</label>
                <div style="display:flex; gap:10px;">
                    <input type="text" id="multiTokenAddr" placeholder="0x..." style="font-family:monospace;">
                    <button id="btnCheckToken" class="btn-secondary" style="width:120px;">Verificar</button>
                </div>
                <div id="tokenInfoDisplay" style="display:none; margin-top:10px; color:var(--success-green); font-size:0.9rem;">
                   <span id="lblTokenName" style="font-weight:700;">-</span>
                </div>
            </div>

            <div class="form-grid">
                <div class="full-width">
                    <label>2. Lista (CSV: Address, Amount)</label>
                    <textarea id="csvInput" rows="6" placeholder="0x..., 100\n0x..., 50" style="font-family:monospace; font-size:0.85rem;"></textarea>
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#666; margin-top:5px;">
                        <span id="statsValid">Válidos: 0</span>
                    </div>
                </div>
            </div>

             <div class="form-grid">
                <button id="btnApprove" class="btn-secondary full" disabled>1. Aprovar</button>
                <button id="btnSend" class="btn-primary full" disabled>2. Enviar</button>
            </div>
        </div>
    `;
    if(window.lucide) window.lucide.createIcons();
    attachListeners();
}

function attachListeners() {
    // Mesmos listeners do seu código original
    document.getElementById('btnCheckToken').addEventListener('click', () => validateToken(document.getElementById('multiTokenAddr').value));
    document.getElementById('csvInput').addEventListener('input', processCSV);
    document.getElementById('btnApprove').addEventListener('click', executeApprove);
    document.getElementById('btnSend').addEventListener('click', executeMultisend);
}

// ... (Mantenha validateToken e processCSV do seu código original) ...

// Atualização Crítica nas Funções de Execução:
async function executeApprove() {
    // ... (código igual, mas certifique-se de usar CONTRACTS.multi)
    const btn = document.getElementById('btnApprove');
    try {
        btn.innerHTML = "Aprovando..."; btn.disabled = true;
        const tokenContract = web3Service.getContract(state.tokenAddress);
        // Usa CONTRACTS.multi importado do config corrigido
        const tx = await tokenContract.approve(CONTRACTS.multi, state.totalAmount); 
        await tx.wait();
        bus.emit('notification:success', "Aprovado!");
        btn.innerHTML = "Aprovado";
        document.getElementById('btnSend').disabled = false;
    } catch (e) {
        console.error(e);
        bus.emit('notification:error', "Erro Approve");
        btn.disabled = false;
        btn.innerText = "1. Aprovar";
    }
}

async function executeMultisend() {
    // ... 
    const btn = document.getElementById('btnSend');
    try {
        btn.innerHTML = "Enviando..."; btn.disabled = true;
        // Usa ABIS.MULTI corrigido
        const multiContract = web3Service.getContract(CONTRACTS.multi, ABIS.MULTI);
        
        const recipients = state.recipients.map(r => r.address);
        const amounts = state.recipients.map(r => r.amount);

        const tx = await multiContract.multisendToken(state.tokenAddress, recipients, amounts);
        await tx.wait();
        bus.emit('notification:success', "Enviado com sucesso!");
        btn.innerHTML = "Concluído";
    } catch(e) {
        console.error(e);
        bus.emit('notification:error', "Erro Envio");
        btn.disabled = false;
        btn.innerText = "2. Enviar";
    }
}

// Funções validateToken e processCSV PRECISAM estar aqui embaixo (copie do seu arquivo original pois estavam corretas, apenas garanta que state é global)
// ...
