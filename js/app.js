// ==========================================
// 1. CONFIGURAÇÕES GLOBAIS
// ==========================================
let provider, signer, userAddress;
let currentDecimals = 18;
let uploadedLogoData = null; // Armazena a imagem do PFP em Base64

// Configuração Supabase (Banco de Dados para Rank)
const SUPABASE_URL = 'https://jfgiiuzqyqjbfaubdhja.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZ2lpdXpxeXFqYmZhdWJkaGphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTk2NzIsImV4cCI6MjA4MTQ3NTY3Mn0.4AZ_FIazsIlP5I_FPpAQh0lkIXRpBwGVfKVG3nwzxWA';
let supabaseClient = null;

try {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("✅ Banco de Dados conectado.");
    }
} catch(e) { console.log("Modo Offline (Sem Rank)"); }

// ==========================================
// 2. CONEXÃO WALLET
// ==========================================

window.connectWallet = async function() {
    const statusEl = document.getElementById("loginStatus");
    if(statusEl) statusEl.style.display = 'none';

    try {
        if (!window.ethereum) {
            alert("MetaMask não encontrada!");
            return;
        }
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        
        // Atualiza Botão
        const btn = document.getElementById("btnConnect");
        btn.innerText = `🟢 Conectado: ${userAddress.slice(0,6)}...`;
        btn.classList.add('btn-disconnect');
        btn.onclick = null; 

        // Mostra o App
        document.getElementById("navTabs").style.display = 'flex';
        log(`Conectado: ${userAddress}`, 'success');
        
        // Registra Usuário no Rank
        if(supabaseClient) checkRegister(userAddress);

    } catch (e) {
        console.error(e);
        log("Erro Conexão: " + (e.reason || e.message), 'error');
    }
}

// ==========================================
// 3. UTILS (UPLOADS E MODAL)
// ==========================================

// Upload da LOGO (PFP)
window.handleLogoUpload = function(input) {
    const file = input.files[0];
    if(file) {
        // Mostra o nome do arquivo para feedback
        document.getElementById('logoFileName').innerText = file.name;
        
        // Lê o arquivo para memória (Base64)
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedLogoData = e.target.result;
            log("Logo carregada com sucesso!", 'success');
        };
        reader.readAsDataURL(file);
    }
}

// Upload de Arquivo CSV/TXT (Multisender)
window.handleFileUpload = function(input) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('csvInput').value = e.target.result;
        log(`Lista carregada: ${file.name}`, 'success');
        updateSummary();
    };
    reader.readAsText(file);
}

// Contador de Carteiras
if(document.getElementById('csvInput')) {
    document.getElementById('csvInput').addEventListener('input', updateSummary);
}

function updateSummary() {
    const raw = document.getElementById("csvInput").value;
    const lines = raw.split(/\r?\n/).filter(l => l.trim() !== "");
    const count = lines.filter(l => l.includes('0x')).length;
    document.getElementById("multiSummary").innerText = `${count} carteiras detectadas`;
}

// Modal de Sucesso Dinâmico
window.showSuccessModal = function(title, msg, tweetText, txHash, imageUrl = null) {
    const modalTitle = document.getElementById("modalTitle");
    const modalMsg = document.getElementById("modalMsg");
    const iconSpan = document.querySelector(".success-icon");

    modalTitle.innerText = title;
    modalMsg.innerText = msg;
    
    // Se tiver Imagem (PFP), mostra ela. Se não, mostra Troféu.
    if (imageUrl) {
        iconSpan.innerHTML = `<img src="${imageUrl}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #00ff9d; box-shadow: 0 0 20px rgba(0,255,157,0.3);">`;
    } else {
        iconSpan.innerHTML = "🏆";
    }
    
    // Link do Twitter
    const url = "https://arcshield-v2.vercel.app";
    const finalUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}`;
    document.getElementById("shareBtn").href = finalUrl;
    
    // Link do Explorer
    if (txHash) {
        const explorerLink = `https://testnet.arcscan.app/tx/${txHash}`;
        const explorerBtn = document.getElementById("explorerBtn");
        explorerBtn.href = explorerLink;
        explorerBtn.style.display = "block";
    }

    document.getElementById("successModal").style.display = "flex";
}

window.closeSuccessModal = function() {
    document.getElementById("successModal").style.display = "none";
}

// ==========================================
// 4. LÓGICA CORE (CONTRATOS)
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

