// ==========================================
// SOCIAL HUB & GAMIFICATION
// ==========================================

window.userProfile = {
    username: "Visitante", bio: "", avatar: null,
    points: 0, tokens: 0, vestings: 0, locks: 0, multisends: 0
};
let myChart = null;

window.loadUserProfile = async function(wallet) {
    if(!window.supabaseClient) return;
    try {
        let { data: user } = await supabaseClient.from('users').select('*').eq('wallet_address', wallet).single();
        
        if (!user) {
            const newUser = { wallet_address: wallet, points: 0, avatar_url: `https://robohash.org/${wallet}?set=set4` };
            await supabaseClient.from('users').insert([newUser]);
            window.userProfile = { ...window.userProfile, ...newUser };
        } else {
            window.userProfile = {
                username: user.username || `User ${wallet.slice(0,4)}`,
                bio: user.bio || "Sem descrição.",
                avatar: user.avatar_url || `https://robohash.org/${wallet}?set=set4`,
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
    } catch(e) { console.error("Erro Profile:", e); }
}

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
    const img = document.getElementById('userAvatarDisplay');
    if(img) img.src = window.userProfile.avatar;
    
    renderCharts();
}

// Daily Checkin
function checkDailyAvailability() {
    const btn = document.getElementById('btnDailyCheckin');
    const timer = document.getElementById('dailyTimer');
    if(!btn) return;

    if(!window.userProfile.lastDaily) {
        btn.disabled = false; timer.innerText = "Disponível!";
        return;
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
    alert("+50 XP!");
    window.userProfile.points = newPoints;
    window.userProfile.lastDaily = now;
    updateProfileUI();
    checkDailyAvailability();
    if(window.confetti) window.confetti();
}

window.incrementStat = async function(col, pts) {
    if(!window.supabaseClient) return;
    const { data: u } = await supabaseClient.from('users').select(`${col}, points`).eq('wallet_address', userAddress).single();
    const update = { points: (u.points||0) + pts };
    update[col] = (u[col]||0) + 1;
    await supabaseClient.from('users').update(update).eq('wallet_address', userAddress);
    // Reload profile
    loadUserProfile(userAddress);
}

// Chart
function renderCharts() {
    const ctx = document.getElementById('skillsChart');
    if(!ctx) return;
    
    if(myChart) myChart.destroy();
    
    // Normalização simples para o gráfico ficar bonito
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

// Edição de Perfil
window.handleAvatarUpload = function(input) {
    const file = input.files[0];
    if(file) {
        const r = new FileReader();
        r.onload = function(e) { 
            window.userProfile.avatar = e.target.result; 
            updateProfileUI(); 
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
    if(window.userProfile.avatar) up.avatar_url = window.userProfile.avatar;
    
    await supabaseClient.from('users').update(up).eq('wallet_address', userAddress);
    alert("Salvo!");
    loadUserProfile(userAddress);
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