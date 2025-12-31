// ==========================================
// 1. CONFIGURAÇÕES & AUDITORIA INICIAL
// ==========================================
let provider, signer, userAddress;
let currentDecimals = 18;
let uploadedLogoData = null; 

// SUPABASE CONFIG
const SUPABASE_URL = 'https://jfgiiuzqyqjbfaubdhja.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZ2lpdXpxeXFqYmZhdWJkaGphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTk2NzIsImV4cCI6MjA4MTQ3NTY3Mn0.4AZ_FIazsIlP5I_FPpAQh0lkIXRpBwGVfKVG3nwzxWA';
let supabaseClient = null;

// Auditoria de Conexão DB
try {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("✅ AUDITORIA: Cliente Supabase inicializado.");
    } else {
        console.error("❌ AUDITORIA: Biblioteca Supabase não encontrada no HTML.");
    }
} catch(e) { console.error("❌ AUDITORIA: Falha crítica ao iniciar Supabase", e); }

// ==========================================
// 2. CONEXÃO WALLET
// ==========================================
window.connectWallet = async function() {
    const statusEl = document.getElementById("loginStatus");
    if(statusEl) statusEl.style.display = 'none';
    try {
        if (!window.ethereum) { alert("MetaMask não encontrada!"); return; }
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        
        const btn = document.getElementById("btnConnect");
        btn.innerText = `🟢 Conectado: ${userAddress.slice(0,6)}...`;
        btn.classList.add('btn-disconnect');
        btn.onclick = null; 

        document.getElementById("navTabs").style.display = 'flex';
        log(`Conectado: ${userAddress}`, 'success');
        if(supabaseClient) checkRegister(userAddress);
    } catch (e) { console.error(e); log("Erro Conexão: " + (e.reason || e.message), 'error'); }
}

// ==========================================
// 3. CORE: SISTEMA DE UPLOAD E COMPARTILHAMENTO
// ==========================================

window.handleLogoUpload = function(input) {
    const file = input.files[0];
    if(file) {
        document.getElementById('logoFileName').innerText = file.name;
        const reader = new FileReader();
        reader.onload = function(e) { uploadedLogoData = e.target.result; };
        reader.readAsDataURL(file);
    }
}

// GERA O CARD VISUAL (HTML -> CANVAS -> BASE64)
async function generateSocialCard(name, symbol, supply, logoData) {
    // 1. Preenche dados
    document.getElementById('cardTokenSymbol').innerText = "$" + symbol;
    document.getElementById('cardTokenName').innerText = name;
    document.getElementById('cardTokenSupply').innerText = supply;
    const imgEl = document.getElementById('cardTokenLogo');
    
    if(logoData) { imgEl.src = logoData; imgEl.style.display = 'block'; } 
    else { imgEl.style.display = 'none'; }

    // 2. Renderiza
    const element = document.getElementById("socialCardTemplate");
    try {
        const canvas = await html2canvas(element, { 
            backgroundColor: null, 
            scale: 2, // Alta qualidade
            logging: false,
            useCORS: true // Permite imagens externas
        });
        return canvas.toDataURL("image/png");
    } catch(e) { 
        console.error("❌ AUDITORIA: Falha no html2canvas", e);
        return null; 
    }
}

// CONVERTE BASE64 PARA BLOB (BINÁRIO)
function dataURLtoBlob(dataurl) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){ u8arr[n] = bstr.charCodeAt(n); }
    return new Blob([u8arr], {type:mime});
}

// UPLOAD PARA O BUCKET 'cards'
async function uploadCardToSupabase(blob) {
    if (!supabaseClient) {
        alert("Erro: Banco de dados desconectado.");
        return null;
    }
    // Nome único com timestamp
    const fileName = `card-${Date.now()}.png`;
    
    try {
        log("Iniciando upload para nuvem...", 'normal');
        
        // 1. Tenta Upload
        const { data, error } = await supabaseClient.storage
            .from('cards')
            .upload(fileName, blob, { cacheControl: '3600', upsert: false });

        if (error) {
            console.error("❌ AUDITORIA: Erro no Upload Supabase", error);
            throw error;
        }

        // 2. Pega URL Pública
        const { data: urlData } = supabaseClient.storage
            .from('cards')
            .getPublicUrl(fileName);

        console.log("✅ AUDITORIA: URL Gerada:", urlData.publicUrl);
        return urlData.publicUrl;

    } catch (e) {
        log("Erro de Permissão/Upload: " + e.message, 'error');
        alert("Erro no Upload: Verifique se rodou o script SQL no Supabase.");
        return null;
    }
}

