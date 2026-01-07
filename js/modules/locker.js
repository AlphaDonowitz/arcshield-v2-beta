import { web3Service } from '../services/web3Service.js';
import { bus } from '../core/eventBus.js';
import { CONTRACTS, ABIS } from '../config.js';

let lockerState = {
    tokenAddress: null,
    tokenSymbol: '',
    tokenDecimals: 18,
    balance: 0n,
    activeTab: 'create'
};

export function initLocker() {
    const container = document.getElementById('locker');
    if (!container) return;

    renderLockerUI(container);
    attachListeners();
    
    if(web3Service.isConnected) loadMyLocksOnChain();
    bus.on('wallet:connected', () => loadMyLocksOnChain());
}

function renderLockerUI(container) {
    // (A UI permanece idêntica à anterior, sem alterações visuais necessárias)
    container.innerHTML = `
        <div class="locker-container">
            <div class="card" style="padding:0; overflow:hidden;">
                <div style="padding:20px; background:#121215; border-bottom:1px solid #27272a;">
                    <div class="locker-tabs">
                        <button class="locker-tab active" data-tab="create">Novo Bloqueio</button>
                        <button class="locker-tab" data-tab="dashboard">Meus Cofres</button>
                    </div>
                </div>

                <div id="tabCreate" style="padding:20px;">
                    <div class="bio-text" style="margin-bottom:20px;">
                        Contrato V2 (Otimizado): <span class="mono text-blue">${CONTRACTS.locker.slice(0,6)}...</span>
                    </div>
                    <div class="form-grid">
                        <div>
                            <label>Token / LP</label>
                            <div style="display:flex; gap:10px;">
                                <input type="text" id="lockTokenAddr" placeholder="0x..." style="font-family:monospace;">
                                <button id="btnCheckLockToken" class="btn-secondary">Verificar</button>
                            </div>
                            <div id="lockTokenInfo" style="display:none; color:var(--success-green); margin-top:5px; font-size:0.8rem;">
                                <span id="lblLockTokenName">-</span>
                            </div>
                        </div>
                        <div>
                            <label>Quantidade</label>
                            <input type="number" id="lockAmount" placeholder="0.0">
                            <div style="text-align:right; font-size:0.75rem; color:#666; cursor:pointer;" id="btnMaxLock">Saldo: <span id="lblLockBalance">0</span></div>
                        </div>
                        <div class="full-width">
                            <label>Data Desbloqueio</label>
                            <input type="datetime-local" id="lockDate">
                        </div>
                    </div>
                    <div style="margin-top:20px; display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                        <button id="btnLockApprove" class="btn-secondary" disabled>1. Aprovar</button>
                        <button id="btnLockExec" class="btn-primary" disabled>2. Trancar</button>
                    </div>
                </div>

                <div id="tabDashboard" style="padding:20px; display:none;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h3>Meus Bloqueios</h3>
                        <button class="btn-secondary small" id="btnRefreshLocks"><i data-lucide="refresh-cw"></i></button>
                    </div>
                    <div id="locksList" class="locks-grid">
                        <div style="text-align:center; padding:20px; color:#666;">Carregando...</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    if(window.lucide) window.lucide.createIcons();
}

function attachListeners() {
    document.querySelectorAll('.locker-tab').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    document.getElementById('btnCheckLockToken').addEventListener('click', checkToken);
    document.getElementById('btnMaxLock').addEventListener('click', () => {
        if(lockerState.tokenAddress) document.getElementById('lockAmount').value = window.ethers.formatUnits(lockerState.balance, lockerState.tokenDecimals);
    });
    document.getElementById('btnLockApprove').addEventListener('click', executeApprove);
    document.getElementById('btnLockExec').addEventListener('click', executeLock);
    document.getElementById('btnRefreshLocks').addEventListener('click', loadMyLocksOnChain);
}

function switchTab(tab) {
    lockerState.activeTab = tab;
    document.getElementById('tabCreate').style.display = tab === 'create' ? 'block' : 'none';
    document.getElementById('tabDashboard').style.display = tab === 'dashboard' ? 'block' : 'none';
    document.querySelectorAll('.locker-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    if(tab === 'dashboard') loadMyLocksOnChain();
}

// ... (checkToken e executeApprove permanecem iguais ao código anterior seguro) ...
// Vou replicar aqui para garantir que você tenha o arquivo completo sem erros de cópia

async function checkToken() {
    const addr = document.getElementById('lockTokenAddr').value;
    const btn = document.getElementById('btnCheckLockToken');
    if(!web3Service.isConnected) return bus.emit('notification:error', "Conecte a carteira.");
    if(!window.ethers.isAddress(addr)) return bus.emit('notification:error', "Endereço inválido.");

    try {
        btn.innerText = "...";
        const contract = web3Service.getContract(addr);
        const [symbol, decimals, balance] = await Promise.all([
            contract.symbol(),
            contract.decimals(),
            contract.balanceOf(web3Service.userAddress)
        ]);
        lockerState.tokenAddress = addr;
        lockerState.tokenSymbol = symbol;
        lockerState.tokenDecimals = Number(decimals);
        lockerState.balance = balance;
        document.getElementById('lockTokenInfo').style.display = 'block';
        document.getElementById('lblLockTokenName').innerText = `${symbol} (Dec: ${decimals})`;
        document.getElementById('lblLockBalance').innerText = window.ethers.formatUnits(balance, decimals);
        document.getElementById('btnLockApprove').disabled = false;
        btn.innerText = "OK";
    } catch (e) { btn.innerText = "Check"; bus.emit('notification:error', "Token inválido."); }
}

async function executeApprove() {
    const amountVal = document.getElementById('lockAmount').value;
    if(!amountVal) return bus.emit('notification:error', "Defina valor.");
    const btn = document.getElementById('btnLockApprove');
    try {
        btn.disabled = true; btn.innerText = "Aprovando...";
        const amountWei = window.ethers.parseUnits(amountVal, lockerState.tokenDecimals);
        const token = web3Service.getContract(lockerState.tokenAddress);
        const tx = await token.approve(CONTRACTS.locker, amountWei);
        await tx.wait();
        bus.emit('notification:success', "Aprovado!");
        btn.innerText = "Aprovado";
        document.getElementById('btnLockExec').disabled = false;
    } catch (e) { btn.disabled = false; btn.innerText = "1. Aprovar"; bus.emit('notification:error', e.message); }
}

async function executeLock() {
    const amountVal = document.getElementById('lockAmount').value;
    const dateVal = document.getElementById('lockDate').value;
    if(!dateVal) return bus.emit('notification:error', "Defina data.");
    const unlockTime = Math.floor(new Date(dateVal).getTime() / 1000);
    const btn = document.getElementById('btnLockExec');
    try {
        btn.disabled = true; btn.innerText = "Trancando...";
        const amountWei = window.ethers.parseUnits(amountVal, lockerState.tokenDecimals);
        const locker = web3Service.getContract('locker', ABIS.LOCKER, CONTRACTS.locker);
        const tx = await locker.lockTokens(lockerState.tokenAddress, amountWei, unlockTime);
        await tx.wait();
        bus.emit('notification:success', "Sucesso!");
        btn.innerText = "Trancado!";
        setTimeout(() => { switchTab('dashboard'); btn.disabled=true; btn.innerText="2. Trancar"; }, 1500);
    } catch (e) { btn.disabled = false; btn.innerText = "2. Trancar"; bus.emit('notification:error', e.message); }
}

// --- AQUI ESTÁ A GRANDE OTIMIZAÇÃO V2 ---
async function loadMyLocksOnChain() {
    const list = document.getElementById('locksList');
    if(!web3Service.isConnected) return;
    
    try {
        const locker = web3Service.getContract('locker', ABIS.LOCKER, CONTRACTS.locker);
        
        // 1 LINHA DE CÓDIGO substitui aquele loop inteiro de 50 linhas
        // O contrato agora nos devolve apenas o que é nosso
        const myLocks = await locker.getLocksByOwner(web3Service.userAddress);

        if(myLocks.length === 0) {
            list.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Você não possui bloqueios.</div>';
            return;
        }

        let html = '';
        // Itera sobre o array retornado (Reverso para mostrar mais recentes primeiro)
        for(let i = myLocks.length - 1; i >= 0; i--) {
            const lock = myLocks[i];
            // lock é: [id, owner, token, amount, unlockTime, withdrawn]
            
            const id = lock[0];
            const tokenAddr = lock[2];
            const amountWei = lock[3];
            const unlockTimestamp = Number(lock[4]);
            const withdrawn = lock[5];
            
            const unlockDate = new Date(unlockTimestamp * 1000);
            const isLocked = unlockDate > new Date() && !withdrawn;
            
            // UI igual
            html += `
                <div class="lock-card">
                    <div class="lock-header">
                        <b>Token: ${tokenAddr.slice(0,6)}...</b>
                        <span class="lock-badge" style="color:${isLocked ? '#3b82f6' : '#10b981'}">
                            ${withdrawn ? 'SACADO' : (isLocked ? 'BLOQUEADO' : 'DISPONÍVEL')}
                        </span>
                    </div>
                    <div class="lock-amount">${window.ethers.formatEther(amountWei)} (Wei)</div> 
                    <div class="lock-timer">Liberação: ${unlockDate.toLocaleString()}</div>
                    ${(!isLocked && !withdrawn) ? `<button class="btn-primary full small mt-2" onclick="window.withdrawLock(${id})">Sacar</button>` : ''}
                </div>
            `;
        }
        list.innerHTML = html;

    } catch (e) {
        console.error(e);
        list.innerHTML = '<div style="text-align:center; color:red;">Erro ao buscar dados. Verifique o contrato.</div>';
    }
}

window.withdrawLock = async (id) => {
    try {
        if(!confirm("Sacar?")) return;
        const locker = web3Service.getContract('locker', ABIS.LOCKER, CONTRACTS.locker);
        const tx = await locker.withdraw(id);
        await tx.wait();
        bus.emit('notification:success', "Sacado!");
        loadMyLocksOnChain();
    } catch(e) { bus.emit('notification:error', e.message); }
};
