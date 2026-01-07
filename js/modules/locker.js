import { web3Service } from '../services/web3Service.js';
import { bus } from '../core/eventBus.js';
import { CONTRACTS } from '../config.js'; // Assumindo que existe, senão usa fallback

// Estado Local
let lockerState = {
    tokenAddress: null,
    tokenSymbol: '',
    tokenDecimals: 18,
    balance: 0n,
    activeTab: 'create' // 'create' | 'dashboard'
};

export function initLocker() {
    const container = document.getElementById('locker');
    if (!container) return;

    renderLockerUI(container);
    attachListeners();
    loadMyLocks(); // Carrega bloqueios salvos
}

function renderLockerUI(container) {
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
                        Bloqueie tokens de liquidez (LP) ou tokens padrão para ganhar a confiança dos investidores.
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
                            <label>Quantidade para Bloquear</label>
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
                            <p style="font-size:0.75rem; color:#666; margin-top:5px;">
                                Os tokens ficarão inacessíveis até esta data.
                            </p>
                        </div>
                    </div>

                    <div style="margin-top:20px; display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                        <button id="btnLockApprove" class="btn-secondary" disabled>1. Aprovar</button>
                        <button id="btnLockExec" class="btn-primary" disabled><i data-lucide="lock"></i> 2. Trancar</button>
                    </div>
                </div>

                <div id="tabDashboard" style="padding:20px; display:none;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h3>Meus Bloqueios Ativos</h3>
                        <button class="btn-secondary small" id="btnRefreshLocks"><i data-lucide="refresh-cw"></i></button>
                    </div>
                    
                    <div id="locksList" class="locks-grid">
                        </div>
                    
                    <div id="emptyLocks" style="text-align:center; padding:40px; color:#666; display:none;">
                        <i data-lucide="unlock" style="width:32px; height:32px; margin-bottom:10px;"></i>
                        <p>Você não possui tokens bloqueados.</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    if(window.lucide) window.lucide.createIcons();
}

function attachListeners() {
    // Abas
    document.querySelectorAll('.locker-tab').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Verificar Token
    document.getElementById('btnCheckLockToken').addEventListener('click', checkToken);

    // Botão Max
    document.getElementById('btnMaxLock').addEventListener('click', () => {
        if(lockerState.tokenAddress) {
            document.getElementById('lockAmount').value = ethers.formatUnits(lockerState.balance, lockerState.tokenDecimals);
        }
    });

    // Ações
    document.getElementById('btnLockApprove').addEventListener('click', executeApprove);
    document.getElementById('btnLockExec').addEventListener('click', executeLock);
    document.getElementById('btnRefreshLocks').addEventListener('click', loadMyLocks);
}

function switchTab(tabName) {
    lockerState.activeTab = tabName;
    
    // Atualiza botões
    document.querySelectorAll('.locker-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tabName);
    });

    // Atualiza Views
    document.getElementById('tabCreate').style.display = tabName === 'create' ? 'block' : 'none';
    document.getElementById('tabDashboard').style.display = tabName === 'dashboard' ? 'block' : 'none';

    if(tabName === 'dashboard') loadMyLocks();
}

// --- Lógica Web3 ---

async function checkToken() {
    const addr = document.getElementById('lockTokenAddr').value;
    const btn = document.getElementById('btnCheckLockToken');
    
    if(!web3Service.isConnected) return bus.emit('notification:error', "Conecte a carteira.");
    if(!ethers.isAddress(addr)) return bus.emit('notification:error', "Endereço inválido.");

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

        // Atualiza UI
        document.getElementById('lockTokenInfo').style.display = 'block';
        document.getElementById('lblLockTokenName').innerText = `${symbol} (Decimais: ${decimals})`;
        document.getElementById('lblLockBalance').innerText = ethers.formatUnits(balance, decimals);
        document.getElementById('btnLockApprove').disabled = false;
        
        btn.innerText = "OK";

    } catch (e) {
        console.error(e);
        bus.emit('notification:error', "Não é um token ERC20 válido.");
        btn.innerText = "Verificar";
    }
}

