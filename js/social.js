// ==========================================
// SOCIAL HUB & GAMIFICATION (V3.7 - Contacts)
// ==========================================

window.userProfile = {
    username: "Visitante", 
    bio: "", 
    avatar: null,
    banner: null, 
    points: 0, 
    tokens: 0, 
    vestings: 0, 
    locks: 0, 
    multisends: 0
};
let myChart = null;

// 1. CARREGAR PERFIL & CONTATOS
window.loadUserProfile = async function(wallet) {
    if(!window.supabaseClient) return;
    try {
        let { data: user, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('wallet_address', wallet)
            .single();
        
        if (error && error.code !== 'PGRST116') console.error("Erro Supabase:", error);

        if (!user) {
            const newUser = { wallet_address: wallet, points: 0, avatar_url: `https://robohash.org/${wallet}?set=set4` };
            await supabaseClient.from('users').insert([newUser]);
            window.userProfile = { ...window.userProfile, ...newUser };
        } else {
            window.userProfile = {
                username: user.username || `User ${wallet.slice(0,4)}`,
                bio: user.bio || "Sem descrição.",
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
        updateProfileUI();
        checkDailyAvailability();
        loadContacts(); // Carrega a agenda
    } catch(e) { console.error("Erro Crítico Profile:", e); }
}

// 2. ATUALIZAR INTERFACE
function updateProfileUI() {
    const ids = {
        'userDisplayName': window.userProfile.username,
        'userWalletDisplay': window.userAddress,
        'userBioDisplay': window.userProfile.bio,
        'statTokens': window.userProfile.tokens,
        'statMulti': window.userProfile.multisends,
        'statLocks': window.userProfile.locks,
        'statVests': window.userProfile.vestings,
        'statXP': window.userProfile.points
    };
    for(const [id, val] of Object.entries(ids)) {
        const el = document.getElementById(id);
        if(el) el.innerText = val;
    }
    
    // Avatar
    const img = document.getElementById('userAvatarDisplay');
    if(img) img.src = window.userProfile.avatar;

    // Banner
    const bannerDiv = document.getElementById('profileBannerDisplay');
    if(bannerDiv) {
        if(window.userProfile.banner && window.userProfile.banner.length > 10) {
            bannerDiv.style.backgroundImage = `url('${window.userProfile.banner}')`;
        } else {
            bannerDiv.style.backgroundImage = "linear-gradient(90deg, #00C6FF, #0072FF)";
        }
    }
    
    renderCharts();
}

// 3. DAILY CHECKIN
function checkDailyAvailability() {
    const btn = document.getElementById('btnDailyCheckin');
    const timer = document.getElementById('dailyTimer');
    if(!btn) return;

    if(!window.userProfile.lastDaily) {
        btn.disabled = false; timer.innerText = "Disponível!"; return;
    }
    const last = new Date(window.userProfile.lastDaily).getTime();
    const diff = Date.now() - last;
    const hours24 = 24 * 60 * 60 * 1000;

    if (diff > hours24) {
        btn.disabled = false; timer.innerText = "Disponível!"; timer.style.color = "#00ff9d";
    } else {
        btn.disabled = true;
        const wait = hours24 - diff;
        const h = Math.floor(wait / (1000*60*60));
        timer.innerText = `Volte em ${h}h`;
        timer.style.color = "#888";
    }
}

window.dailyCheckIn = async function() {
    if(!window.supabaseClient) return;
    const now = new Date().toISOString();
    const newPoints = window.userProfile.points + 50;
    
    await supabaseClient.from('users').update({ points: newPoints, last_daily_claim: now }).eq('wallet_address', userAddress);
    alert("🎉 +50 XP Recebidos!");
    window.userProfile.points = newPoints;
    window.userProfile.lastDaily = now;
    updateProfileUI();
    checkDailyAvailability();
    if(window.confetti) window.confetti();
}

// 4. GRÁFICOS
function renderCharts() {
    const ctx = document.getElementById('skillsChart');
    if(!ctx) return;
    if(myChart) myChart.destroy();
    
    const p = window.userProfile;
    const data = [p.tokens, p.multisends, p.locks, p.vestings, Math.min(p.points/100, 10)];

    myChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Creator', 'Airdrop', 'Locker', 'Vesting', 'Fame'],
            datasets: [{
                label: 'Stats',
                data: data,
                backgroundColor: 'rgba(0, 114, 255, 0.2)',
                borderColor: '#0072FF',
                pointBackgroundColor: '#00ff9d',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { r: { ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: '#fff' } } },
            plugins: { legend: { display: false } }
        }
    });
}

// 5. UPLOADS
async function saveImageToDB(field, base64Data) {
    if(!window.userAddress) return alert("Conecte a carteira primeiro.");
    if(base64Data.length > 3000000) return alert("Imagem muito grande! (Max 2MB)");

    const updateObj = {}; updateObj[field] = base64Data;
    document.body.style.cursor = 'wait';
    
    const { error } = await supabaseClient.from('users').update(updateObj).eq('wallet_address', window.userAddress);
    document.body.style.cursor = 'default';

    if(error) alert("Erro ao salvar imagem. Verifique a coluna no banco.");
    else if(window.confetti) window.confetti({ particleCount: 50, spread: 30, origin: { y: 0.3 } });
}

window.handleAvatarUpload = function(input) {
    const file = input.files[0];
    if(file) {
        const r = new FileReader();
        r.onload = function(e) { 
            const base64 = e.target.result;
            window.userProfile.avatar = base64; 
            updateProfileUI(); 
            saveImageToDB('avatar_url', base64); 
        };
        r.readAsDataURL(file);
    }
}

window.handleBannerUpload = function(input) {
    const file = input.files[0];
    if(file) {
        const r = new FileReader();
        r.onload = function(e) { 
            const base64 = e.target.result;
            window.userProfile.banner = base64; 
            updateProfileUI(); 
            saveImageToDB('banner_url', base64); 
        };
        r.readAsDataURL(file);
    }
}

window.saveProfileData = async function() {
    const name = document.getElementById('editName').value;
    const bio = document.getElementById('editBio').value;
    const up = {};
    if(name) up.username = name;
    if(bio) up.bio = bio;
    if(Object.keys(up).length === 0) return alert("Nada para salvar nos textos.");

    const { error } = await supabaseClient.from('users').update(up).eq('wallet_address', userAddress);
    if(error) alert("Erro ao salvar perfil.");
    else { alert("Texto Atualizado! 💾"); loadUserProfile(userAddress); }
}

window.loadLeaderboard = async function() {
    const div = document.getElementById("leaderboardList");
    div.innerHTML = "Loading...";
    const { data: users } = await supabaseClient.from('users').select('*').order('points', { ascending: false }).limit(10);
    let html = "";
    users.forEach((u, i) => {
        let badge = "👶";
        if(u.points > 500) badge = "🔥";
        if(u.points > 1000) badge = "👑";
        html += `<div class="leaderboard-row"><div class="rank-num">#${i+1}</div><div class="user-cell"><img src="${u.avatar_url||'https://robohash.org/def'}"><span>${u.username||u.wallet_address.slice(0,4)}</span></div><div class="badge-cell">${badge}</div><div style="color:#00ff9d">${u.points} XP</div></div>`;
    });
    div.innerHTML = html;
}

// 6. AGENDA DE CONTATOS (NOVO)

window.toggleAddContactForm = function() {
    const form = document.getElementById('addContactForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

window.saveContact = async function() {
    if(!window.supabaseClient || !window.userAddress) return alert("Conecte a carteira.");
    
    const name = document.getElementById('newContactName').value;
    const wallet = document.getElementById('newContactWallet').value;

    if(!name || !wallet) return alert("Preencha nome e carteira.");
    // Validação simples de endereço
    if(!wallet.startsWith("0x") || wallet.length !== 42) return alert("Endereço de carteira inválido!");

    const { error } = await supabaseClient.from('contacts').insert([{ 
        owner_wallet: window.userAddress,
        friend_name: name,
        friend_wallet: wallet
    }]);

    if(error) { console.error(error); alert("Erro ao salvar contato."); } 
    else {
        alert("Aliado adicionado! 🤝");
        document.getElementById('newContactName').value = "";
        document.getElementById('newContactWallet').value = "";
        toggleAddContactForm();
        loadContacts(); 
    }
}

window.loadContacts = async function() {
    if(!window.supabaseClient || !window.userAddress) return;
    const div = document.getElementById('contactsList');
    
    const { data: contacts, error } = await supabaseClient
        .from('contacts')
        .select('*')
        .eq('owner_wallet', window.userAddress)
        .order('created_at', { ascending: false });

    if(error) return console.error(error);

    if(!contacts || contacts.length === 0) {
        div.innerHTML = `<p style="color:#666; text-align:center; padding:10px;">Você ainda não tem aliados salvos.</p>`;
        return;
    }

    let html = "";
    contacts.forEach(c => {
        const friendAvatar = `https://robohash.org/${c.friend_wallet}?set=set4`;
        html += `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:10px; border-radius:10px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.05);">
            <div style="display:flex; align-items:center; gap:10px;">
                <img src="${friendAvatar}" style="width:35px; height:35px; border-radius:50%; background:#222; object-fit:cover;">
                <div>
                    <div style="font-weight:bold; font-size:0.9rem;">${c.friend_name}</div>
                    <div style="font-size:0.75rem; color:#888;">${c.friend_wallet.slice(0,6)}...${c.friend_wallet.slice(-4)}</div>
                </div>
            </div>
            <div style="display:flex; gap:5px;">
                <button class="mini-btn" onclick="copyToClip('${c.friend_wallet}')" title="Copiar">📋</button>
                <button class="mini-btn" style="background:rgba(0, 114, 255, 0.2); color:#4dcfff; border-color:rgba(0,114,255,0.3);" onclick="sendToFriend('${c.friend_wallet}')" title="Enviar Saldo">💸 Enviar</button>
                <button class="mini-btn" style="color:#ff6b6b;" onclick="deleteContact(${c.id})" title="Remover">❌</button>
            </div>
        </div>`;
    });
    div.innerHTML = html;
}

window.copyToClip = function(text) {
    navigator.clipboard.writeText(text);
    alert("Endereço copiado!");
}

window.sendToFriend = function(address) {
    if(window.navigate) window.navigate('multisender');
    
    // Pequeno delay para garantir que a aba trocou
    setTimeout(() => {
        const csvArea = document.getElementById('csvInput');
        if(csvArea) {
            csvArea.value = `${address}, `; 
            csvArea.focus();
            alert(`Modo de envio ativado para: ${address}\n\nDigite a quantidade após a vírgula.`);
        }
    }, 100);
}

window.deleteContact = async function(id) {
    if(!confirm("Remover este aliado?")) return;
    await supabaseClient.from('contacts').delete().eq('id', id);
    loadContacts();
}
