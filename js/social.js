window.userProfile = { username: "Anonymous", bio: "", avatar: null, banner: null, points: 0, tokens: 0, vestings: 0, locks: 0, multisends: 0 };

window.loadUserProfile = async function(wallet) {
    if(!window.supabaseClient) return;
    let { data: user } = await supabaseClient.from('users').select('*').eq('wallet_address', wallet).single();
    if (!user) {
        const newUser = { wallet_address: wallet, points: 0, avatar_url: `https://robohash.org/${wallet}?set=set4` };
        await supabaseClient.from('users').insert([newUser]);
        window.userProfile = { ...window.userProfile, ...newUser };
    } else {
        window.userProfile = {
            username: user.username || `User ${wallet.slice(0,4)}`,
            bio: user.bio || "Sem bio.",
            avatar: user.avatar_url || `https://robohash.org/${wallet}?set=set4`,
            banner: user.banner_url,
            points: user.points || 0,
            tokens: user.tokens_created || 0,
            vestings: user.vestings_created || 0,
            locks: user.locks_created || 0,
            multisends: user.multisends_count || 0,
            lastDaily: user.last_daily_claim
        };
    }
    updateProfileUI(); 
    checkDailyAvailability(); 
    loadContacts(); 
    loadMyCreations();
    loadGlobalFeed(); 
}

function updateProfileUI() {
    document.getElementById('userDisplayName').innerText = window.userProfile.username;
    
    const wallet = window.userAddress;
    const shortWallet = wallet.slice(0, 6) + "..." + wallet.slice(-4);
    const badge = document.getElementById('userWalletDisplay');
    badge.innerHTML = `<span>${shortWallet}</span> <i data-lucide="copy"></i>`;
    badge.onclick = function() {
        navigator.clipboard.writeText(wallet);
        badge.innerHTML = `<span>${shortWallet}</span> <i data-lucide="check" style="color:#22c55e"></i>`;
        if(window.lucide) window.lucide.createIcons();
        setTimeout(() => {
            badge.innerHTML = `<span>${shortWallet}</span> <i data-lucide="copy"></i>`;
            if(window.lucide) window.lucide.createIcons();
        }, 2000);
    };
    
    document.getElementById('userBioDisplay').innerText = window.userProfile.bio;
    document.getElementById('statTokens').innerText = window.userProfile.tokens;
    document.getElementById('statMulti').innerText = window.userProfile.multisends;
    document.getElementById('statLocks').innerText = window.userProfile.locks;
    document.getElementById('statVests').innerText = window.userProfile.vestings;
    document.getElementById('statXP').innerText = window.userProfile.points;
    document.getElementById('userAvatarDisplay').src = window.userProfile.avatar;
    const banner = document.getElementById('profileBannerDisplay');
    if(window.userProfile.banner) banner.style.backgroundImage = `url('${window.userProfile.banner}')`;
    
    if(window.lucide) window.lucide.createIcons();
}

function checkDailyAvailability() {
    const btn = document.getElementById('btnDailyCheckin'); const timer = document.getElementById('dailyTimer');
    if(!window.userProfile.lastDaily) { btn.disabled = false; timer.innerText = "Disponível!"; return; }
    const diff = Date.now() - new Date(window.userProfile.lastDaily).getTime();
    if (diff > 86400000) { btn.disabled = false; timer.innerText = "Disponível!"; } 
    else { btn.disabled = true; timer.innerText = `Volte em ${Math.floor((86400000 - diff) / 3600000)}h`; }
}

window.dailyCheckIn = async function() {
    const now = new Date().toISOString(); const pts = window.userProfile.points + 50;
    await supabaseClient.from('users').update({ points: pts, last_daily_claim: now }).eq('wallet_address', userAddress);
    alert("+50 XP!"); window.userProfile.points = pts; window.userProfile.lastDaily = now; updateProfileUI(); checkDailyAvailability();
}

async function saveImage(field, data) {
    const up = {}; up[field] = data;
    await supabaseClient.from('users').update(up).eq('wallet_address', userAddress);
}
window.handleAvatarUpload = async function(i) { if(i.files && i.files[0]) { const data = await window.compressImage(i.files[0]); window.userProfile.avatar = data; updateProfileUI(); saveImage('avatar_url', data); } }
window.handleBannerUpload = async function(i) { if(i.files && i.files[0]) { const data = await window.compressImage(i.files[0]); window.userProfile.banner = data; updateProfileUI(); saveImage('banner_url', data); } }
window.saveProfileData = async function() {
    const name = document.getElementById('editName').value; const bio = document.getElementById('editBio').value;
    const up = {}; if(name) up.username = name; if(bio) up.bio = bio;
    if(Object.keys(up).length > 0) { await supabaseClient.from('users').update(up).eq('wallet_address', userAddress); loadUserProfile(userAddress); }
}

