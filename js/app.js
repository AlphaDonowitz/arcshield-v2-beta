// ==========================================
// 1. CONFIGURAÇÕES GLOBAIS & CONSTANTES
// ==========================================
let provider, signer, userAddress;
let currentDecimals = 18;
let uploadedLogoData = null; 

// ARC TESTNET
const ARC_CHAIN_ID = '0x4c9a62'; // 5042002
const ARC_RPC_URL = 'https://rpc.testnet.arc.network';
const ARC_EXPLORER = 'https://testnet.arcscan.app';

// CCTP CONFIG (Official Testnet Addresses)
const CCTP_CONFIG = {
    sepolia: {
        chainId: '0xaa36a7', // 11155111
        rpc: 'https://rpc.sepolia.org',
        domainId: 0, 
        usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", 
        tokenMessenger: "0xBd3fa81B58Ba92a82136038B25aDec7066af3155", 
        messageTransmitter: "0x7865f4c4f164ea385d3b428b234c2489e59656c6"
    },
    arc: {
        chainId: '0x4c9a62', // 5042002
        domainId: 26, 
        usdc: "0x3600000000000000000000000000000000000000", 
        tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA", 
        messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275"
    }
};

// CONTRACTS & ABIS
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
    erc20: ["function approve(address spender, uint256 amount) external returns (bool)", "function decimals() view returns (uint8)", "function symbol() view returns (string)", "function allowance(address owner, address spender) view returns (uint256)"],
    tokenMessenger: ["function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64 _nonce)"],
    messageTransmitter: ["function receiveMessage(bytes calldata message, bytes calldata attestation) external returns (bool)"]
};

// SUPABASE
const SUPABASE_URL = 'https://jfgiiuzqyqjbfaubdhja.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZ2lpdXpxeXFqYmZhdWJkaGphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTk2NzIsImV4cCI6MjA4MTQ3NTY3Mn0.4AZ_FIazsIlP5I_FPpAQh0lkIXRpBwGVfKVG3nwzxWA';
let supabaseClient = null;

try {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("✅ DB conectado.");
    }
} catch(e) { console.log("Modo Offline"); }

// ==========================================
// 2. NAVEGAÇÃO & UI LOGIC (V3 DASHBOARD)
// ==========================================

// Inicialização
window.onload = async function() {
    // Verifica desconexão manual
    if (localStorage.getItem('userDisconnected') === 'true') {
        console.log("Status: Desconectado manualmente.");
        return; 
    }
    // Tenta reconectar sessão existente
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
                // Pula a Landing Page se já estiver conectado
                document.getElementById('landingPage').style.display = 'none';
                document.getElementById('dashboardLayout').style.display = 'flex';
                
                provider = new ethers.BrowserProvider(window.ethereum);
                signer = await provider.getSigner();
                userAddress = await signer.getAddress();
                setupUIConnected();
            }
        } catch(e) { console.log("Sem sessão anterior."); }
    }
};

// Entrar no App (Botão da Landing)
window.enterApp = function() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('dashboardLayout').style.display = 'flex';
    
    const hasSeenTutorial = localStorage.getItem('arcShieldTutorial');
    if (!hasSeenTutorial) {
        document.getElementById('tutorialOverlay').style.display = 'flex';
    }
}

// Navegação do Menu
window.navigate = function(pageId, btnElement) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');

    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    const titles = {
        'creator': 'Launchpad',
        'multisender': 'Multisender',
        'locker': 'Liquidity Locker',
        'vesting': 'Vesting',
        'bridge': 'Bridge CCTP',
        'leaderboard': 'Ranking'
    };
    document.getElementById('pageTitle').innerText = titles[pageId];
}

// Tutorial
window.nextTutorial = function(step) {
    document.querySelectorAll('.tut-step').forEach(el => el.classList.remove('active'));
    document.getElementById(`tutStep${step}`).classList.add('active');
}
window.finishTutorial = function() {
    document.getElementById('tutorialOverlay').style.display = 'none';
    localStorage.setItem('arcShieldTutorial', 'true');
}

