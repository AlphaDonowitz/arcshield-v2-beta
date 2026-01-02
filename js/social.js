window.userProfile = { username: "Visitante", bio: "", avatar: null, banner: null, points: 0, tokens: 0, vestings: 0, locks: 0, multisends: 0 };
let myChart = null;

// TABS
window.switchSocialTab = function(tab) {
    document.getElementById('tabProfile').classList.toggle('active', tab === 'profile');
    document.getElementById('tabTokens').classList.toggle('active', tab === 'tokens');
    document.getElementById('socialProfileArea').style.display = tab === 'profile' ? 'block' : 'none';
    document.getElementById('socialTokensArea').style.display = tab === 'tokens' ? 'block' : 'none';
    if(tab === 'tokens') loadTokenExplorer();
}

// PROFILE
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
            bio: user.bio || "",
            avatar: user.avatar_url || `https://robohash.org/${wallet}?set=set4`,
            banner: user.banner_url || null,
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
    document.getElementById('userWalletDisplay').innerText = window.userAddress;
    document.getElementById('userBioDisplay').innerText = window.userProfile.bio;
    document.getElementById('statTokens').innerText = window.userProfile.tokens;
    document.getElementById('statMulti').innerText = window.userProfile.multisends;
    document.getElementById('statLocks').innerText = window.userProfile.locks;
    document.getElementById('statVests').innerText = window.userProfile.vestings;
    document.getElementById('statXP').innerText = window.userProfile.points;
    document.getElementById('userAvatarDisplay').src = window.userProfile.avatar;
    
    const banner = document.getElementById('profileBannerDisplay');
    if(window.userProfile.banner && window.userProfile.banner.length > 50) banner.style.backgroundImage = `url('${window.userProfile.banner}')`;
    else banner.style.backgroundImage = "linear-gradient(90deg, #00C6FF, #0072FF)";
    
    renderCharts();
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

function renderCharts() {
    const ctx = document.getElementById('skillsChart'); if(!ctx || myChart) { if(myChart) myChart.destroy(); }
    myChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Creator', 'Airdrop', 'Locker', 'Vesting', 'Fame'],
            datasets: [{ label: 'Stats', data: [window.userProfile.tokens, window.userProfile.multisends, window.userProfile.locks, window.userProfile.vestings, Math.min(window.userProfile.points/100, 10)], backgroundColor: 'rgba(0,114,255,0.2)', borderColor: '#0072FF', pointBackgroundColor: '#00ff9d' }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { r: { ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.1)' } } }, plugins: { legend: { display: false } } }
    });
}

// UPLOADS
async function saveImage(field, data) {
    if(data.length > 3000000) return alert("Imagem muito grande (Max 2MB)");
    document.body.style.cursor = 'wait';
    const up = {}; up[field] = data;
    await supabaseClient.from('users').update(up).eq('wallet_address', userAddress);
    document.body.style.cursor = 'default';
}
window.handleAvatarUpload = function(i) { const f=i.files[0]; if(f) { const r=new FileReader(); r.onload=function(e){ window.userProfile.avatar=e.target.result; updateProfileUI(); saveImage('avatar_url', e.target.result); }; r.readAsDataURL(f); } }
window.handleBannerUpload = function(i) { const f=i.files[0]; if(f) { const r=new FileReader(); r.onload=function(e){ window.userProfile.banner=e.target.result; updateProfileUI(); saveImage('banner_url', e.target.result); }; r.readAsDataURL(f); } }
window.saveProfileData = async function() {
    const name = document.getElementById('editName').value; const bio = document.getElementById('editBio').value;
    const up = {}; if(name) up.username = name; if(bio) up.bio = bio;
    if(Object.keys(up).length > 0) { await supabaseClient.from('users').update(up).eq('wallet_address', userAddress); alert("Salvo!"); loadUserProfile(userAddress); }
}

