// ... (MANTENHA TODAS AS CONSTANTES E CONFIGS INICIAIS DA VERSÃO ANTERIOR) ...

// ==========================================
// 1. VARIÁVEIS DO PERFIL
// ==========================================
let userProfile = {
    username: "Visitante",
    bio: "",
    avatar: null,
    points: 0,
    tokens: 0,
    vestings: 0,
    locks: 0,
    multisends: 0
};
let myChart = null; // Instância do gráfico

// ... (MANTENHA A LÓGICA DE NAVEGAÇÃO E WEB3 DA VERSÃO ANTERIOR) ...

// ==========================================
// 2. FUNÇÃO DE LOGIN ATUALIZADA (Carrega Perfil)
// ==========================================
function setupUIConnected() {
    // ... (Código anterior de botão e status) ...
    const btn = document.getElementById("btnConnect");
    btn.innerText = "🟢 " + userAddress.slice(0,6) + "...";
    btn.classList.add('btn-disconnect');
    btn.onclick = disconnectWallet;
    
    // Carrega dados do Supabase
    if(supabaseClient) loadUserProfile(userAddress);
}

// Carregar Dados Detalhados
async function loadUserProfile(wallet) {
    try {
        let { data: user } = await supabaseClient.from('users').select('*').eq('wallet_address', wallet).single();
        
        if (!user) {
            // Cria usuário se não existir
            const newUser = { wallet_address: wallet, points: 0, avatar_url: `https://robohash.org/${wallet}?set=set4` };
            await supabaseClient.from('users').insert([newUser]);
            userProfile = { ...userProfile, ...newUser };
        } else {
            // Popula variável local
            userProfile = {
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
    } catch(e) { console.error("Erro profile:", e); }
}

// Atualiza a UI do Perfil
function updateProfileUI() {
    document.getElementById('userDisplayName').innerText = userProfile.username;
    document.getElementById('userWalletDisplay').innerText = userAddress;
    document.getElementById('userBioDisplay').innerText = userProfile.bio;
    document.getElementById('userAvatarDisplay').src = userProfile.avatar;
    
    document.getElementById('statTokens').innerText = userProfile.tokens;
    document.getElementById('statMulti').innerText = userProfile.multisends;
    document.getElementById('statLocks').innerText = userProfile.locks;
    document.getElementById('statVests').innerText = userProfile.vestings;
    document.getElementById('statXP').innerText = userProfile.points;
    
    renderCharts(); // Desenha os gráficos
}

// ==========================================
// 3. LÓGICA DE DAILY CHECK-IN
// ==========================================
function checkDailyAvailability() {
    const btn = document.getElementById('btnDailyCheckin');
    const timer = document.getElementById('dailyTimer');
    
    if(!userProfile.lastDaily) {
        btn.disabled = false;
        return;
    }

    const last = new Date(userProfile.lastDaily).getTime();
    const now = new Date().getTime();
    const diff = now - last;
    const hours24 = 24 * 60 * 60 * 1000;

    if (diff > hours24) {
        btn.disabled = false;
        timer.innerText = "Disponível agora!";
        timer.style.color = "#00ff9d";
    } else {
        btn.disabled = true;
        const wait = hours24 - diff;
        const hoursLeft = Math.floor((wait % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minLeft = Math.floor((wait % (1000 * 60 * 60)) / (1000 * 60));
        timer.innerText = `Volte em ${hoursLeft}h ${minLeft}m`;
        timer.style.color = "#888";
    }
}

async function dailyCheckIn() {
    if(!supabaseClient) return;
    try {
        const now = new Date().toISOString();
        const newPoints = userProfile.points + 50;
        
        await supabaseClient.from('users').update({ 
            points: newPoints,
            last_daily_claim: now
        }).eq('wallet_address', userAddress);
        
        alert("🎉 +50 XP Recebidos!");
        userProfile.points = newPoints;
        userProfile.lastDaily = now;
        updateProfileUI();
        checkDailyAvailability();
        triggerConfetti();
    } catch(e) { alert("Erro no check-in"); }
}

// ==========================================
// 4. EDIÇÃO DE PERFIL
// ==========================================
async function handleAvatarUpload(input) {
    const file = input.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = function(e) { 
            // Salva Base64 (Cuidado: strings muito longas podem ser rejeitadas se o DB não for text/longtext)
            // Idealmente upload para Storage, mas aqui faremos direto no campo text para simplificar.
            userProfile.avatar = e.target.result;
            document.getElementById('userAvatarDisplay').src = userProfile.avatar;
        };
        reader.readAsDataURL(file);
    }
}

async function saveProfileData() {
    const newName = document.getElementById('editName').value;
    const newBio = document.getElementById('editBio').value;
    
    const updates = {};
    if(newName) updates.username = newName;
    if(newBio) updates.bio = newBio;
    if(userProfile.avatar) updates.avatar_url = userProfile.avatar;
    
    if(!userAddress) return alert("Conecte a carteira.");

    try {
        await supabaseClient.from('users').update(updates).eq('wallet_address', userAddress);
        alert("Perfil Atualizado! 💾");
        // Atualiza local
        if(newName) userProfile.username = newName;
        if(newBio) userProfile.bio = newBio;
        updateProfileUI();
    } catch(e) { alert("Erro ao salvar."); }
}

// ==========================================
// 5. GRÁFICOS (CHART.JS)
// ==========================================
function renderCharts() {
    const ctx = document.getElementById('skillsChart').getContext('2d');
    
    // Destrói gráfico anterior se existir para não sobrepor
    if(myChart) myChart.destroy();

    const dataValues = [
        userProfile.tokens, 
        userProfile.multisends, 
        userProfile.locks, 
        userProfile.vestings, 
        Math.min(userProfile.points / 100, 10) // Normaliza XP para escala 0-10
    ];

    myChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Token Creator', 'Airdropper', 'Locker', 'Vesting Master', 'Reputation'],
            datasets: [{
                label: 'Seus Atributos',
                data: dataValues,
                backgroundColor: 'rgba(0, 114, 255, 0.2)',
                borderColor: '#0072FF',
                pointBackgroundColor: '#00ff9d',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    angleLines: { color: 'rgba(255,255,255,0.1)' },
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    pointLabels: { color: '#fff', font: { size: 10 } },
                    ticks: { display: false, backdropColor: 'transparent' }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// ==========================================
// 6. RANKING GLOBAL
// ==========================================
window.loadLeaderboard = async function() {
    const listDiv = document.getElementById("leaderboardList");
    listDiv.innerHTML = "Carregando...";
    
    if(!supabaseClient) return;

    const { data: users } = await supabaseClient
        .from('users')
        .select('username, wallet_address, points, avatar_url, tokens_created')
        .order('points', { ascending: false })
        .limit(10);

    let html = "";
    users.forEach((u, index) => {
        // Badges baseadas em tokens criados
        let badge = "👶";
        if(u.tokens_created > 5) badge = "🔥";
        if(u.tokens_created > 10) badge = "🦄";
        if(u.points > 1000) badge = "👑";

        const displayName = u.username || `${u.wallet_address.substring(0,4)}...`;
        const avatar = u.avatar_url || `https://robohash.org/${u.wallet_address}?set=set4`;

        html += `
        <div class="leaderboard-row">
            <div class="rank-num">#${index + 1}</div>
            <div class="user-cell">
                <img src="${avatar}">
                <span>${displayName}</span>
            </div>
            <div class="badge-cell">${badge}</div>
            <div style="color:#00ff9d; font-weight:bold;">${u.points} XP</div>
        </div>
        `;
    });
    listDiv.innerHTML = html;
}

// ==========================================
// 7. INCREMENTO DE PONTOS (Updates nas Funções Antigas)
// ==========================================
// Adicione esta função auxiliar e chame ela dentro das funções createToken, etc.
async function incrementStat(statColumn, points) {
    if(!supabaseClient) return;
    
    // Pega valor atual
    let { data: u } = await supabaseClient.from('users').select(`${statColumn}, points`).eq('wallet_address', userAddress).single();
    
    const newCount = (u[statColumn] || 0) + 1;
    const newPoints = (u.points || 0) + points;

    // Atualiza
    const updateObj = { points: newPoints };
    updateObj[statColumn] = newCount;
    
    await supabaseClient.from('users').update(updateObj).eq('wallet_address', userAddress);
    
    // Atualiza localmente
    userProfile.points = newPoints;
    if(statColumn === 'tokens_created') userProfile.tokens = newCount;
    // ... outros mappings
}

// EXEMPLO DE INTEGRAÇÃO (Faça isso em createToken, lockTokens, etc):
/*
 window.createToken = async function() {
    // ... lógica de contrato ...
    await tx.wait();
    
    // LINHA NOVA:
    await incrementStat('tokens_created', 100); 
    
    showSuccessModal(...)
 }
*/
