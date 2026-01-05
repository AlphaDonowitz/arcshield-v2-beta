window.enterApp = function() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('dashboardLayout').style.display = 'flex';
}

window.safeNavigate = function(pageId, btn) {
    if(window.navigate) window.navigate(pageId, btn);
    setTimeout(() => { if(window.lucide) window.lucide.createIcons(); }, 50);
}

// LÓGICA DO MENU LATERAL (ACCORDION)
window.toggleSubmenu = function(submenuId, parentBtn) {
    const menu = document.getElementById(submenuId);
    if(menu) menu.classList.toggle('open');
    
    document.querySelectorAll('.nav-item').forEach(el => {
        if(!el.closest('.submenu') && el !== parentBtn) el.classList.remove('active');
    });
    if(parentBtn) parentBtn.classList.add('active');
}

window.navigate = function(pageId, btnElement) {
    if(btnElement && !btnElement.closest('.submenu')) {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        if(btnElement) btnElement.classList.add('active');
    }
    if(btnElement && btnElement.closest('.submenu')) {
        document.querySelectorAll('.submenu .nav-item').forEach(el => el.classList.remove('active'));
        btnElement.classList.add('active');
    }

    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    const page = document.getElementById(pageId);
    if(page) page.classList.add('active');
    
    const titles = { 
        'token-launcher': 'Lançar Token', 
        'nft-launcher': 'Criar Coleção NFT', 
        'multisender': 'Multisender', 
        'locker': 'Liquidity Locker', 
        'vesting': 'Vesting Schedule', 
        'bridge': 'CCTP Bridge', 
        'leaderboard': 'User Hub' 
    };
    const titleEl = document.getElementById('pageTitle');
    if(titleEl) titleEl.innerText = titles[pageId] || 'Dashboard';
}

// --- CORREÇÃO: LÓGICA DE ABAS (AGORA DENTRO DO UI.JS) ---
window.showSubTab = function(name, btn) {
    // 1. Esconde todas as abas
    ['subTabGlobal', 'subTabMy', 'subTabPortfolio', 'subTabRanking'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
    });
    
    // 2. Remove classe active dos botões
    document.querySelectorAll('.tab-clean').forEach(b => b.classList.remove('active'));
    
    // 3. Mostra a aba alvo
    const targetId = name === 'ranking' ? 'subTabRanking' : 'subTab' + name.charAt(0).toUpperCase() + name.slice(1);
    const targetEl = document.getElementById(targetId);
    if(targetEl) targetEl.style.display = 'block';
    
    // 4. Ativa o botão clicado
    if(btn) btn.classList.add('active');
    
    // 5. Executa a função de carregar dados correspondente
    if(name === 'my' && window.loadMyCreations) {
        window.loadMyCreations(); // <--- CHAMA O CARREGAMENTO
    }
    if(name === 'ranking' && window.loadLeaderboard) {
        window.loadLeaderboard();
    }
    if(name === 'portfolio' && window.loadMyPortfolio) {
        window.loadMyPortfolio();
    }

    // Refresh Ícones
    setTimeout(() => { if(window.lucide) window.lucide.createIcons(); }, 100);
}

// UTILS DE IMAGEM E UPLOAD
window.compressImage = function(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = 300 / Math.max(img.width, img.height);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7)); 
            };
        };
    });
}

window.handleLogoUpload = async function(input, textId) {
    if(input.files && input.files[0]) {
        const el = document.getElementById(textId);
        if(el) el.innerText = "Processando...";
        window.uploadedLogoData = await window.compressImage(input.files[0]);
        if(el) el.innerText = input.files[0].name;
    }
}

window.handleFileUpload = function(input) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) { 
        const el = document.getElementById('csvInput');
        if(el) el.value = e.target.result; 
    };
    reader.readAsText(file);
}

window.setBridgeMode = function(mode) {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    if(event && event.target) event.target.classList.add('active');
    
    const deposit = document.getElementById('bridgeDepositArea');
    const claim = document.getElementById('bridgeClaimArea');
    
    if(deposit) deposit.style.display = mode === 'deposit' ? 'block' : 'none';
    if(claim) claim.style.display = mode === 'claim' ? 'block' : 'none';
}
