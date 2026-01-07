import { web3Service } from '../services/web3Service.js';
import { bus } from '../core/eventBus.js';
import { CONTRACTS, ABIS } from '../config.js';

// REMOVIDO: import { ethers } ... (Isso causava o erro)
// Agora usamos a variável global window.ethers que é segura

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
    
    if(web3Service.isConnected) {
        loadMyLocksOnChain();
    }
    
    bus.on('wallet:connected', () => loadMyLocksOnChain());
}

function renderLockerUI(container) {
    container.innerHTML = `
        <div class="locker-container">
            <div class="card" style="padding:0; overflow:hidden;">
                <div style="padding:20px; background:#121215; border-bottom:1px solid #27272a;">
                    <div class="locker-tabs">
                        <button class="locker-tab active" data-tab="create">Novo Bloqueio</button>
                        <button class="locker-tab" data-tab="dashboard">Meus Cofres (On-Chain)</button>
                    </div>
                </div>

                <div id="tabCreate" style="padding:20px;">
                    <div class="bio-text" style="margin-bottom:20px;">
                        Contrato Oficial: <span class="mono text-blue">${CONTRACTS.locker.slice(0,6)}...${CONTRACTS.locker.slice(-4)}</span>
                    </div>

                    <div class="form-grid">
                        <div>
                            <label>Endereço do Token / LP</label>
                            <div style="display:flex; gap:10px;">
                                <input type="text" id="lockTokenAddr" placeholder="0x..." style="font-family:monospace;">
                                <button id="btnCheckLockToken" class="btn-secondary">Verificar</button>
                            </div>
                            <div id="lockTokenInfo" style="display:none; font-size:0.8rem; color:var(--success-green); margin-top:5px;">
                                <i data-lucide="check-circle" style="width:12px;"></i> <span id="lblLockTokenName">-</span>
                            </div>
                        </div>

                        <div>
                            <label>Quantidade</label>
                            <input type="number" id="lockAmount" placeholder="0.0">
                            <div style="text-align:right; font-size:0.75rem; color:#666; cursor:pointer;" id="btnMaxLock">
                                Saldo: <span id="lblLockBalance">0</span>
                            </div>
                        </div>

                        <div class="full-width">
                            <label>Data de Desbloqueio</label>
                            <div class="date-input-wrapper">
                                <input type="datetime-local" id="lockDate">
                            </div>
                        </div>
                    </div>

                    <div style="margin-top:20px; display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                        <button id="btnLockApprove" class="btn-secondary" disabled>1. Aprovar</button>
                        <button id="btnLockExec" class="btn-primary" disabled><i data-lucide="lock"></i> 2. Trancar</button>
                    </div>
                </div>

                <div id="tabDashboard" style="padding:20px; display:none;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h3>Meus Bloqueios na Blockchain</h3>
                        <button class="btn-secondary small" id="btnRefreshLocks"><i data-lucide="refresh-cw"></i></button>
                    </div>
                    
                    <div id="locksList" class="locks-grid">
                        <div style="grid-column:1/-1; text-align:center; padding:20px; color:#666;">
                            <i data-lucide="loader-2" class="spin"></i> Buscando na blockchain...
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    if(window.lucide) window.lucide.createIcons();
}

function attachListeners() {
    document.querySelectorAll('.locker-tab').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.getElementById('btnCheckLockToken').addEventListener('click', checkToken);

    document.getElementById('btnMaxLock').addEventListener('click', () => {
        if(lockerState.tokenAddress) {
            // Usa window.ethers aqui
            document.getElementById('lockAmount').value = window.ethers.formatUnits(lockerState.balance, lockerState.tokenDecimals);
        }
    });

    document.getElementById('btnLockApprove').addEventListener('click', executeApprove);
    document.getElementById('btnLockExec').addEventListener('click', executeLock);
    document.getElementById('btnRefreshLocks').addEventListener('click', loadMyLocksOnChain);
}

function switchTab(tabName) {
    lockerState.activeTab = tabName;
    document.querySelectorAll('.locker-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
    document.getElementById('tabCreate').style.display = tabName === 'create' ? 'block' : 'none';
    document.getElementById('tabDashboard').style.display = tabName === 'dashboard' ? 'block' : 'none';
    if(tabName === 'dashboard') loadMyLocksOnChain();
}

async function checkToken() {
    const addr = document.getElementById('lockTokenAddr').value;
    const btn = document.getElementById('btnCheckLockToken');
    
    // Usa window.ethers
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
        document.getElementById('lblLockTokenName').innerText = `${symbol} (Decimais: ${decimals})`;
        document.getElementById('lblLockBalance').innerText = window.ethers.formatUnits(balance, decimals);
        document.getElementById('btnLockApprove').disabled = false;
        btn.innerText = "OK";

    } catch (e) {
        console.error(e);
        bus.emit('notification:error', "Token inválido.");
        btn.innerText = "Verificar";
    }
}

async function executeApprove() {
    const amountVal = document.getElementById('lockAmount').value;
    if(!amountVal) return bus.emit('notification:error', "Defina o valor.");

    const btn = document.getElementById('btnLockApprove');
    try {
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Aprovando...`;

        const amountWei = window.ethers.parseUnits(amountVal, lockerState.tokenDecimals);
        const token = web3Service.getContract(lockerState.tokenAddress);
        
        const tx = await token.approve(CONTRACTS.locker, amountWei);
        await tx.wait();

        bus.emit('notification:success', "Aprovado!");
        btn.innerHTML = `<i data-lucide="check"></i> Aprovado`;
        document.getElementById('btnLockExec').disabled = false;

    } catch (e) {
        console.error(e);
        bus.emit('notification:error', "Erro: " + e.message);
        btn.innerText = "1. Aprovar";
        btn.disabled = false;
    }
}