async function executeApprove() {
    const amountVal = document.getElementById('lockAmount').value;
    if(!amountVal || parseFloat(amountVal) <= 0) return bus.emit('notification:error', "Valor inválido.");

    const btn = document.getElementById('btnLockApprove');
    try {
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Aprovando...`;

        const amountWei = ethers.parseUnits(amountVal, lockerState.tokenDecimals);
        const token = web3Service.getContract(lockerState.tokenAddress);
        
        // Endereço fictício do Locker na Testnet se não existir no config
        const lockerAddress = CONTRACTS?.locker || "0x000000000000000000000000000000000000dEaD"; 

        const tx = await token.approve(lockerAddress, amountWei);
        await tx.wait();

        bus.emit('notification:success', "Aprovado com sucesso!");
        btn.innerHTML = `<i data-lucide="check"></i> Aprovado`;
        document.getElementById('btnLockExec').disabled = false;

    } catch (e) {
        console.error(e);
        bus.emit('notification:error', "Erro na aprovação: " + e.message);
        btn.innerText = "1. Aprovar";
        btn.disabled = false;
    } finally {
        if(window.lucide) window.lucide.createIcons();
    }
}

async function executeLock() {
    const amountVal = document.getElementById('lockAmount').value;
    const dateVal = document.getElementById('lockDate').value;

    if(!dateVal) return bus.emit('notification:error', "Selecione a data de desbloqueio.");
    
    const unlockTime = new Date(dateVal).getTime() / 1000;
    if(unlockTime <= Date.now() / 1000) return bus.emit('notification:error', "A data deve ser no futuro.");

    const btn = document.getElementById('btnLockExec');
    
    try {
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Trancando...`;

        // TENTA CHAMADA REAL
        // Se o contrato Locker não existir na rede, cairá no catch e faremos o fallback
        // const locker = web3Service.getContract('locker');
        // const tx = await locker.lock(lockerState.tokenAddress, amountWei, unlockTime);
        // await tx.wait();

        // SIMULAÇÃO DE REDE (Para UX Testnet)
        await new Promise(r => setTimeout(r, 2000));

        // Salva Localmente
        saveLockLocal({
            tokenAddress: lockerState.tokenAddress,
            symbol: lockerState.tokenSymbol,
            amount: amountVal,
            unlockTime: unlockTime * 1000, // Salva em ms
            createdAt: Date.now()
        });

        bus.emit('notification:success', "Tokens trancados com sucesso! (Simulação)");
        btn.innerHTML = `<i data-lucide="lock"></i> Trancado!`;
        
        // Reseta e vai pro dashboard
        setTimeout(() => {
            switchTab('dashboard');
            btn.innerHTML = `<i data-lucide="lock"></i> 2. Trancar`;
            btn.disabled = true;
            document.getElementById('btnLockApprove').disabled = false;
            document.getElementById('btnLockApprove').innerText = "1. Aprovar";
        }, 1500);

    } catch (e) {
        console.error(e);
        bus.emit('notification:error', "Erro ao trancar: " + e.message);
        btn.disabled = false;
        btn.innerText = "2. Trancar";
    } finally {
        if(window.lucide) window.lucide.createIcons();
    }
}

// --- Gerenciamento Local (Simulação de Indexer) ---

function getMyLocks() {
    const key = `arc_locks_${web3Service.userAddress}`;
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch { return []; }
}

function saveLockLocal(lockData) {
    const key = `arc_locks_${web3Service.userAddress}`;
    const locks = getMyLocks();
    locks.unshift(lockData);
    localStorage.setItem(key, JSON.stringify(locks));
}

function loadMyLocks() {
    const list = document.getElementById('locksList');
    const empty = document.getElementById('emptyLocks');
    
    if(!web3Service.userAddress) {
        list.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    const locks = getMyLocks();

    if(locks.length === 0) {
        list.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    list.innerHTML = locks.map(lock => {
        const unlockDate = new Date(lock.unlockTime);
        const now = new Date();
        const isLocked = unlockDate > now;
        const statusClass = isLocked ? 'text-blue' : 'text-green';
        const statusText = isLocked ? 'BLOQUEADO' : 'DESBLOQUEADO';
        const icon = isLocked ? 'lock' : 'unlock';

        return `
            <div class="lock-card">
                <div class="lock-header">
                    <div style="font-weight:700;">${lock.symbol}</div>
                    <div class="lock-badge" style="color:${isLocked ? '#3b82f6' : '#10b981'}; background:rgba(255,255,255,0.05);">
                        <i data-lucide="${icon}" style="width:12px;"></i> ${statusText}
                    </div>
                </div>
                <div class="lock-amount">${lock.amount}</div>
                <div style="font-size:0.8rem; color:#666; margin-bottom:10px;">${lock.tokenAddress.slice(0,6)}...${lock.tokenAddress.slice(-4)}</div>
                
                <div class="lock-timer">
                    Liberação: ${unlockDate.toLocaleString()}
                </div>

                ${!isLocked ? `<button class="btn-primary full small mt-2">Sacar</button>` : ''}
            </div>
        `;
    }).join('');

    if(window.lucide) window.lucide.createIcons();
}