// --- AGENDA DE CONTATOS ---
window.toggleAddContactForm = function() { const f = document.getElementById('addContactForm'); f.style.display = f.style.display==='none'?'block':'none'; }
window.saveContact = async function() {
    const n = document.getElementById('newContactName').value; const w = document.getElementById('newContactWallet').value;
    if(!n || !w) return alert("Preencha tudo");
    await supabaseClient.from('contacts').insert([{ owner_wallet: userAddress, friend_name: n, friend_wallet: w }]);
    document.getElementById('newContactName').value = ""; document.getElementById('newContactWallet').value = "";
    loadContacts();
}
window.loadContacts = async function() {
    const div = document.getElementById('contactsList');
    const { data: c } = await supabaseClient.from('contacts').select('*').eq('owner_wallet', userAddress);
    if(!c || c.length===0) return div.innerHTML = "<p style='color:#666; font-size:0.8rem; text-align:center; padding:10px;'>Agenda vazia.</p>";
    let html = ""; 
    c.forEach(x => { 
        html += `
        <div style="display:flex;justify-content:space-between;align-items:center; padding:10px; border-bottom:1px solid #222; font-size:0.9rem;">
            <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:24px;height:24px;background:#333;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.7rem;">${x.friend_name.charAt(0)}</div>
                <span>${x.friend_name}</span>
            </div>
            <span style="font-family:monospace;color:#666; cursor:pointer;" onclick="navigator.clipboard.writeText('${x.friend_wallet}')" title="Copiar">${x.friend_wallet.slice(0,4)}...${x.friend_wallet.slice(-4)}</span>
        </div>`; 
    });
    div.innerHTML = html;
}

// --- MEUS PROJETOS ---
window.loadMyCreations = async function() {
    const div = document.getElementById('myTokensList');
    if(!div) return;
    div.innerHTML = "<p style='color:#666'>Carregando...</p>";
    const { data: tokens } = await supabaseClient.from('created_tokens').select('*').eq('owner_wallet', window.userAddress).order('created_at', { ascending: false });

    if(!tokens || tokens.length === 0) { div.innerHTML = "<p style='color:#666'>Nenhum ativo criado.</p>"; return; }

    let html = "";
    tokens.forEach(t => {
        const isNFT = t.contract_type === 'ERC721';
        const logo = t.logo_url || `https://robohash.org/${t.address}.png?set=set1`;
        
        // Passamos os dados do token como string JSON para a função de listagem
        const tokenDataStr = encodeURIComponent(JSON.stringify(t));

        html += `
        <div class="token-card" style="position:relative;">
            <div class="token-header">
                <img src="${logo}" class="token-logo-small" style="width:40px;height:40px;border-radius:8px;">
                <div>
                    <div style="font-weight:600; font-size:0.95rem;">${t.name}</div>
                    <div style="font-size:0.75rem; color:#888;">${t.symbol} • ${isNFT ? 'NFT' : 'ERC20'}</div>
                </div>
            </div>
            <div style="margin-top:12px; font-size:0.8rem; background:#18181b; padding:8px; border-radius:6px; font-family:monospace; display:flex; justify-content:space-between;">
                <span>${t.address.slice(0,6)}...${t.address.slice(-4)}</span>
                <i data-lucide="copy" style="width:14px; cursor:pointer;" onclick="navigator.clipboard.writeText('${t.address}')"></i>
            </div>
            <div style="margin-top:12px;">
                ${isNFT 
                    ? `<button class="btn-primary full small" onclick="openNFTManager('${t.address}', '${t.name}', '${t.symbol}', '${logo}', '${t.initial_supply}', '${t.mint_price || 0}')">Gerenciar</button>` 
                    : `<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                        <a href="${window.ARC_EXPLORER}/address/${t.address}" target="_blank" class="btn-secondary small" style="text-align:center; text-decoration:none;">Explorer</a>
                        <button class="btn-secondary small" onclick="openListingGenerator('${tokenDataStr}')">Listagem</button>
                       </div>`
                }
            </div>
        </div>`;
    });
    div.innerHTML = html;
    if(window.lucide) window.lucide.createIcons();
}

