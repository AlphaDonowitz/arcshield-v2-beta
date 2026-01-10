import { web3Service } from '../services/web3Service.js';
import { bus } from '../core/eventBus.js';
import { ERC20_ABI, ERC20_BYTECODE } from '../config/tokenData.js';

export function initTokenFactory() {
    const container = document.getElementById('token-launcher');
    if (!container) return;
    container.innerHTML = `
        <div class="card">
            <h3>Token Factory</h3>
            <p>Crie tokens ERC20 padrão OpenZeppelin na Arc Testnet.</p>
            <input type="text" id="tkName" placeholder="Nome do Token">
            <input type="text" id="tkSymbol" placeholder="Símbolo">
            <input type="number" id="tkSupply" placeholder="Supply Inicial">
            <div id="deployStatus" style="display:none; padding: 15px; background: #000; margin-bottom: 10px; border-radius: 8px;">
                <p id="deployMsg">Aguardando...</p>
                <a id="explorerLink" target="_blank" style="display:none; color: var(--primary-blue);">Ver no Explorer</a>
            </div>
            <button id="btnCreateToken" class="btn-primary">Criar Token (Deploy)</button>
        </div>
    `;
    document.getElementById('btnCreateToken').addEventListener('click', deployToken);
}

async function deployToken() {
    const name = document.getElementById('tkName').value;
    const symbol = document.getElementById('tkSymbol').value;
    const supply = document.getElementById('tkSupply').value;
    if (!name || !symbol || !supply) return bus.emit('notification:error', "Campos vazios.");
    if (!web3Service.isConnected) return bus.emit('notification:error', "Conecte a carteira.");

    const btn = document.getElementById('btnCreateToken');
    const msg = document.getElementById('deployMsg');
    try {
        btn.disabled = true;
        btn.innerText = "Confirmando...";
        document.getElementById('deployStatus').style.display = 'block';
        
        const factory = new window.ethers.ContractFactory(ERC20_ABI, ERC20_BYTECODE, web3Service.signer);
        const amountWei = window.ethers.parseUnits(supply.toString(), 18);
        
        msg.innerText = "Assine a transação na MetaMask...";
        const contract = await factory.deploy(name, symbol, amountWei);
        msg.innerText = "Aguardando confirmação da rede...";
        await contract.waitForDeployment();
        
        const address = await contract.getAddress();
        msg.innerText = `Sucesso! Endereço: ${address}`;
        
        const link = document.getElementById('explorerLink');
        link.href = `${web3Service.getNetworkConfig().explorer}/address/${address}`;
        link.style.display = 'block';

        import('../services/socialService.js').then(m => {
            m.socialService.registerCreation({ name, symbol, address, supply, type: 'ERC20' });
        });
        bus.emit('notification:success', "Token criado!");
    } catch (e) {
        msg.innerText = "Erro: " + (e.reason || e.message);
        btn.disabled = false;
        btn.innerText = "Tentar Novamente";
    }
}
js/modules/locker.js (Versão V2 Otimizada)
Gestão de bloqueios on-chain integrada ao contrato 0xB56f....
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