// --- 1. LAUNCHPAD (Com Branding) ---
window.createToken = async function() {
    const name = document.getElementById("tokenName").value;
    const symbol = document.getElementById("tokenSymbol").value;
    const supply = document.getElementById("tokenSupply").value;
    const desc = document.getElementById("tokenDesc").value.trim();
    
    // A variável uploadedLogoData já contém a imagem se o usuário fez upload
    
    if(!name || !symbol || !supply) return log("Preencha os campos obrigatórios!", 'error');
    
    try {
        const c = new ethers.Contract(CONTRACTS.factory, ABIS.factory, signer);
        log("Criando Token...", 'normal');
        
        const tx = await c.createToken(name, symbol, supply);
        await tx.wait(); 
        
        log(`Token ${symbol} Criado!`, 'success');
        if(supabaseClient) addPoints(100);

        // Prepara mensagem personalizada
        const tweetDesc = desc ? desc : `Criei o token $${symbol} na #ArcTestnet com Arc Shield! 🛡️`;
        const modalBody = `Contrato implantado com sucesso.\n${desc ? '"'+desc+'"' : ''}`;

        // Passa a imagem carregada (uploadedLogoData) para o modal
        showSuccessModal(`Token ${symbol} Criado! 🚀`, modalBody, tweetDesc, tx.hash, uploadedLogoData);

    } catch (e) { log("Erro: " + (e.reason || e.message), 'error'); }
}

// --- 2. MULTISENDER (Parser Inteligente) ---
window.sendBatch = async function() {
    const token = clean(document.getElementById("multiTokenAddr").value);
    const raw = document.getElementById("csvInput").value;
    
    if(!token || !raw) return log("Preencha o Token e a Lista.", 'error');

    const lines = raw.split(/\r?\n/);
    let rec=[], amt=[];
    
    for(let line of lines) {
        // Separa por vírgula, ponto-virgula, tab ou espaço
        let parts = line.split(/[;,\t\s]+/);
        parts = parts.filter(p => p.trim() !== "");

        if(parts.length >= 2) {
            const address = parts[0].trim();
            const value = parts[1].trim().replace(',', '.'); // Correção PT-BR
            
            if(ethers.isAddress(address)) {
                rec.push(address);
                try { amt.push(ethers.parseUnits(value, currentDecimals)); } catch(e){}
            }
        }
    }
    
    if(rec.length === 0) return log("Nenhuma carteira válida encontrada.", 'error');
    
    try {
        const c = new ethers.Contract(CONTRACTS.multi, ABIS.multi, signer);
        log(`Enviando para ${rec.length} carteiras...`);
        const tx = await c.multisendToken(token, rec, amt);
        await tx.wait();

        log("Enviado!", 'success');
        if(supabaseClient) addPoints(50);

        showSuccessModal(
            "Airdrop Concluído! 📨",
            `${rec.length} carteiras receberam seus tokens.`,
            `Disparei um Airdrop para ${rec.length} pessoas na #ArcTestnet via Arc Shield! 🛡️`,
            tx.hash
        );

    } catch (e) { log("Erro: " + (e.reason || e.message), 'error'); }
}

// --- 3. LOCKER (Validação de Data) ---
window.lockTokens = async function() {
    const token = clean(document.getElementById("lockTokenAddr").value);
    const amount = document.getElementById("lockAmount").value;
    const date = document.getElementById("lockDate").value;

    if(!token || !amount || !date) return log("Preencha todos os campos.", 'error');

    try {
        const safeAmount = amount.replace(',', '.');
        const wei = ethers.parseUnits(safeAmount, currentDecimals);
        const time = Math.floor(new Date(date).getTime() / 1000);
        
        if(time < Math.floor(Date.now()/1000)) return log("A data deve ser futura!", 'error');

        const c = new ethers.Contract(CONTRACTS.lock, ABIS.lock, signer);
        log("Trancando...");
        const tx = await c.lockTokens(token, wei, time);
        await tx.wait();

        log("Trancado!", 'success');
        if(supabaseClient) addPoints(50);

        showSuccessModal("Liquidez Trancada! 🔒", "Tokens seguros no Locker.", "Tranquei liquidez na #ArcTestnet via Arc Shield! 🛡️", tx.hash);

    } catch (e) { log("Erro: " + (e.reason || e.message), 'error'); }
}

// --- 4. VESTING (Salário) ---
window.createVesting = async function() {
    const token = clean(document.getElementById("vestTokenAddr").value);
    const bene = clean(document.getElementById("vestBeneficiary").value);
    const amount = document.getElementById("vestAmount").value;
    const dur = document.getElementById("vestDuration").value;

    if(!token || !bene || !amount || !dur) return log("Preencha todos os campos.", 'error');

    try {
        const safeAmount = amount.replace(',', '.');
        const wei = ethers.parseUnits(safeAmount, currentDecimals);
        const sec = parseInt(dur) * 60; // Minutos para Segundos
        
        const c = new ethers.Contract(CONTRACTS.vest, ABIS.vest, signer);
        log("Criando Vesting...");
        const tx = await c.createVestingSchedule(token, bene, Math.floor(Date.now()/1000), 0, sec, wei, true);
        await tx.wait();

        log("Criado!", 'success');
        if(supabaseClient) addPoints(75);

        showSuccessModal("Vesting Criado! ⏳", "Pagamento programado com sucesso.", "Criei um Vesting na #ArcTestnet via Arc Shield! 🛡️", tx.hash);

    } catch (e) { log("Erro: " + e.message, 'error'); }
}