// LÓGICA DO BOTÃO "SMART SHARE"
window.smartShare = async function(tweetText, cardDataUrl) {
    if (!cardDataUrl) return;
    const btn = document.getElementById('smartShareBtn');
    const originalText = btn.innerText;
    
    btn.innerText = "☁️ Subindo imagem...";
    btn.disabled = true;

    try {
        const blob = dataURLtoBlob(cardDataUrl);
        
        // PASSO 1: Upload
        const publicUrl = await uploadCardToSupabase(blob);
        
        if (publicUrl) {
            // PASSO 2: Abrir Twitter
            log("Link gerado! Abrindo X...", 'success');
            
            // Texto do Tweet + Link da Imagem
            const finalTweet = `${tweetText}\n\n${publicUrl}`;
            
            // Abre nova aba
            const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(finalTweet)}`;
            window.open(intentUrl, '_blank');
            
            btn.innerText = "✅ Post Aberto! (Verifique a aba)";
        } else {
            // Fallback
            document.getElementById("downloadCardBtn").style.display = 'block';
            btn.innerText = "❌ Falha no Envio";
        }
    } catch (err) {
        console.error(err);
        btn.innerText = "❌ Erro";
    } finally {
        setTimeout(() => { btn.disabled = false; btn.innerText = originalText; }, 4000);
    }
}

// CONFIGURAÇÃO DO MODAL
window.showSuccessModal = async function(title, msg, tweetText, txHash, imageUrl = null, cardData = null) {
    const modalTitle = document.getElementById("modalTitle");
    const modalMsg = document.getElementById("modalMsg");
    const iconSpan = document.querySelector(".success-icon");
    const cardContainer = document.getElementById("generatedCardContainer");
    const downloadBtn = document.getElementById("downloadCardBtn");
    const smartBtn = document.getElementById("smartShareBtn");

    modalTitle.innerText = title;
    modalMsg.innerText = msg;
    
    // Ícone PFP
    if (imageUrl) {
        iconSpan.innerHTML = `<img src="${imageUrl}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #00ff9d; box-shadow: 0 0 20px rgba(0,255,157,0.3);">`;
    } else { iconSpan.innerHTML = "🏆"; }

    // Configuração do Card Social
    if (cardData) {
        cardContainer.style.display = 'flex';
        cardContainer.innerHTML = `<img src="${cardData}" style="width: 100%; border-radius: 12px; border: 1px solid #333; box-shadow: 0 5px 15px rgba(0,0,0,0.5);">`;
        
        // Configura link de download manual
        downloadBtn.href = cardData;
        downloadBtn.style.display = 'none'; 
        
        // Configura botão Smart Share
        smartBtn.onclick = () => smartShare(tweetText, cardData);
        smartBtn.style.display = 'block';
    } else {
        cardContainer.style.display = 'none';
        smartBtn.style.display = 'none';
        downloadBtn.style.display = 'none';
    }
    
    // Link Explorer
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
// 4. CONTRATOS (MANTIDO)
// ==========================================
const CONTRACTS = { factory: "0x3Ed7Fd9b5a2a77B549463ea1263516635c77eB0a", multi: "0x59BcE4bE3e31B14a0528c9249a0580eEc2E59032", lock: "0x4475a197265Dd9c7CaF24Fe1f8cf63B6e9935452", vest: "0xcC8a723917b0258280Ea1647eCDe13Ffa2E1D30b" };
const ABIS = { factory: ["function createToken(string name, string symbol, uint256 initialSupply) external"], multi: ["function multisendToken(address token, address[] recipients, uint256[] amounts) external payable"], lock: ["function lockTokens(address, uint256, uint256) external"], vest: ["function createVestingSchedule(address, address, uint256, uint256, uint256, uint256, bool) external"], erc20: ["function approve(address, uint256) external", "function decimals() view returns (uint8)", "function symbol() view returns (string)"] };

// --- LAUNCHPAD ---
window.createToken = async function() {
    const name = document.getElementById("tokenName").value;
    const symbol = document.getElementById("tokenSymbol").value;
    const supply = document.getElementById("tokenSupply").value;
    const desc = document.getElementById("tokenDesc").value.trim();
    if(!name || !symbol || !supply) return log("Preencha os campos obrigatórios!", 'error');
    try {
        const c = new ethers.Contract(CONTRACTS.factory, ABIS.factory, signer);
        log("Criando Token...", 'normal');
        const tx = await c.createToken(name, symbol, supply);
        await tx.wait(); 
        log(`Token ${symbol} Criado!`, 'success');
        if(supabaseClient) addPoints(100);

        log("Gerando Card Social...", 'normal');
        // Gera o card com a logo que o usuário subiu
        const cardImage = await generateSocialCard(name, symbol, supply, uploadedLogoData);

        const tweetDesc = desc ? desc : `Criei o token $${symbol} na #ArcTestnet com Arc Shield! 🛡️`;
        showSuccessModal(`Token ${symbol} Criado! 🚀`, "Contrato implantado com sucesso.", tweetDesc, tx.hash, uploadedLogoData, cardImage);
    } catch (e) { log("Erro: " + (e.reason || e.message), 'error'); }
}

