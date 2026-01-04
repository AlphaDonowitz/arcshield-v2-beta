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
    updateProfileUI(); checkDailyAvailability(); loadContacts();
}

function updateProfileUI() {
    document.getElementById('userDisplayName').innerText = window.userProfile.username;
    
    // --- LÓGICA DO BOTÃO DE COPIAR ---
    const wallet = window.userAddress;
    const shortWallet = wallet.slice(0, 6) + "..." + wallet.slice(-4);
    const badge = document.getElementById('userWalletDisplay');
    
    // Injeta HTML (Texto + Ícone)
    badge.innerHTML = `<span>${shortWallet}</span> <i data-lucide="copy"></i>`;
    
    // Evento de Clique
    badge.onclick = function() {
        navigator.clipboard.writeText(wallet);
        // Feedback Visual
        badge.innerHTML = `<span>${shortWallet}</span> <i data-lucide="check" style="color:#22c55e"></i>`;
        if(window.lucide) window.lucide.createIcons();
        
        setTimeout(() => {
            badge.innerHTML = `<span>${shortWallet}</span> <i data-lucide="copy"></i>`;
            if(window.lucide) window.lucide.createIcons();
        }, 2000);
    };
    if(window.lucide) window.lucide.createIcons();
    // ---------------------------------

    document.getElementById('userBioDisplay').innerText = window.userProfile.bio;
    document.getElementById('statTokens').innerText = window.userProfile.tokens;
    document.getElementById('statMulti').innerText = window.userProfile.multisends;
    document.getElementById('statLocks').innerText = window.userProfile.locks;
    document.getElementById('statVests').innerText = window.userProfile.vestings;
    document.getElementById('statXP').innerText = window.userProfile.points;
    document.getElementById('userAvatarDisplay').src = window.userProfile.avatar;
    const banner = document.getElementById('profileBannerDisplay');
    if(window.userProfile.banner) banner.style.backgroundImage = `url('${window.userProfile.banner}')`;
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
window.handleAvatarUpload = async function(i) { 
    if(i.files && i.files[0]) { 
        const data = await window.compressImage(i.files[0]); 
        window.userProfile.avatar = data; updateProfileUI(); saveImage('avatar_url', data); 
    } 
}
window.handleBannerUpload = async function(i) { 
    if(i.files && i.files[0]) { 
        const data = await window.compressImage(i.files[0]); 
        window.userProfile.banner = data; updateProfileUI(); saveImage('banner_url', data); 
    } 
}
window.saveProfileData = async function() {
    const name = document.getElementById('editName').value; const bio = document.getElementById('editBio').value;
    const up = {}; if(name) up.username = name; if(bio) up.bio = bio;
    if(Object.keys(up).length > 0) { await supabaseClient.from('users').update(up).eq('wallet_address', userAddress); loadUserProfile(userAddress); }
}

window.toggleAddContactForm = function() { const f = document.getElementById('addContactForm'); f.style.display = f.style.display==='none'?'block':'none'; }
window.saveContact = async function() {
    const n = document.getElementById('newContactName').value; const w = document.getElementById('newContactWallet').value;
    if(!n || !w) return alert("Preencha tudo");
    await supabaseClient.from('contacts').insert([{ owner_wallet: userAddress, friend_name: n, friend_wallet: w }]);
    loadContacts();
}
window.loadContacts = async function() {
    const div = document.getElementById('contactsList');
    const { data: c } = await supabaseClient.from('contacts').select('*').eq('owner_wallet', userAddress);
    if(!c || c.length===0) return div.innerHTML = "<p style='color:#666; font-size:0.8rem;'>Sem contatos.</p>";
    let html = ""; c.forEach(x => { html += `<div style="display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #222;font-size:0.9rem;"><span>${x.friend_name}</span> <span style="font-family:monospace;color:#666">${x.friend_wallet.slice(0,6)}...</span></div>`; });
    div.innerHTML = html;
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
    div.innerHTML = count > 0 ? html : "<p style='color:#666'>Nenhum saldo.</p>";
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