async function executeLock() {
    const amountVal = document.getElementById('lockAmount').value;
    const dateVal = document.getElementById('lockDate').value;

    if(!dateVal) return bus.emit('notification:error', "Defina a data.");
    
    const unlockTime = Math.floor(new Date(dateVal).getTime() / 1000);
    if(unlockTime <= Math.floor(Date.now() / 1000)) return bus.emit('notification:error', "Data deve ser futura.");

    const btn = document.getElementById('btnLockExec');
    
    try {
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Trancando...`;

        const amountWei = window.ethers.parseUnits(amountVal, lockerState.tokenDecimals);
        const locker = web3Service.getContract('locker', ABIS.LOCKER, CONTRACTS.locker);
        
        const tx = await locker.lockTokens(lockerState.tokenAddress, amountWei, unlockTime);
        bus.emit('notification:info', "Transação enviada...");
        await tx.wait();

        bus.emit('notification:success', "Tokens trancados com sucesso!");
        btn.innerHTML = `<i data-lucide="lock"></i> Trancado!`;
        
        setTimeout(() => {
            switchTab('dashboard');
            btn.innerHTML = "2. Trancar";
            btn.disabled = true;
            document.getElementById('btnLockApprove').disabled = false;
            document.getElementById('btnLockApprove').innerText = "1. Aprovar";
        }, 2000);

    } catch (e) {
        console.error(e);
        bus.emit('notification:error', "Erro: " + (e.reason || e.message));
        btn.disabled = false;
        btn.innerText = "2. Trancar";
    }
}

async function loadMyLocksOnChain() {
    const list = document.getElementById('locksList');
    if(!web3Service.isConnected) {
        list.innerHTML = '<div style="text-align:center; padding:20px;">Conecte a carteira.</div>';
        return;
    }

    try {
        const locker = web3Service.getContract('locker', ABIS.LOCKER, CONTRACTS.locker);
        const totalLocks = Number(await locker.lockIdCounter());
        
        if(totalLocks === 0) {
            list.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Nenhum bloqueio encontrado.</div>';
            return;
        }

        let myLocksHTML = '';
        const userAddress = web3Service.userAddress.toLowerCase();
        const start = Math.max(0, totalLocks - 20); 
        
        for(let i = totalLocks - 1; i >= start; i--) {
            try {
                const details = await locker.getLockDetails(i);
                
                if(details[0].toLowerCase() === userAddress) {
                    const tokenAddr = details[1];
                    const amountWei = details[2];
                    const unlockTime = Number(details[3]) * 1000;
                    const withdrawn = details[4];

                    let symbol = "TOKEN";
                    let decimals = 18;
                    try {
                        const tokenContract = web3Service.getContract(tokenAddr);
                        symbol = await tokenContract.symbol();
                        decimals = await tokenContract.decimals();
                    } catch(e){}

                    const amountFmt = window.ethers.formatUnits(amountWei, decimals);
                    const unlockDate = new Date(unlockTime);
                    const isLocked = unlockDate > new Date() && !withdrawn;
                    const canWithdraw = !isLocked && !withdrawn;

                    let statusLabel = "BLOQUEADO";
                    let statusColor = "#3b82f6";
                    if(withdrawn) { statusLabel = "SACADO"; statusColor = "#666"; }
                    else if(canWithdraw) { statusLabel = "DISPONÍVEL"; statusColor = "#10b981"; }

                    myLocksHTML += `
                        <div class="lock-card">
                            <div class="lock-header">
                                <div style="font-weight:700;">${symbol}</div>
                                <div class="lock-badge" style="color:${statusColor}; background:rgba(255,255,255,0.05);">${statusLabel}</div>
                            </div>
                            <div class="lock-amount">${parseFloat(amountFmt).toFixed(2)}</div>
                            <div style="font-size:0.75rem; color:#666; margin-bottom:10px;">ID #${i} • ${tokenAddr.slice(0,6)}...</div>
                            <div class="lock-timer">Liberação: ${unlockDate.toLocaleString()}</div>
                            ${canWithdraw ? `<button class="btn-primary full small mt-2" onclick="window.withdrawLock(${i})"><i data-lucide="unlock"></i> Realizar Saque</button>` : ''}
                        </div>
                    `;
                }
            } catch(e) { console.error(`Erro lock ${i}`, e); }
        }

        if(myLocksHTML === '') list.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Você não possui bloqueios ativos.</div>';
        else list.innerHTML = myLocksHTML;
        if(window.lucide) window.lucide.createIcons();

    } catch(e) {
        console.error(e);
        list.innerHTML = '<div style="text-align:center; padding:20px; color:red;">Erro ao buscar dados.</div>';
    }
}

window.withdrawLock = async (id) => {
    try {
        if(!confirm(`Deseja sacar o bloqueio #${id}?`)) return;
        const locker = web3Service.getContract('locker', ABIS.LOCKER, CONTRACTS.locker);
        const tx = await locker.withdraw(id);
        bus.emit('notification:info', "Saque enviado...");
        await tx.wait();
        bus.emit('notification:success', "Saque realizado!");
        loadMyLocksOnChain();
    } catch(e) {
        bus.emit('notification:error', "Erro: " + e.message);
    }
};
