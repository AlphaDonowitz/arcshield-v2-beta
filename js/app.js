// ==========================================
// 1. VARIÁVEIS GLOBAIS E CONFIGURAÇÕES
// ==========================================
let provider, signer, userAddress;
let currentDecimals = 18;
let web3auth = null; // Instância do Web3Auth

// --- SUPABASE (BANCO DE DADOS) ---
const SUPABASE_URL = 'https://jfgiiuzqyqjbfaubdhja.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZ2lpdXpxeXFqYmZhdWJkaGphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTk2NzIsImV4cCI6MjA4MTQ3NTY3Mn0.4AZ_FIazsIlP5I_FPpAQh0lkIXRpBwGVfKVG3nwzxWA';

let supabaseClient = null;
try {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("✅ Banco de Dados conectado.");
    }
} catch (error) { console.error("Erro Supabase:", error); }

// --- WEB3AUTH (CONFIGURAÇÃO) ---
const WEB3AUTH_CLIENT_ID = "BGRg-3_GuM3Qefz4iAu_aT9DVxIED7NoOpI4bEh_Ttl1mVuzC2F5Vm8r_BYjfbuo2CWbkezDMB5S_4HIyj48IkE"; 

const ARC_CHAIN_CONFIG = {
    chainNamespace: "eip155",
    chainId: "0x4cefba", // ID 5042002 em Hex
    rpcTarget: "https://rpc.testnet.arc.network",
    displayName: "Arc Testnet",
    blockExplorerUrl: "https://testnet.arcscan.app",
    ticker: "USDC",
    tickerName: "USDC",
};

// ==========================================
// 2. CONTRATOS (VERIFICADOS)
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

// ==========================================
// 3. INICIALIZAÇÃO & UI (COM RETRY LOGIC)
// ==========================================

// Função Global startApp (A que estava falhando)
window.startApp = function() {
    console.log("Botão Iniciar clicado."); // Debug no console
    const screen = document.getElementById('startScreen');
    const app = document.getElementById('appContainer');
    if(screen && app) {
        screen.style.display = 'none';
        app.style.display = 'flex';
    } else {
        console.error("Erro: Elementos da tela não encontrados.");
    }
}

// Lógica de Inicialização do Web3Auth com tentativas
async function initWeb3AuthRetry(attempts = 0) {
    if (attempts > 15) {
        console.error("❌ Desisto: Web3Auth não carregou após várias tentativas.");
        return;
    }

    // Procura a biblioteca no window.modal (onde o CDN injeta)
    const library = window.modal; 

    if (library && library.Web3Auth) {
        try {
            web3auth = new library.Web3Auth({
                clientId: WEB3AUTH_CLIENT_ID,
                web3AuthNetwork: "sapphire_devnet", 
                chainConfig: ARC_CHAIN_CONFIG,
            });
            await web3auth.initModal();
            console.log("✅ Web3Auth Iniciado com Sucesso!");
        } catch (e) {
            console.error("❌ Erro ao configurar Web3Auth:", e);
        }
    } else {
        console.log(`⏳ Aguardando Web3Auth... (${attempts}/15)`);
        setTimeout(() => initWeb3AuthRetry(attempts + 1), 1000); // Tenta a cada 1 segundo
    }
}

// Inicia tudo quando a página carrega
window.onload = function() {
    initWeb3AuthRetry();
};

function log(msg, type='normal') {
    const area = document.getElementById("consoleArea");
    if(!area) return;
    const div = document.createElement("div");
    div.className = "log-entry " + (type === 'success' ? 'log-success' : type === 'error' ? 'log-error' : '');
    div.innerText = `> ${msg}`;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
}