// --- UTILS RESTANTES (MANTIDOS IGUAIS) ---
window.sendBatch=async function(){const token=clean(document.getElementById("multiTokenAddr").value);const raw=document.getElementById("csvInput").value;if(!token||!raw)return log("Preencha o Token e a Lista.",'error');const lines=raw.split(/\r?\n/);let rec=[],amt=[];for(let line of lines){let parts=line.split(/[;,\t\s]+/);parts=parts.filter(p=>p.trim()!=="");if(parts.length>=2){const address=parts[0].trim();const value=parts[1].trim().replace(',','.');if(ethers.isAddress(address)){rec.push(address);try{amt.push(ethers.parseUnits(value,currentDecimals));}catch(e){}}}}if(rec.length===0)return log("Nenhuma carteira válida.",'error');try{const c=new ethers.Contract(CONTRACTS.multi,ABIS.multi,signer);log(`Enviando para ${rec.length} carteiras...`);const tx=await c.multisendToken(token,rec,amt);await tx.wait();log("Enviado!",'success');if(supabaseClient)addPoints(50);showSuccessModal("Airdrop Concluído! 📨",`${rec.length} carteiras receberam.`,`Airdrop para ${rec.length} pessoas via Arc Shield! 🛡️`,tx.hash);}catch(e){log("Erro: "+(e.reason||e.message),'error');}}
window.lockTokens=async function(){const token=clean(document.getElementById("lockTokenAddr").value);const amount=document.getElementById("lockAmount").value;const date=document.getElementById("lockDate").value;if(!token||!amount||!date)return log("Preencha todos.",'error');try{const safeAmount=amount.replace(',','.');const wei=ethers.parseUnits(safeAmount,currentDecimals);const time=Math.floor(new Date(date).getTime()/1000);if(time<Math.floor(Date.now()/1000))return log("Data futura necessária!",'error');const c=new ethers.Contract(CONTRACTS.lock,ABIS.lock,signer);log("Trancando...");const tx=await c.lockTokens(token,wei,time);await tx.wait();log("Trancado!",'success');if(supabaseClient)addPoints(50);showSuccessModal("Liquidez Trancada! 🔒","Tokens seguros no Locker.","Tranquei liquidez via Arc Shield! 🛡️",tx.hash);}catch(e){log("Erro: "+(e.reason||e.message),'error');}}
window.createVesting=async function(){const token=clean(document.getElementById("vestTokenAddr").value);const bene=clean(document.getElementById("vestBeneficiary").value);const amount=document.getElementById("vestAmount").value;const dur=document.getElementById("vestDuration").value;if(!token||!bene||!amount||!dur)return log("Preencha todos.",'error');try{const safeAmount=amount.replace(',','.');const wei=ethers.parseUnits(safeAmount,currentDecimals);const sec=parseInt(dur)*60;const c=new ethers.Contract(CONTRACTS.vest,ABIS.vest,signer);log("Criando Vesting...");const tx=await c.createVestingSchedule(token,bene,Math.floor(Date.now()/1000),0,sec,wei,true);await tx.wait();log("Criado!",'success');if(supabaseClient)addPoints(75);showSuccessModal("Vesting Criado! ⏳","Pagamento programado.","Criei Vesting via Arc Shield! 🛡️",tx.hash);}catch(e){log("Erro: "+e.message,'error');}}
window.switchTab=function(tabId,btn){document.querySelectorAll('.module-section').forEach(el=>el.classList.remove('active'));document.querySelectorAll('.tab-btn').forEach(el=>el.classList.remove('active'));document.getElementById(tabId).classList.add('active');btn.classList.add('active');if(tabId==='dashboard')loadDashboardData();if(tabId==='leaderboard')loadLeaderboard();}
function log(msg,type='normal'){const area=document.getElementById("consoleArea");if(!area)return;const div=document.createElement("div");div.className="log-entry "+(type==='success'?'log-success':type==='error'?'log-error':'');div.innerText=`> ${msg}`;area.appendChild(div);area.scrollTop=area.scrollHeight;}
function clean(val){return val?val.trim():"";}
window.detectDecimals=async function(mod){const map={multi:'multiTokenAddr',lock:'lockTokenAddr',vest:'vestTokenAddr'};const addr=clean(document.getElementById(map[mod]).value);if(ethers.isAddress(addr)&&signer){try{const c=new ethers.Contract(addr,ABIS.erc20,signer);currentDecimals=await c.decimals();const sym=await c.symbol();log(`Token: ${sym}`,'success');}catch(e){currentDecimals=18;}}}
window.approveToken=async function(mod){const mapAddr={multi:CONTRACTS.multi,lock:CONTRACTS.lock,vest:CONTRACTS.vest};const mapInput={multi:'multiTokenAddr',lock:'lockTokenAddr',vest:'vestTokenAddr'};const token=clean(document.getElementById(mapInput[mod]).value);if(!token)return log("Endereço Inválido",'error');try{log("Aprovando...");await(await new ethers.Contract(token,ABIS.erc20,signer).approve(mapAddr[mod],ethers.MaxUint256)).wait();log("Aprovado!",'success');}catch(e){log("Erro: "+e.message,'error');}}
async function checkRegister(wallet){try{let{data:user}=await supabaseClient.from('users').select('*').eq('wallet_address',wallet).single();if(!user)await supabaseClient.from('users').insert([{wallet_address:wallet,points:0}]);else{const pName=document.getElementById('profileName');const pAvatar=document.getElementById('profileAvatar');if(user.username&&pName)pName.value=user.username;if(user.avatar_url&&pAvatar)pAvatar.value=user.avatar_url;}}catch(e){}}
async function addPoints(pts){if(!supabaseClient)return;let{data:u}=await supabaseClient.from('users').select('points').eq('wallet_address',userAddress).single();if(u)await supabaseClient.from('users').update({points:(u.points||0)+pts}).eq('wallet_address',userAddress);}
window.saveProfile=async function(){const name=document.getElementById("profileName").value;const av=document.getElementById("profileAvatar").value;if(userAddress){await supabaseClient.from('users').update({username:name,avatar_url:av}).eq('wallet_address',userAddress);log("Salvo!",'success');window.loadLeaderboard();}}
window.loadLeaderboard=async function(){const div=document.getElementById("leaderboardList");div.innerHTML="<p>Buscando...</p>";if(!supabaseClient){div.innerHTML="<p>Offline</p>";return;}const{data:users}=await supabaseClient.from('users').select('*').order('points',{ascending:false}).limit(10);let html="";users.forEach((u,i)=>{html+=`<div class="asset-card"><div>#${i+1} <b>${u.username||u.wallet_address.substring(0,4)}...</b></div><div style="color:#00ff9d">${u.points} PTS</div></div>`;});div.innerHTML=html;}
window.loadDashboardData=async function(){const div=document.getElementById("dashboardContent");div.innerHTML="<p>Buscando...</p>";try{const c=new ethers.Contract(CONTRACTS.vest,ABIS.vest,signer);const count=await c.getUserScheduleCount(userAddress);let html="";if(count>0){for(let i=0;i<count;i++){const id=await c.getUserScheduleIdAtIndex(userAddress,i);const s=await c.schedules(id);html+=`<div class="asset-card"><div>Vesting #${id}: ${ethers.formatEther(s.amountTotal)}</div><button class="mini-btn" onclick="claimVesting(${id})">SACAR</button></div>`;}}else html="<p class='hint'>Nada encontrado.</p>";div.innerHTML=html;}catch(e){div.innerHTML="Erro ao buscar dados.";}}
window.claimVesting=async function(id){try{await(await new ethers.Contract(CONTRACTS.vest,ABIS.vest,signer).release(id)).wait();log("Sacado!",'success');loadDashboardData();}catch(e){log("Erro",'error');}}
