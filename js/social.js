// ==========================================
// SOCIAL HUB & GAMIFICATION (V3.6 - Fix Banner)
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

// 1. CARREGAR PERFIL
window.loadUserProfile = async function(wallet) {
    if(!window.supabaseClient) return;
    try {
        // Seleciona explicitamente as colunas para evitar erros de cache
        let { data: user, error } = await supabaseClient
            .from('users')
            .select('username, bio, avatar_url, banner_url, points, tokens_created, vestings_created, locks_created, multisends_count, last_daily_claim')
            .eq('wallet_address', wallet)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            console.error("Erro Supabase:", error);
            return;
        }

        if (!user) {
            const newUser = { wallet_address: wallet, points: 0, avatar_url: `https://robohash.org/${wallet}?set=set4` };
            await supabaseClient.from('users').insert([newUser]);
            window.userProfile = { ...window.userProfile, ...newUser };
        } else {
            window.userProfile = {
                username: user.username || `User ${wallet.slice(0,4)}`,
                bio: user.bio || "Sem descrição.",
                avatar: user.avatar_url || `https://robohash.org/${wallet}?set=set4`,
                banner: user.banner_url || null, // Carrega Banner
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

// 5. UPLOADS COM AUTO-SAVE
// Função genérica para salvar imagens
async function saveImageToDB(field, base64Data) {
    if(!window.userAddress) return alert("Conecte a carteira primeiro.");
    
    // Verificação de tamanho (aprox 2MB)
    if(base64Data.length > 3000000) {
        return alert("Imagem muito grande! Tente uma menor que 2MB.");
    }

    const updateObj = {};
    updateObj[field] = base64Data;

    document.body.style.cursor = 'wait'; // Feedback visual
    
    const { error } = await supabaseClient
        .from('users')
        .update(updateObj)
        .eq('wallet_address', window.userAddress);

    document.body.style.cursor = 'default';

    if(error) {
        console.error("Erro Upload:", error);
        if(error.message.includes('banner_url')) {
            alert("ERRO DE BANCO: A coluna 'banner_url' não existe.\n\nPor favor, rode o comando SQL no Supabase.");
        } else {
            alert("Erro ao salvar imagem. Veja o console (F12).");
        }
    } else {
        // Sucesso
        if(window.confetti) window.confetti({ particleCount: 50, spread: 30, origin: { y: 0.3 } });
    }
}

// Upload Avatar
window.handleAvatarUpload = function(input) {
    const file = input.files[0];
    if(file) {
        const r = new FileReader();
        r.onload = function(e) { 
            const base64 = e.target.result;
            window.userProfile.avatar = base64; 
            updateProfileUI(); // Atualiza na hora
            saveImageToDB('avatar_url', base64); // Salva no banco
        };
        r.readAsDataURL(file);
    }
}

// Upload Banner
window.handleBannerUpload = function(input) {
    const file = input.files[0];
    if(file) {
        const r = new FileReader();
        r.onload = function(e) { 
            const base64 = e.target.result;
            window.userProfile.banner = base64; 
            updateProfileUI(); // Atualiza na hora
            saveImageToDB('banner_url', base64); // Salva no banco
        };
        r.readAsDataURL(file);
    }
}

// Salvar Textos (Nome/Bio)
window.saveProfileData = async function() {
    const name = document.getElementById('editName').value;
    const bio = document.getElementById('editBio').value;
    
    const up = {};
    if(name) up.username = name;
    if(bio) up.bio = bio;
    
    // Não enviamos imagens aqui de novo para economizar dados,
    // já que o auto-save cuida disso.
    
    if(Object.keys(up).length === 0) return alert("Nada para salvar nos textos.");

    const { error } = await supabaseClient.from('users').update(up).eq('wallet_address', userAddress);
    
    if(error) alert("Erro ao salvar perfil.");
    else {
        alert("Texto Atualizado! 💾");
        loadUserProfile(userAddress);
    }
}

// 6. LEADERBOARD
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