// Utils de Arquivo
window.handleLogoUpload = function(input) {
    if(input.files && input.files[0]) {
        document.getElementById('logoFileName').innerText = input.files[0].name;
        const reader = new FileReader();
        reader.onload = function(e) { uploadedLogoData = e.target.result; };
        reader.readAsDataURL(input.files[0]);
    }
}
window.handleFileUpload = function(input) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) { 
        document.getElementById('csvInput').value = e.target.result; 
        updateSummary();
    };
    reader.readAsText(file);
}
function updateSummary() {
    const raw = document.getElementById("csvInput").value;
    const lines = raw.split(/\r?\n/).filter(l => l.trim() !== "");
    const count = lines.filter(l => l.includes('0x')).length;
    document.getElementById("multiSummary").innerText = `${count} endereços detectados`;
}
if(document.getElementById('csvInput')) document.getElementById('csvInput').addEventListener('input', updateSummary);


// ==========================================
// 3. WEB3 CONNECTION (NUCLEAR & NETWORK)
// ==========================================
window.connectWallet = async function() {
    localStorage.removeItem('userDisconnected');
    try {
        if (!window.ethereum) { alert("Sem carteira!"); return; }
        
        // Nuclear: Força permissão
        try {
            await window.ethereum.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
        } catch (permError) {
            if (permError.code === 4001) return; // User cancelou
        }

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (!accounts || accounts.length === 0) return;

        provider = new ethers.BrowserProvider(window.ethereum);
        
        // Garante Arc no início (exceto se for usar Bridge que muda rede)
        await ensureNetwork('arc');

        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        setupUIConnected();

    } catch (e) { console.error(e); }
}

function setupUIConnected() {
    const btn = document.getElementById("btnConnect");
    // Formata endereço curto: 0x1234...5678
    btn.innerText = "🟢 " + userAddress.slice(0,6) + "..." + userAddress.slice(-4);
    btn.classList.add('btn-disconnect');
    btn.onclick = disconnectWallet; 
    
    if(supabaseClient) checkRegister(userAddress);
    
    // Auto-fill bridge recipient
    if(document.getElementById('bridgeRecipient')) {
        document.getElementById('bridgeRecipient').value = userAddress;
    }
}

window.disconnectWallet = async function() {
    localStorage.setItem('userDisconnected', 'true');
    try { await window.ethereum.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] }); } catch (e) {}
    provider = null; signer = null; userAddress = null;
    window.location.reload();
}

async function ensureNetwork(networkKey) {
    const targetChain = networkKey === 'sepolia' ? CCTP_CONFIG.sepolia.chainId : ARC_CHAIN_ID;
    const rpc = networkKey === 'sepolia' ? CCTP_CONFIG.sepolia.rpc : ARC_RPC_URL;
    const label = networkKey === 'sepolia' ? 'Sepolia' : 'Arc Testnet';
    const currency = networkKey === 'sepolia' ? { name: 'ETH', symbol: 'ETH', decimals: 18 } : { name: 'USDC', symbol: 'USDC', decimals: 6 };
    const explorer = networkKey === 'sepolia' ? ['https://sepolia.etherscan.io'] : [ARC_EXPLORER];

    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: targetChain }],
        });
    } catch (switchError) {
        if (switchError.code === 4902) {
             await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: targetChain,
                    chainName: label,
                    nativeCurrency: currency,
                    rpcUrls: [rpc],
                    blockExplorerUrls: explorer
                }]
            });
        }
    }
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
}

// ==========================================
// 4. BRIDGE CCTP LOGIC
// ==========================================
let currentBridgeMode = 'deposit';

window.setBridgeMode = function(mode) {
    currentBridgeMode = mode;
    document.getElementById('btnModeDeposit').classList.toggle('active', mode === 'deposit');
    document.getElementById('btnModeClaim').classList.toggle('active', mode === 'claim');
    document.getElementById('bridgeDepositArea').style.display = mode === 'deposit' ? 'block' : 'none';
    document.getElementById('bridgeClaimArea').style.display = mode === 'claim' ? 'block' : 'none';
}