window.switchTab = function(tabId, btn) {
    document.querySelectorAll('.module-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(tabId);
    if(target) {
        target.classList.add('active');
        btn.classList.add('active');
        if(tabId === 'dashboard') loadDashboardData();
        if(tabId === 'leaderboard') loadLeaderboard();
    }
}

function clean(val) { return val ? val.trim() : ""; }

// ==========================================
// 4. LÓGICA DE CONEXÃO (HÍBRIDA)
// ==========================================
window.connectWallet = async function(method) {
    try {
        if (method === 'metamask') {
            if (!window.ethereum) return alert("Instale a Metamask!");
            provider = new ethers.BrowserProvider(window.ethereum);
            signer = await provider.getSigner();
        } 
        else if (method === 'social') {
            if (!web3auth) return alert("Web3Auth ainda está carregando... aguarde 5 segundos.");
            if (!web3auth.provider) { // Se não estiver conectado ainda
                await web3auth.connect(); 
            }
            provider = new ethers.BrowserProvider(web3auth.provider);
            signer = await provider.getSigner();
        }

        userAddress = await signer.getAddress();
        
        // Atualiza UI
        const btnConnect = document.getElementById("btnConnect");
        const btnSocial = document.getElementById("btnSocial");
        
        if(btnSocial) {
            btnSocial.innerText = `🟢 Conectado: ${userAddress.slice(0,6)}...`;
            btnSocial.classList.add('btn-disconnect');
        }
        if(btnConnect) btnConnect.style.display = 'none'; // Esconde o botão metamask para limpar a tela
        
        const nav = document.getElementById("navTabs");
        if(nav) nav.style.display = 'flex';
        
        log(`Conectado via ${method.toUpperCase()}: ${userAddress}`, 'success');

        if(supabaseClient) checkAndRegisterUser(userAddress);

    } catch (e) { 
        console.error(e);
        log("Erro ao conectar: " + (e.message || e.reason), 'error'); 
    }
}

async function checkAndRegisterUser(wallet) {
    try {
        let { data: user } = await supabaseClient.from('users').select('*').eq('wallet_address', wallet).single();

        if (!user) {
            log("🆕 Criando conta no Ranking...", 'normal');
            await supabaseClient.from('users').insert([{ wallet_address: wallet, points: 0 }]);
            log("✅ Conta criada!", 'success');
        } else {
            log(`👋 Olá, ${user.username || 'Operador'}!`, 'success');
            const pName = document.getElementById('profileName');
            const pAvatar = document.getElementById('profileAvatar');
            if(user.username && pName) pName.value = user.username;
            if(user.avatar_url && pAvatar) pAvatar.value = user.avatar_url;
        }
    } catch(e) { console.error("Erro Supabase:", e); }
}

// ==========================================
// 5. FUNÇÕES OPERACIONAIS (DAPP)
// ==========================================

window.createToken = async function() {
    const name = document.getElementById("tokenName").value;
    const symbol = document.getElementById("tokenSymbol").value;
    const supply = document.getElementById("tokenSupply").value;
    if(!name || !supply) return log("Preencha os campos!", 'error');

    try {
        const factory = new ethers.Contract(CONTRACTS.factory, ABIS.factory, signer);
        log("Criando Token...", 'normal');
        const tx = await factory.createToken(name, symbol, supply);
        await tx.wait();
        log(`Token ${symbol} Criado!`, 'success');
        if(supabaseClient) addPoints(100);
    } catch (e) { log("Erro Criação: " + (e.reason || e.message), 'error'); }
}

async function addPoints(amount) {
    if(!supabaseClient) return;
    try {
        let { data: user } = await supabaseClient.from('users').select('points').eq('wallet_address', userAddress).single();
        if(user) {
            const newScore = (user.points || 0) + amount;
            await supabaseClient.from('users').update({ points: newScore }).eq('wallet_address', userAddress);
            log(`🏆 +${amount} PONTOS!`, 'success');
        }
    } catch(e) { console.error(e); }
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
    if(rec.length === 0) return log("Lista vazia ou inválida", 'error');

    try {
        const c = new ethers.Contract(CONTRACTS.multi, ABIS.multi, signer);
        log(`Enviando para ${rec.length} carteiras...`);
        const tx = await c.multisendToken(token, rec, amt);
        await tx.wait();
        log("🏆 Disparo Concluído!", 'success');
        if(supabaseClient) addPoints(50);
    } catch(e) { log("Erro Envio: " + (e.reason || e.message), 'error'); }
}

window.lockTokens = async function() {
    const token = clean(document.getElementById("lockTokenAddr").value);
    const amount = document.getElementById("lockAmount").value;
    const date = document.getElementById("lockDate").value;
    if(!amount || !date) return log("Preencha tudo", 'error');
    try {
        const wei = ethers.parseUnits(amount, currentDecimals);
        const time = Math.floor(new Date(date).getTime() / 1000);
        const c = new ethers.Contract(CONTRACTS.lock, ABIS.lock, signer);
        log("Trancando Liquidez...");
        const tx = await c.lockTokens(token, wei, time);
        await tx.wait();
        log("🔒 Tokens Trancados!", 'success');
        if(supabaseClient) addPoints(50);
    } catch(e) { log("Erro Lock: " + (e.reason || e.message), 'error'); }
}

window.createVesting = async function() {
    const token = clean(document.getElementById("vestTokenAddr").value);
    const beneficiary = clean(document.getElementById("vestBeneficiary").value);
    const amount = document.getElementById("vestAmount").value;
    const duration = document.getElementById("vestDuration").value;
    if(!amount || !duration) return log("Dados incompletos", 'error');
    try {
        const wei = ethers.parseUnits(amount, currentDecimals);
        const sec = parseInt(duration) * 60;
        const c = new ethers.Contract(CONTRACTS.vest, ABIS.vest, signer);
        log("Criando Salário...");
        const tx = await c.createVestingSchedule(token, beneficiary, Math.floor(Date.now()/1000), 0, sec, wei, true);
        await tx.wait();
        log("⏳ Salário Criado!", 'success');
        if(supabaseClient) addPoints(75);
    } catch(e) { log("Erro Vesting: " + (e.reason || e.message), 'error'); }
}

window.saveProfile = async function() {
    if(!supabaseClient) return log("Erro de conexão com Rank.", 'error');
    const name = document.getElementById("profileName").value;
    const avatar = document.getElementById("profileAvatar").value;
    if(!userAddress) return log("Conecte a carteira.", 'error');

    log("Salvando perfil...", 'normal');
    const { error } = await supabaseClient
        .from('users')
        .update({ username: name, avatar_url: avatar })
        .eq('wallet_address', userAddress);

    if(error) log("Erro ao salvar: " + error.message, 'error');
    else {
        log("💾 Perfil salvo!", 'success');
        loadLeaderboard();
    }
}

window.loadLeaderboard = async function() {
    const listDiv = document.getElementById("leaderboardList");
    if(!listDiv) return;
    listDiv.innerHTML = "<p class='hint'>Buscando...</p>";
    
    if(!supabaseClient) {
        listDiv.innerHTML = "<p class='hint'>Ranking Offline</p>";
        return;
    }

    const { data: users, error } = await supabaseClient.from('users').select('*').order('points', { ascending: false }).limit(10);
    if (error || !users) { listDiv.innerHTML = "<p class='hint'>Erro ao carregar.</p>"; return; }

    let html = "";
    users.forEach((u, index) => {
        const isMe = userAddress && u.wallet_address.toLowerCase() === userAddress.toLowerCase() ? "border: 1px solid #00ff9d;" : "";
        const avatar = u.avatar_url || "https://placehold.co/35x35/1a1a1a/white?text=?";
        const name = u.username || `Operador ${u.wallet_address.substring(0,4)}`;
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index+1}`;

        html += `
        <div class="asset-card" style="${isMe} align-items: center; gap: 10px;">
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:1.2rem; width:30px;">${medal}</span>
                <img src="${avatar}" style="width:35px; height:35px; border-radius:50%; object-fit:cover; border:1px solid #333;" onerror="this.src='https://placehold.co/35x35/1a1a1a/white?text=?'">
                <div>
                    <div style="color:white; font-weight:bold;">${name}</div>
                    <div class="asset-sub">${u.wallet_address.substring(0,6)}...</div>
                </div>
            </div>
            <div class="asset-val" style="color: #00ff9d;">${u.points} PTS</div>
        </div>`;
    });
    listDiv.innerHTML = html;
}

window.detectDecimals = async function(module) {
    const map = { multi: 'multiTokenAddr', lock: 'lockTokenAddr', vest: 'vestTokenAddr' };
    const addr = clean(document.getElementById(map[module]).value);
    if(!ethers.isAddress(addr) || !signer) return;
    try {
        const c = new ethers.Contract(addr, ABIS.erc20, signer);
        currentDecimals = await c.decimals();
        log(`Decimais: ${currentDecimals}`);
    } catch(e) { currentDecimals = 18; }
}

window.approveToken = async function(module) {
    const mapAddr = { multi: CONTRACTS.multi, lock: CONTRACTS.lock, vest: CONTRACTS.vest };
    const mapInput = { multi: 'multiTokenAddr', lock: 'lockTokenAddr', vest: 'vestTokenAddr' };
    const spender = mapAddr[module];
    const token = clean(document.getElementById(mapInput[module]).value);
    if(!ethers.isAddress(token)) return log("Token Inválido", 'error');
    try {
        const c = new ethers.Contract(token, ABIS.erc20, signer);
        log("Aprovando...");
        await (await c.approve(spender, ethers.MaxUint256)).wait();
        log("✅ Aprovado!", 'success');
    } catch(e) { log("Erro Approve: " + (e.reason || e.message), 'error'); }
}

window.loadDashboardData = async function() {
    const div = document.getElementById("dashboardContent");
    if(!div) return;
    div.innerHTML = "<p class='hint'>Buscando...</p>";
    try {
        const vestC = new ethers.Contract(CONTRACTS.vest, ABIS.vest, signer);
        const count = await vestC.getUserScheduleCount(userAddress);
        let html = "";
        if(count > 0) {
            html += `<label>Salários (${count})</label>`;
            for(let i=0; i<count; i++) {
                const id = await vestC.getUserScheduleIdAtIndex(userAddress, i);
                const s = await vestC.schedules(id);
                const total = ethers.formatEther(s.amountTotal);
                html += `<div class="asset-card"><div><div class="asset-val">${parseFloat(total).toFixed(2)} Tokens</div></div><button class="mini-btn" onclick="claimVesting(${id})">SACAR</button></div>`;
            }
        } else { html += "<p class='hint'>Sem salários.</p>"; }
        div.innerHTML = html;
    } catch(e) { div.innerHTML = "Erro ao carregar."; }
}

window.claimVesting = async function(id) {
    try { await (await new ethers.Contract(CONTRACTS.vest, ABIS.vest, signer).release(id)).wait(); log("Saque ok!", 'success'); loadDashboardData(); } catch(e){ log("Erro", 'error'); }
}

window.withdrawLock = async function(id) {
    try { await (await new ethers.Contract(CONTRACTS.lock, ABIS.lock, signer).withdraw(id)).wait(); log("Cofre aberto!", 'success'); loadDashboardData(); } catch(e) { log(e.message, 'error'); }
}
