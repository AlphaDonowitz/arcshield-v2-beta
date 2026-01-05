window.enterApp = function() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('dashboardLayout').style.display = 'flex';
}

window.safeNavigate = function(pageId, btn) {
    if(window.navigate) window.navigate(pageId, btn);
    setTimeout(() => { if(window.lucide) window.lucide.createIcons(); }, 50);
}

// LÓGICA DO MENU LATERAL (SUBMENU ACCORDION)
window.toggleSubmenu = function(submenuId, parentBtn) {
    // 1. Alterna visibilidade do submenu
    const menu = document.getElementById(submenuId);
    menu.classList.toggle('open');
    
    // 2. Gira o ícone chevron se quiser (opcional)
    // 3. Remove classe active de outros items principais
    document.querySelectorAll('.nav-item').forEach(el => {
        if(!el.closest('.submenu') && el !== parentBtn) el.classList.remove('active');
    });
    if(parentBtn) parentBtn.classList.add('active');
}

window.navigate = function(pageId, btnElement) {
    // Se o clique veio de um submenu, mantém o pai ativo
    if(btnElement && !btnElement.closest('.submenu')) {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        if(btnElement) btnElement.classList.add('active');
    }
    // Se veio do submenu, destaca apenas o filho
    if(btnElement && btnElement.closest('.submenu')) {
        document.querySelectorAll('.submenu .nav-item').forEach(el => el.classList.remove('active'));
        btnElement.classList.add('active');
    }

    // Navegação de Telas
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    const titles = { 
        'token-launcher': 'Lançar Token', 
        'nft-launcher': 'Criar Coleção NFT', 
        'multisender': 'Multisender', 
        'locker': 'Liquidity Locker', 
        'vesting': 'Vesting Schedule', 
        'bridge': 'CCTP Bridge', 
        'leaderboard': 'User Hub' 
    };
    document.getElementById('pageTitle').innerText = titles[pageId] || 'Dashboard';
}

// COMPRESSÃO DE IMAGENS
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

// Upload Genérico para lidar com ID do texto
window.handleLogoUpload = async function(input, textId) {
    if(input.files && input.files[0]) {
        document.getElementById(textId).innerText = "Processando...";
        window.uploadedLogoData = await window.compressImage(input.files[0]);
        document.getElementById(textId).innerText = input.files[0].name;
    }
}

window.handleFileUpload = function(input) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) { document.getElementById('csvInput').value = e.target.result; };
    reader.readAsText(file);
}

window.setBridgeMode = function(mode) {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('bridgeDepositArea').style.display = mode === 'deposit' ? 'block' : 'none';
    document.getElementById('bridgeClaimArea').style.display = mode === 'claim' ? 'block' : 'none';
}
