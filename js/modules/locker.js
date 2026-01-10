import { web3Service } from '../services/web3Service.js';
import { bus } from '../core/eventBus.js';
import { CONTRACTS, ABIS } from '../config.js';

let lockerState = { tokenAddress: null, tokenDecimals: 18, balance: 0n };

export function initLocker() {
    const container = document.getElementById('locker');
    if (!container) return;
    renderUI(container);
    if (web3Service.isConnected) loadLocks();
    bus.on('wallet:connected', loadLocks);
}

function renderUI(container) {
    container.innerHTML = `
        <div class="locker-tabs">
            <button class="locker-tab active" data-tab="create">Novo Bloqueio</button>
            <button class="locker-tab" data-tab="dashboard">Meus Cofres</button>
        </div>
        <div id="tabCreate" class="lock-form">
            <input type="text" id="lockTokenAddr" placeholder="Endereço do Token">
            <button id="btnCheckLockToken">Verificar</button>
            <div id="lockTokenInfo" style="display:none; margin: 10px 0;">
                <span id="lblLockTokenName"></span> | Saldo: <span id="lblLockBalance"></span>
            </div>
            <input type="number" id="lockAmount" placeholder="Quantidade">
            <input type="datetime-local" id="lockDate">
            <button id="btnLockApprove" class="btn-primary" disabled>1. Aprovar</button>
            <button id="btnLockExec" class="btn-primary" disabled>2. Trancar</button>
        </div>
        <div id="tabDashboard" style="display:none;">
            <div id="locksList" class="locks-grid">Carregando...</div>
        </div>
    `;
    attachEvents();
}

function attachEvents() {
    document.querySelectorAll('.locker-tab').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.locker-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            document.getElementById('tabCreate').style.display = tab === 'create' ? 'block' : 'none';
            document.getElementById('tabDashboard').style.display = tab === 'dashboard' ? 'block' : 'none';
            if (tab === 'dashboard') loadLocks();
        };
    });
    document.getElementById('btnCheckLockToken').onclick = checkToken;
    document.getElementById('btnLockApprove').onclick = approve;
    document.getElementById('btnLockExec').onclick = lock;
}

async function checkToken() {
    const addr = document.getElementById('lockTokenAddr').value;
    if (!window.ethers.isAddress(addr)) return alert("Inválido");
    try {
        const contract = web3Service.getContract(addr, ABIS.ERC20);
        const [sym, dec, bal] = await Promise.all([contract.symbol(), contract.decimals(), contract.balanceOf(web3Service.userAddress)]);
        lockerState = { tokenAddress: addr, tokenDecimals: Number(dec), balance: bal };
        document.getElementById('lockTokenInfo').style.display = 'block';
        document.getElementById('lblLockTokenName').innerText = sym;
        document.getElementById('lblLockBalance').innerText = window.ethers.formatUnits(bal, dec);
        document.getElementById('btnLockApprove').disabled = false;
    } catch (e) { alert("Erro ao ler token."); }
}

async function approve() {
    const amt = document.getElementById('lockAmount').value;
    const wei = window.ethers.parseUnits(amt, lockerState.tokenDecimals);
    const token = web3Service.getContract(lockerState.tokenAddress, ABIS.ERC20);
    const tx = await token.approve(CONTRACTS.locker, wei);
    await tx.wait();
    document.getElementById('btnLockExec').disabled = false;
    alert("Aprovado!");
}

async function lock() {
    const amt = document.getElementById('lockAmount').value;
    const date = document.getElementById('lockDate').value;
    const time = Math.floor(new Date(date).getTime() / 1000);
    const wei = window.ethers.parseUnits(amt, lockerState.tokenDecimals);
    const locker = web3Service.getContract(CONTRACTS.locker, ABIS.LOCKER);
    const tx = await locker.lockTokens(lockerState.tokenAddress, wei, time);
    await tx.wait();
    alert("Tokens trancados!");
    loadLocks();
}

async function loadLocks() {
    const list = document.getElementById('locksList');
    if (!list) return;
    try {
        const locker = web3Service.getContract(CONTRACTS.locker, ABIS.LOCKER);
        const myLocks = await locker.getLocksByOwner(web3Service.userAddress);
        if (myLocks.length === 0) { list.innerHTML = "Vazio."; return; }
        list.innerHTML = myLocks.map(l => `
            <div class="lock-card">
                <p>ID #${l}</p>
                <p>Valor: ${window.ethers.formatEther(l[101])}</p>
                <p>Libera: ${new Date(Number(l[102])*1000).toLocaleString()}</p>
                ${(new Date() > new Date(Number(l[102])*1000) && !l[103]) ? `<button onclick="window.withdrawLock(${l})">Sacar</button>` : ''}
            </div>
        `).join('');
    } catch (e) { list.innerHTML = "Erro ao buscar dados."; }
}

window.withdrawLock = async (id) => {
    const locker = web3Service.getContract(CONTRACTS.locker, ABIS.LOCKER);
    const tx = await locker.withdraw(id);
    await tx.wait();
    loadLocks();
};