window.approveUSDC = async function() {
    await ensureNetwork('sepolia');
    const amountStr = document.getElementById('bridgeAmount').value;
    if(!amountStr || parseFloat(amountStr) <= 0) return alert("Valor inválido");

    const amountWei = ethers.parseUnits(amountStr, 6);
    const usdc = new ethers.Contract(CCTP_CONFIG.sepolia.usdc, ABIS.erc20, signer);
    
    setLoading('btnApproveCCTP', true);
    try {
        const tx = await usdc.approve(CCTP_CONFIG.sepolia.tokenMessenger, amountWei);
        await tx.wait();
        alert("Aprovado!");
        document.getElementById('btnBurnCCTP').disabled = false;
    } catch(e) { console.error(e); alert("Erro Approve"); } 
    finally { setLoading('btnApproveCCTP', false); }
}

window.burnUSDC = async function() {
    await ensureNetwork('sepolia');
    const amountStr = document.getElementById('bridgeAmount').value;
    const amountWei = ethers.parseUnits(amountStr, 6);
    const recipient = ethers.zeroPadValue(userAddress, 32);
    
    const messenger = new ethers.Contract(CCTP_CONFIG.sepolia.tokenMessenger, ABIS.tokenMessenger, signer);
    setLoading('btnBurnCCTP', true);
    try {
        const tx = await messenger.depositForBurn(
            amountWei, 
            CCTP_CONFIG.arc.domainId, 
            recipient, 
            CCTP_CONFIG.sepolia.usdc
        );
        await tx.wait();
        showSuccessModal("Bridge Iniciada! 🌉", "Aguarde ~15min e pegue a assinatura na Circle.", "Transferindo USDC para Arc! 🛡️", tx.hash);
    } catch(e) { console.error(e); alert("Erro Burn"); } 
    finally { setLoading('btnBurnCCTP', false); }
}

window.mintUSDC = async function() {
    await ensureNetwork('arc');
    const message = document.getElementById('cctpMessageBytes').value.trim();
    const attestation = document.getElementById('cctpAttestation').value.trim();
    if(!message || !attestation) return alert("Preencha Mensagem e Assinatura!");

    const transmitter = new ethers.Contract(CCTP_CONFIG.arc.messageTransmitter, ABIS.messageTransmitter, signer);
    setLoading('btnClaimCCTP', true);
    try {
        const tx = await transmitter.receiveMessage(message, attestation);
        await tx.wait();
        showSuccessModal("Bridge Finalizada! 🌈", "USDC Creditado na Arc.", "Recebi USDC via CCTP! 🛡️", tx.hash);
    } catch(e) { console.error(e); alert("Erro Mint ou Já processado."); } 
    finally { setLoading('btnClaimCCTP', false); }
}


// ==========================================
// 5. MÓDULOS PADRÃO (Launchpad, etc)
// ==========================================
window.createToken = async function() {
    await ensureNetwork('arc');
    const name = document.getElementById("tokenName").value;
    const symbol = document.getElementById("tokenSymbol").value;
    const supply = document.getElementById("tokenSupply").value;
    const desc = document.getElementById("tokenDesc").value.trim();
    if(!name || !symbol || !supply) return alert("Preencha campos!");
    
    setLoading('btnCreate', true); 
    try {
        const c = new ethers.Contract(CONTRACTS.factory, ABIS.factory, signer);
        const tx = await c.createToken(name, symbol, supply);
        const receipt = await tx.wait(); 
        let deployedAddr = null;
        try { for (const log of receipt.logs) { try { const parsed = c.interface.parseLog(log); if (parsed.name === 'TokenCreated') { deployedAddr = parsed.args[0]; break; } } catch (e) {} } } catch(e) {}
        
        if(supabaseClient) addPoints(100);
        const cardImage = await generateSocialCard(name, symbol, supply, uploadedLogoData);
        const tweetDesc = desc ? desc : `Criei o token $${symbol} na #ArcTestnet!`;
        showSuccessModal(`Token ${symbol} Criado!`, "Sucesso!", tweetDesc, tx.hash, uploadedLogoData, cardImage, deployedAddr);
    } catch (e) { console.error(e); alert("Erro ao criar token."); } finally { setLoading('btnCreate', false); }
}