// CONTACTS
window.toggleAddContactForm = function() { const f = document.getElementById('addContactForm'); f.style.display = f.style.display==='none'?'block':'none'; }
window.saveContact = async function() {
    const n = document.getElementById('newContactName').value; const w = document.getElementById('newContactWallet').value;
    if(!n || !w) return alert("Preencha tudo");
    await supabaseClient.from('contacts').insert([{ owner_wallet: userAddress, friend_name: n, friend_wallet: w }]);
    alert("Adicionado!"); loadContacts();
}
window.loadContacts = async function() {
    const div = document.getElementById('contactsList');
    const { data: c } = await supabaseClient.from('contacts').select('*').eq('owner_wallet', userAddress).order('created_at', {ascending:false});
    if(!c || c.length===0) return div.innerHTML = "<p style='color:#666;text-align:center'>Sem contatos.</p>";
    let html = ""; c.forEach(x => { html += `<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.03);padding:10px;margin-bottom:8px;border-radius:10px;"><div style="display:flex;align-items:center;gap:10px"><img src="https://robohash.org/${x.friend_wallet}?set=set4" style="width:30px;height:30px;border-radius:50%"><div><b>${x.friend_name}</b><br><small style="color:#888">${x.friend_wallet.slice(0,6)}...</small></div></div><button class="mini-btn" onclick="sendToFriend('${x.friend_wallet}')">💸</button></div>`; });
    div.innerHTML = html;
}
window.sendToFriend = function(addr) { window.navigate('multisender'); setTimeout(() => { const i=document.getElementById('csvInput'); if(i) { i.value=`${addr}, `; i.focus(); } }, 100); }

// TOKEN EXPLORER
window.loadTokenExplorer = async function() {
    const myDiv = document.getElementById('myTokensList'); const globalDiv = document.getElementById('globalTokensList');
    myDiv.innerHTML = "Buscando..."; globalDiv.innerHTML = "Buscando...";
    const { data: myT } = await supabaseClient.from('created_tokens').select('*').eq('owner_wallet', userAddress).order('created_at', {ascending:false});
    myDiv.innerHTML = (!myT || myT.length===0) ? "<p style='color:#666'>Sem tokens.</p>" : renderTokens(myT, true);
    const { data: allT } = await supabaseClient.from('created_tokens').select('*').order('created_at', {ascending:false}).limit(20);
    globalDiv.innerHTML = (!allT || allT.length===0) ? "<p style='color:#666'>Sem tokens globais.</p>" : renderTokens(allT, false);
}
function renderTokens(list, owner) {
    let html = ""; list.forEach(t => { 
        const logo = t.logo_url || `https://robohash.org/${t.address}.png?set=set1`;
        html += `<div class="token-card"><div class="token-header"><img src="${logo}" class="token-logo-small"><div><div style="font-weight:bold;">${t.name}</div><div style="font-size:0.7rem;color:#888;">${t.symbol}</div></div></div><div style="font-size:0.7rem;background:rgba(0,0,0,0.3);padding:4px;margin-bottom:5px;word-break:break-all">${t.address}</div><div class="token-actions"><button class="mini-btn" onclick="addMeta('${t.address}','${t.symbol}','${logo}')">🦊</button><button class="mini-btn" onclick="window.open('${window.ARC_EXPLORER}/address/${t.address}')">🔍</button>${owner?`<button class="mini-btn" style="color:#4dcfff" onclick="sendToFriend('${t.address}')">📨</button>`:''}</div></div>`; 
    });
    return html;
}
window.addMeta = async function(a,s,i) { try { await ethereum.request({ method: 'wallet_watchAsset', params: { type: 'ERC20', options: { address: a, symbol: s, decimals: 18, image: i } } }); } catch(e){} }

window.loadLeaderboard = async function() {
    const div = document.getElementById("leaderboardList"); div.innerHTML = "Loading...";
    const { data: u } = await supabaseClient.from('users').select('*').order('points', { ascending: false }).limit(10);
    let html = ""; u.forEach((x, i) => { html += `<div class="leaderboard-row"><div class="rank-num">#${i+1}</div><div class="user-cell"><img src="${x.avatar_url||'https://robohash.org/def'}"><span>${x.username||x.wallet_address.slice(0,4)}</span></div><div style="color:#00ff9d">${x.points} XP</div></div>`; });
    div.innerHTML = html;
}
