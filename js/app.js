// ==========================================
// 1. UI & INICIALIZAÇÃO IMEDIATA
// ==========================================

// Esta função agora está blindada. Ela existe independente das bibliotecas.
window.startApp = function() {
    console.log("🚀 Iniciando aplicação...");
    const screen = document.getElementById('startScreen');
    const app = document.getElementById('appContainer');
    if(screen && app) {
        screen.style.display = 'none';
        app.style.display = 'flex';
    }
}

// ==========================================
// 2. CONFIGURAÇÕES & VARIÁVEIS
// ==========================================
let provider, signer, userAddress;
let currentDecimals = 18;
let web3auth = null;

const SUPABASE_URL = 'https://jfgiiuzqyqjbfaubdhja.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZ2lpdXpxeXFqYmZhdWJkaGphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTk2NzIsImV4cCI6MjA4MTQ3NTY3Mn0.4AZ_FIazsIlP5I_FPpAQh0lkIXRpBwGVfKVG3nwzxWA';
let supabaseClient = null;

// Tenta iniciar Supabase com segurança
try {
    if (window.supabase) supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch(e) { console.error("Supabase offline"); }

const ARC_CHAIN = {
    chainNamespace: "eip155",
    chainId: "0x4cefba",
    rpcTarget: "https://rpc.testnet.arc.network",
    displayName: "Arc Testnet",
    blockExplorer: "https://testnet.arcscan.app",
    ticker: "USDC",
    tickerName: "USDC",
};

const WEB3AUTH_CLIENT_ID = "BGRg-3_GuM3Qefz4iAu_aT9DVxIED7NoOpI4bEh_Ttl1mVuzC2F5Vm8r_BYjfbuo2CWbkezDMB5S_4HIyj48IkE"; 

// ==========================================
// 3. INICIALIZAÇÃO WEB3AUTH (ASSÍNCRONA)
// ==========================================

async function initWeb3Auth() {
    const statusEl = document.getElementById("loginStatus");
    try {
        // Verifica se a biblioteca window.modal existe (padrão do script unpkg)
        if (!window.modal || !window.modal.Web3Auth) {
            console.log("⚠️ Biblioteca Web3Auth ainda não carregou. Tentando em breve...");
            setTimeout(initWeb3Auth, 1000); // Tenta de novo em 1s
            return;
        }

        console.log("🛠️ Configurando Web3Auth...");
        
        web3auth = new window.modal.Web3Auth({
            clientId: WEB3AUTH_CLIENT_ID,
            web3AuthNetwork: "sapphire_devnet",
            chainConfig: ARC_CHAIN,
            uiConfig: {
                appName: "Arc Shield",
                mode: "dark",
                theme: "dark"
            }
        });

        await web3auth.initModal();
        console.log("✅ Web3Auth Pronto!");
        if(statusEl) statusEl.style.display = 'none';

    } catch (e) {
        console.error("Erro Web3Auth:", e);
        if(statusEl) {
            statusEl.innerText = "Erro Login Social: " + (e.message || "Bloqueio de Rede");
            statusEl.style.display = 'block';
        }
    }
}

// Inicia o Web3Auth em segundo plano, sem travar o site
window.onload = function() {
    initWeb3Auth();
};

// ==========================================
// 4. LÓGICA DE CONEXÃO
// ==========================================

window.connectWallet = async function(method) {
    const statusEl = document.getElementById("loginStatus");
    if(statusEl) { statusEl.innerText = "Conectando..."; statusEl.style.display = 'block'; }

    try {
        if (method === 'metamask') {
            if (!window.ethereum) throw new Error("Metamask não detectada.");
            provider = new ethers.BrowserProvider(window.ethereum);
            signer = await provider.getSigner();
        } 
        else if (method === 'social') {
            if (!web3auth) {
                // Tenta forçar o carregamento
                await initWeb3Auth();
                if(!web3auth) throw new Error("O sistema de login não carregou. Verifique sua conexão.");
            }
            if(!web3auth.provider) {
                await web3auth.connect();
            }
            if(!web3auth.provider) throw new Error("Login cancelado.");
            provider = new ethers.BrowserProvider(web3auth.provider);
            signer = await provider.getSigner();
        }

        userAddress = await signer.getAddress();
        
        // Sucesso na conexão
        document.getElementById("btnConnect").style.display = 'none';
        const btnSocial = document.getElementById("btnSocial");
        btnSocial.innerText = `🟢 ${userAddress.slice(0,6)}...`;
        btnSocial.classList.add('btn-disconnect');
        document.getElementById("navTabs").style.display = 'flex';
        if(statusEl) statusEl.style.display = 'none';
        
        log(`Conectado: ${userAddress}`, 'success');
        if(supabaseClient) checkRegister(userAddress);

    } catch (e) {
        console.error(e);
        log("Erro Conexão: " + e.message, 'error');
        if(statusEl) statusEl.innerText = "Erro: " + e.message;
    }
}

// ==========================================
// 5. FUNÇÕES DAPP
// ==========================================

const CONTRACTS = {
    factory: "0x3Ed7Fd9b5a2a77B549463ea1263516635c77eB0a",
    multi: "0x59BcE4bE3e31B14a0528c9249a0580eEc2E59032", 
    lock: "0x4475a197265Dd9c7CaF24Fe1f8cf63B6e9935452", 
    vest: "0xcC8a723917b0258280Ea1647eCDe13Ffa2E1D30b"  
};

const ABIS = {
    factory: ["function createToken(string name, string symbol, uint256 initialSupply) external", "event TokenCreated(address tokenAddress, string name, string symbol, address owner)"],
    multi: ["function multisendToken(address token, address[] recipients, uint256[] amounts) external payable"],
    lock: ["function lockTokens(address _token, uint256 _amount, uint256 _unlockTime) external", "function withdraw(uint256 _lockId) external", "function lockIdCounter() view returns (uint256)", "function locks(uint256) view returns (address owner, address token, uint256 amount, uint256 unlockTime, bool withdrawn)"],
    vest: ["function createVestingSchedule(address, address, uint256, uint256, uint256, uint256, bool) external", "function release(uint256) external", "function getUserScheduleCount(address) view returns (uint256)", "function getUserScheduleIdAtIndex(address, uint256) view returns (uint256)", "function schedules(uint256) view returns (uint256 scheduleId, address token, address beneficiary, uint256 amountTotal, uint256 released, uint256 start, uint256 duration)"],
    erc20: ["function approve(address spender, uint256 amount) external", "function decimals() view returns (uint8)", "function symbol() view returns (string)"]
};

// Funções Helpers
window.switchTab = function(tabId, btn) {
    document.querySelectorAll('.module-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
    if(tabId === 'dashboard') loadDashboardData();
    if(tabId === 'leaderboard') loadLeaderboard();
}

function log(msg, type='normal') {
    const area = document.getElementById("consoleArea");
    if(!area) return;
    const div = document.createElement("div");
    div.className = "log-entry " + (type==='success'?'log-success':type==='error'?'log-error':'');
    div.innerText = `> ${msg}`;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
}
function clean(val) { return val ? val.trim() : ""; }

async function checkRegister(wallet) {
    try {
        let { data: user } = await supabaseClient.from('users').select('*').eq('wallet_address', wallet).single();
        if (!user) {
            await supabaseClient.from('users').insert([{ wallet_address: wallet, points: 0 }]);
        } else {
            const pName = document.getElementById('profileName');
            const pAvatar = document.getElementById('profileAvatar');
            if(user.username && pName) pName.value = user.username;
            if(user.avatar_url && pAvatar) pAvatar.value = user.avatar_url;
        }
    } catch(e) {}
}

// Funções de Contrato
window.createToken = async function() {
    const name = document.getElementById("tokenName").value;
    const symbol = document.getElementById("tokenSymbol").value;
    const supply = document.getElementById("tokenSupply").value;
    if(!name || !supply) return log("Preencha tudo", 'error');
    try {
        const c = new ethers.Contract(CONTRACTS.factory, ABIS.factory, signer);
        log("Criando...", 'normal');
        await (await c.createToken(name, symbol, supply)).wait();
        log(`Token ${symbol} Criado!`, 'success');
        if(supabaseClient) addPoints(100);
    } catch (e) { log("Erro: " + (e.reason || e.message), 'error'); }
}

window.sendBatch = async function() {
    const token = clean(document.getElementById("multiTokenAddr").value);
    const raw = document.getElementById("csvInput").value.split(/\r?\n/);
    let rec=[], amt=[];
    for(let line of raw) {
        let p = line.split(',');
        if(p.length >= 2) {
            rec.push(p[0].trim());
            try { amt.push(ethers.parseUnits(p[1].trim(), currentDecimals)); } catch(e){}
        }
    }
    if(rec.length === 0) return log("Lista vazia", 'error');
    try {
        const c = new ethers.Contract(CONTRACTS.multi, ABIS.multi, signer);
        log(`Enviando para ${rec.length}...`);
        await (await c.multisendToken(token, rec, amt)).wait();
        log("Enviado!", 'success');
        if(supabaseClient) addPoints(50);
    } catch(e) { log("Erro: " + e.message, 'error'); }
}

window.lockTokens = async function() {
    const token = clean(document.getElementById("lockTokenAddr").value);
    const amount = document.getElementById("lockAmount").value;
    const date = document.getElementById("lockDate").value;
    try {
        const wei = ethers.parseUnits(amount, currentDecimals);
        const time = Math.floor(new Date(date).getTime() / 1000);
        const c = new ethers.Contract(CONTRACTS.lock, ABIS.lock, signer);
        log("Trancando...");
        await (await c.lockTokens(token, wei, time)).wait();
        log("Trancado!", 'success');
        if(supabaseClient) addPoints(50);
    } catch(e) { log("Erro: " + e.message, 'error'); }
}

window.createVesting = async function() {
    const token = clean(document.getElementById("vestTokenAddr").value);
    const bene = clean(document.getElementById("vestBeneficiary").value);
    const amount = document.getElementById("vestAmount").value;
    const dur = document.getElementById("vestDuration").value;
    try {
        const wei = ethers.parseUnits(amount, currentDecimals);
        const sec = parseInt(dur) * 60;
        const c = new ethers.Contract(CONTRACTS.vest, ABIS.vest, signer);
        log("Criando Vesting...");
        await (await c.createVestingSchedule(token, bene, Math.floor(Date.now()/1000), 0, sec, wei, true)).wait();
        log("Criado!", 'success');
        if(supabaseClient) addPoints(75);
    } catch(e) { log("Erro: " + e.message, 'error'); }
}

async function addPoints(pts) {
    if(!supabaseClient) return;
    let { data: u } = await supabaseClient.from('users').select('points').eq('wallet_address', userAddress).single();
    if(u) await supabaseClient.from('users').update({ points: (u.points||0)+pts }).eq('wallet_address', userAddress);
}

window.saveProfile = async function() {
    const name = document.getElementById("profileName").value;
    const av = document.getElementById("profileAvatar").value;
    if(userAddress) {
        await supabaseClient.from('users').update({ username: name, avatar_url: av }).eq('wallet_address', userAddress);
        log("Salvo!", 'success'); window.loadLeaderboard();
    }
}

window.loadLeaderboard = async function() {
    const div = document.getElementById("leaderboardList");
    div.innerHTML = "<p>Buscando...</p>";
    if(!supabaseClient) { div.innerHTML = "<p>Offline</p>"; return; }
    const { data: users } = await supabaseClient.from('users').select('*').order('points', { ascending: false }).limit(10);
    let html = "";
    users.forEach((u, i) => {
        html += `<div class="asset-card" style="align-items:center;"><div>#${i+1} <b>${u.username||u.wallet_address.substring(0,4)}</b></div><div style="color:#00ff9d">${u.points} PTS</div></div>`;
    });
    div.innerHTML = html;
}

window.detectDecimals = async function(mod) {
    const map = { multi: 'multiTokenAddr', lock: 'lockTokenAddr', vest: 'vestTokenAddr' };
    const addr = clean(document.getElementById(map[mod]).value);
    if(ethers.isAddress(addr) && signer) {
        try { currentDecimals = await new ethers.Contract(addr, ABIS.erc20, signer).decimals(); log(`Decimais: ${currentDecimals}`); } catch(e){currentDecimals=18;}
    }
}

window.approveToken = async function(mod) {
    const mapAddr = { multi: CONTRACTS.multi, lock: CONTRACTS.lock, vest: CONTRACTS.vest };
    const mapInput = { multi: 'multiTokenAddr', lock: 'lockTokenAddr', vest: 'vestTokenAddr' };
    const token = clean(document.getElementById(mapInput[mod]).value);
    try {
        log("Aprovando...");
        await (await new ethers.Contract(token, ABIS.erc20, signer).approve(mapAddr[mod], ethers.MaxUint256)).wait();
        log("Aprovado!", 'success');
    } catch(e) { log("Erro: "+e.message, 'error'); }
}

window.loadDashboardData = async function() {
    const div = document.getElementById("dashboardContent");
    div.innerHTML = "<p>Buscando...</p>";
    try {
        const c = new ethers.Contract(CONTRACTS.vest, ABIS.vest, signer);
        const count = await c.getUserScheduleCount(userAddress);
        let html = "";
        if(count > 0) {
            for(let i=0; i<count; i++) {
                const id = await c.getUserScheduleIdAtIndex(userAddress, i);
                const s = await c.schedules(id);
                html += `<div class="asset-card"><div>Vesting: ${ethers.formatEther(s.amountTotal)}</div><button class="mini-btn" onclick="claimVesting(${id})">SACAR</button></div>`;
            }
        } else html = "<p class='hint'>Nada encontrado.</p>";
        div.innerHTML = html;
    } catch(e) { div.innerHTML = "Erro ao buscar dados."; }
}

window.claimVesting = async function(id) {
    try { await (await new ethers.Contract(CONTRACTS.vest, ABIS.vest, signer).release(id)).wait(); log("Sacado!", 'success'); loadDashboardData(); } catch(e){ log("Erro", 'error'); }
}

window.withdrawLock = async function(id) {
    try { await (await new ethers.Contract(CONTRACTS.lock, ABIS.lock, signer).withdraw(id)).wait(); log("Cofre aberto!", 'success'); loadDashboardData(); } catch(e) { log(e.message, 'error'); }
}