window.sendBatch = async function() {
    await ensureNetwork('arc');
    const token = document.getElementById("multiTokenAddr").value.trim();
    const raw = document.getElementById("csvInput").value;
    if(!token || !raw) return alert("Preencha campos");
    
    setLoading('btnMulti', true);
    try {
        const lines = raw.split(/\r?\n/); let rec=[], amt=[]; 
        for(let line of lines) { 
            let parts = line.split(/[;,\t\s]+/); parts = parts.filter(p => p.trim() !== ""); 
            if(parts.length >= 2) { 
                const address = parts[0].trim(); const value = parts[1].trim().replace(',', '.'); 
                if(ethers.isAddress(address)) { 
                    rec.push(address); 
                    try { amt.push(ethers.parseUnits(value, currentDecimals)); } catch(e){} 
                } 
            } 
        }
        if(rec.length === 0) throw new Error("Sem destinatários válidos");
        const c = new ethers.Contract(CONTRACTS.multi, ABIS.multi, signer);
        const tx = await c.multisendToken(token, rec, amt);
        await tx.wait();
        if(supabaseClient) addPoints(50);
        showSuccessModal("Airdrop Concluído!", `${rec.length} carteiras receberam.`, `Airdrop para ${rec.length} via Arc Shield!`, tx.hash);
    } catch (e) { console.error(e); alert("Erro Multisender"); } finally { setLoading('btnMulti', false); }
}

window.lockTokens = async function() {
    await ensureNetwork('arc');
    const token = document.getElementById("lockTokenAddr").value.trim();
    const amount = document.getElementById("lockAmount").value;
    const date = document.getElementById("lockDate").value;
    if(!token || !amount || !date) return alert("Preencha todos");
    
    setLoading('btnLock', true);
    try {
        const wei = ethers.parseUnits(amount.replace(',', '.'), currentDecimals);
        const time = Math.floor(new Date(date).getTime() / 1000);
        const c = new ethers.Contract(CONTRACTS.lock, ABIS.lock, signer);
        const tx = await c.lockTokens(token, wei, time);
        await tx.wait();
        if(supabaseClient) addPoints(50);
        showSuccessModal("Liquidez Trancada!", "Tokens seguros.", "Tranquei liquidez via Arc Shield!", tx.hash);
    } catch (e) { console.error(e); alert("Erro Lock"); } finally { setLoading('btnLock', false); }
}

window.createVesting = async function() {
    await ensureNetwork('arc');
    const token = document.getElementById("vestTokenAddr").value.trim();
    const bene = document.getElementById("vestBeneficiary").value.trim();
    const amount = document.getElementById("vestAmount").value;
    const dur = document.getElementById("vestDuration").value;
    if(!token || !bene || !amount || !dur) return alert("Preencha todos");
    
    setLoading('btnVest', true);
    try {
        const wei = ethers.parseUnits(amount.replace(',', '.'), currentDecimals);
        const sec = parseInt(dur) * 60;
        const c = new ethers.Contract(CONTRACTS.vest, ABIS.vest, signer);
        const tx = await c.createVestingSchedule(token, bene, Math.floor(Date.now()/1000), 0, sec, wei, true);
        await tx.wait();
        if(supabaseClient) addPoints(75);
        showSuccessModal("Vesting Criado!", "Pagamento programado.", "Criei Vesting via Arc Shield!", tx.hash);
    } catch (e) { console.error(e); alert("Erro Vesting"); } finally { setLoading('btnVest', false); }
}

// UTILS
window.approveToken = async function(mod) { 
    await ensureNetwork('arc'); 
    const mapAddr = { multi: CONTRACTS.multi, lock: CONTRACTS.lock, vest: CONTRACTS.vest }; 
    const mapInput = { multi: 'multiTokenAddr', lock: 'lockTokenAddr', vest: 'vestTokenAddr' }; 
    const token = document.getElementById(mapInput[mod]).value.trim(); 
    if(!token) return alert("Token Inválido"); 
    try { 
        // Detect decimals first
        const c = new ethers.Contract(token, ABIS.erc20, signer);
        currentDecimals = await c.decimals();
        const tx = await c.approve(mapAddr[mod], ethers.MaxUint256);
        await tx.wait(); 
        alert("Aprovado!"); 
    } catch(e) { console.error(e); alert("Erro Approve"); } 
}