// --- FEED GLOBAL ---
window.loadGlobalFeed = async function() {
    const div = document.getElementById('globalTokensList');
    if(!div) return;
    div.innerHTML = "<p style='color:#666'>Buscando dados...</p>";
    
    const { data: tokens } = await supabaseClient.from('created_tokens').select('*').order('created_at', { ascending: false }).limit(20);

    if(!tokens || tokens.length === 0) { div.innerHTML = "<p style='color:#666'>O feed está vazio.</p>"; return; }

    let html = "";
    tokens.forEach(t => {
        const isNFT = t.contract_type === 'ERC721';
        const logo = t.logo_url || `https://robohash.org/${t.address}.png?set=set1`;
        html += `
        <div class="token-card">
            <div class="token-header">
                <img src="${logo}" class="token-logo-small" style="width:32px;height:32px;border-radius:6px;">
                <div style="overflow:hidden;">
                    <div style="font-weight:600; font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.name}</div>
                    <div style="font-size:0.7rem; color:#666;">${t.symbol} • ${isNFT ? 'NFT' : 'Token'}</div>
                </div>
            </div>
            <div style="margin-top:8px; font-size:0.7rem; color:#444;">Criado por ${t.owner_wallet.slice(0,4)}...</div>
            <a href="${window.ARC_EXPLORER}/address/${t.address}" target="_blank" class="btn-secondary full small" style="margin-top:8px; text-align:center; text-decoration:none; padding:4px;">Ver</a>
        </div>`;
    });
    div.innerHTML = html;
    if(window.lucide) window.lucide.createIcons();
}

// --- FACILITADOR DE LISTAGEM (NOVO) ---
window.openListingGenerator = function(tokenStr) {
    const t = JSON.parse(decodeURIComponent(tokenStr));
    const dialog = document.getElementById('listingDialog');
    const codeBlock = document.getElementById('listingCodeJson');
    
    // Gera estrutura padrão exigida por sites de listagem
    const listingData = {
        name: t.name,
        symbol: t.symbol,
        address: t.address,
        chain_id: window.ARC_CHAIN_ID,
        decimals: 18,
        description: `Official ${t.name} token on Arc Network. Created via Arc Shield.`,
        website: "https://seuprojeto.com",
        explorer: `${window.ARC_EXPLORER}/address/${t.address}`,
        logo_url: t.logo_url || "Hosted URL needed"
    };

    codeBlock.innerText = JSON.stringify(listingData, null, 4);
    dialog.showModal();
}

window.copyListingData = function() {
    const text = document.getElementById('listingCodeJson').innerText;
    navigator.clipboard.writeText(text);
    alert("Dados copiados! Cole no formulário de listagem.");
}

// Mantido Leaderboard e Portfolio...
window.openNFTManager = async function(addr, name, sym, logo, supply, price) {
    document.getElementById('mgrAddress').value = addr;
    document.getElementById('mgrName').innerText = name;
    document.getElementById('mgrSymbol').innerText = sym;
    document.getElementById('mgrLogo').src = logo;
    document.getElementById('mgrSupply').innerText = `.../${supply}`; 
    document.getElementById('mgrPrice').innerText = price;
    document.getElementById('nftManagerDialog').showModal();
    if(window.refreshManagerData) window.refreshManagerData(addr);
}

window.loadMyPortfolio = async function() {
    const div = document.getElementById('portfolioList');
    div.innerHTML = "<p style='color:#666'>Escaneando...</p>";
    const { data: allTokens } = await supabaseClient.from('created_tokens').select('*').limit(50);
    let html = ""; let count = 0;
    for(const token of allTokens) {
        try {
            const contract = new ethers.Contract(token.address, ABIS.erc20, window.provider);
            const bal = await contract.balanceOf(window.userAddress);
            if(bal > 0n) {
                const logo = token.logo_url || `https://robohash.org/${token.address}.png?set=set1`;
                html += `<div class="token-card"><div class="token-header"><img src="${logo}" class="token-logo-small"><div><div style="font-weight:600">${token.name}</div></div></div><div style="font-size:0.8rem;color:#888;">${ethers.formatUnits(bal, 18)} ${token.symbol}</div></div>`;
                count++;
            }
        } catch(e) {}
    }
    div.innerHTML = count > 0 ? html : "<p style='color:#666'>Nenhum saldo encontrado.</p>";
}

window.loadLeaderboard = async function() {
    const div = document.getElementById("leaderboardList"); div.innerHTML = "Loading...";
    const { data: u } = await supabaseClient.from('users').select('*').order('points', { ascending: false }).limit(10);
    let html = ""; 
    u.forEach((x, i) => { 
        html += `<div class="leaderboard-row" style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #222;"><div style="width:30px;">#${i+1}</div><div style="flex-grow:1; display:flex; align-items:center; gap:10px;"><img src="${x.avatar_url||'https://robohash.org/def'}" style="width:20px;height:20px;border-radius:50%"> ${x.username||x.wallet_address.slice(0,4)}</div><div style="font-family:monospace">${x.points}</div></div>`; 
    });
    div.innerHTML = html;
}