// ==========================================
// 5. UTILS GERAIS
// ==========================================

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

window.detectDecimals = async function(mod) {
    const map = { multi: 'multiTokenAddr', lock: 'lockTokenAddr', vest: 'vestTokenAddr' };
    const addr = clean(document.getElementById(map[mod]).value);
    if(ethers.isAddress(addr) && signer) {
        try { 
            const c = new ethers.Contract(addr, ABIS.erc20, signer);
            currentDecimals = await c.decimals(); 
            const sym = await c.symbol();
            log(`Token detectado: ${sym} (Decimais: ${currentDecimals})`, 'success'); 
        } catch(e){currentDecimals=18;}
    }
}

window.approveToken = async function(mod) {
    const mapAddr = { multi: CONTRACTS.multi, lock: CONTRACTS.lock, vest: CONTRACTS.vest };
    const mapInput = { multi: 'multiTokenAddr', lock: 'lockTokenAddr', vest: 'vestTokenAddr' };
    const token = clean(document.getElementById(mapInput[mod]).value);
    if(!token) return log("Endereço Inválido", 'error');
    try {
        log("Aprovando gasto...");
        await (await new ethers.Contract(token, ABIS.erc20, signer).approve(mapAddr[mod], ethers.MaxUint256)).wait();
        log("Aprovado!", 'success');
    } catch(e) { log("Erro: "+e.message, 'error'); }
}

// --- SUPABASE & DASHBOARD ---

async function checkRegister(wallet) {
    try {
        let { data: user } = await supabaseClient.from('users').select('*').eq('wallet_address', wallet).single();
        if (!user) await supabaseClient.from('users').insert([{ wallet_address: wallet, points: 0 }]);
        else {
            const pName = document.getElementById('profileName');
            const pAvatar = document.getElementById('profileAvatar');
            if(user.username && pName) pName.value = user.username;
            if(user.avatar_url && pAvatar) pAvatar.value = user.avatar_url;
        }
    } catch(e) {}
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
        log("Perfil Salvo!", 'success'); window.loadLeaderboard();
    }
}

window.loadLeaderboard = async function() {
    const div = document.getElementById("leaderboardList");
    div.innerHTML = "<p>Buscando...</p>";
    if(!supabaseClient) { div.innerHTML = "<p>Offline (Sem DB)</p>"; return; }
    const { data: users } = await supabaseClient.from('users').select('*').order('points', { ascending: false }).limit(10);
    let html = "";
    users.forEach((u, i) => {
        html += `<div class="asset-card" style="align-items:center;"><div>#${i+1} <b>${u.username||u.wallet_address.substring(0,4)}...</b></div><div style="color:#00ff9d">${u.points} PTS</div></div>`;
    });
    div.innerHTML = html;
}

window.loadDashboardData = async function() {
    const div = document.getElementById("dashboardContent");
    div.innerHTML = "<p>Buscando na Blockchain...</p>";
    try {
        const c = new ethers.Contract(CONTRACTS.vest, ABIS.vest, signer);
        const count = await c.getUserScheduleCount(userAddress);
        let html = "";
        if(count > 0) {
            for(let i=0; i<count; i++) {
                const id = await c.getUserScheduleIdAtIndex(userAddress, i);
                const s = await c.schedules(id);
                // Calcula quanto já liberou
                const now = Math.floor(Date.now()/1000);
                const elapsed = now - Number(s.start);
                const total = Number(s.duration);
                const percent = Math.min((elapsed/total)*100, 100).toFixed(1);
                
                html += `
                <div class="asset-card">
                    <div>
                        <div style="font-size:0.8rem; color:#888;">Vesting ID #${id}</div>
                        <div><b>${ethers.formatEther(s.amountTotal)} Tokens</b></div>
                        <div style="font-size:0.75rem; color:${percent==100?'#00ff9d':'#orange'}">Liberado: ${percent}%</div>
                    </div>
                    <button class="mini-btn" onclick="claimVesting(${id})">SACAR</button>
                </div>`;
            }
        } else html = "<p class='hint'>Nenhum Vesting encontrado para sua carteira.</p>";
        div.innerHTML = html;
    } catch(e) { div.innerHTML = "Erro ao buscar dados."; console.log(e); }
}

window.claimVesting = async function(id) {
    try { 
        log("Processando Saque...");
        await (await new ethers.Contract(CONTRACTS.vest, ABIS.vest, signer).release(id)).wait(); 
        log("Saque realizado!", 'success'); 
        loadDashboardData(); 
    } catch(e){ log("Erro no Saque (Talvez nada a sacar agora)", 'error'); }
}