window.loadDashboardData = async function() { 
    const div = document.getElementById("dashboardContent"); 
    div.innerHTML = "Buscando..."; 
    if(!signer) return div.innerHTML = "Conecte a carteira";
    try { 
        const c = new ethers.Contract(CONTRACTS.vest, ABIS.vest, signer); 
        const count = await c.getUserScheduleCount(userAddress); 
        let html = ""; 
        if(count > 0) { 
            for(let i=0; i<count; i++) { 
                const id = await c.getUserScheduleIdAtIndex(userAddress, i); 
                const s = await c.schedules(id); 
                html += `<div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px;"><span>Vesting #${id}</span> <span>${ethers.formatEther(s.amountTotal)} Tokens</span> <button class="mini-btn" onclick="claimVesting(${id})">Sacar</button></div>`; 
            } 
        } else html = "Nenhum vesting encontrado."; 
        div.innerHTML = html; 
    } catch(e) { div.innerHTML = "Erro ao buscar dados."; } 
}

window.claimVesting = async function(id) { 
    try { await (await new ethers.Contract(CONTRACTS.vest, ABIS.vest, signer).release(id)).wait(); alert("Sacado!"); loadDashboardData(); } catch(e){ alert("Erro saque"); } 
}

async function checkRegister(wallet) { try { let { data: user } = await supabaseClient.from('users').select('*').eq('wallet_address', wallet).single(); if (!user) await supabaseClient.from('users').insert([{ wallet_address: wallet, points: 0 }]); else { const pName = document.getElementById('profileName'); const pAvatar = document.getElementById('profileAvatar'); if(user.username && pName) pName.value = user.username; if(user.avatar_url && pAvatar) pAvatar.value = user.avatar_url; } } catch(e) {} }
async function addPoints(pts) { if(!supabaseClient) return; let { data: u } = await supabaseClient.from('users').select('points').eq('wallet_address', userAddress).single(); if(u) await supabaseClient.from('users').update({ points: (u.points||0)+pts }).eq('wallet_address', userAddress); }
window.saveProfile = async function() { const name = document.getElementById("profileName").value; const av = document.getElementById("profileAvatar").value; if(userAddress) { await supabaseClient.from('users').update({ username: name, avatar_url: av }).eq('wallet_address', userAddress); alert("Salvo!"); window.loadLeaderboard(); } }
window.loadLeaderboard = async function() { const div = document.getElementById("leaderboardList"); div.innerHTML = "Buscando..."; if(!supabaseClient) { div.innerHTML = "Offline"; return; } const { data: users } = await supabaseClient.from('users').select('*').order('points', { ascending: false }).limit(10); let html = ""; users.forEach((u, i) => { html += `<div style="display:flex; justify-content:space-between; padding:10px; background:rgba(255,255,255,0.05); margin-bottom:5px; border-radius:8px;"><div>#${i+1} <b>${u.username||u.wallet_address.substring(0,4)}...</b></div><div style="color:#00ff9d">${u.points} PTS</div></div>`; }); div.innerHTML = html; }

function setLoading(btnId, isLoading) {
    const btn = document.getElementById(btnId);
    if(!btn) return;
    if (isLoading) {
        btn.dataset.originalText = btn.innerText;
        btn.innerText = "⏳ ...";
        btn.disabled = true;
        btn.style.opacity = "0.7";
    } else {
        btn.innerText = btn.dataset.originalText || "Enviar";
        btn.disabled = false;
        btn.style.opacity = "1";
    }
}

function triggerConfetti() {
    if(window.confetti) confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#00ff9d', '#ffffff', '#000000'] });
}

async function generateSocialCard(name, symbol, supply, logoData) {
    document.getElementById('cardTokenSymbol').innerText = "$" + symbol;
    document.getElementById('cardTokenName').innerText = name;
    document.getElementById('cardTokenSupply').innerText = supply;
    const imgEl = document.getElementById('cardTokenLogo');
    if(logoData) { imgEl.src = logoData; imgEl.style.display = 'block'; } 
    else { imgEl.style.display = 'none'; }
    const element = document.getElementById("socialCardTemplate");
    try {
        const canvas = await html2canvas(element, { backgroundColor: null, scale: 2 });
        return canvas.toDataURL("image/png");
    } catch(e) { return null; }
}

window.copyContractAddr = function() {
    const addr = document.getElementById('newContractAddr').innerText;
    navigator.clipboard.writeText(addr);
    alert("Copiado!");
}
