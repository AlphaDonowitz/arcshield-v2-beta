window.enterApp = function() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('dashboardLayout').style.display = 'flex';
}

window.safeNavigate = function(pageId, btn) {
    if(window.navigate) window.navigate(pageId, btn);
    setTimeout(() => { if(window.lucide) window.lucide.createIcons(); }, 50);
}

window.toggleSubmenu = function(submenuId, parentBtn) {
    const menu = document.getElementById(submenuId);
    if(menu) menu.classList.toggle('open');
    document.querySelectorAll('.nav-item').forEach(el => { if(!el.closest('.submenu') && el !== parentBtn) el.classList.remove('active'); });
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
        'studio': 'NFT Studio', 
        'token-launcher': 'Token Factory', 
        'multisender': 'Multisender', 
        'locker': 'Liquidity Locker', 
        'vesting': 'Vesting Schedule', 
        'bridge': 'CCTP Bridge', 
        'leaderboard': 'User Hub' 
    };
    const titleEl = document.getElementById('pageTitle');
    if(titleEl) titleEl.innerText = titles[pageId] || 'Dashboard';
}

window.showSubTab = function(name, btn) {
    ['subTabGlobal', 'subTabMy', 'subTabPortfolio', 'subTabRanking'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
    });
    document.querySelectorAll('.tab-clean').forEach(b => b.classList.remove('active'));
    const targetId = name === 'ranking' ? 'subTabRanking' : 'subTab' + name.charAt(0).toUpperCase() + name.slice(1);
    const targetEl = document.getElementById(targetId);
    if(targetEl) targetEl.style.display = 'block';
    if(btn) btn.classList.add('active');
    if(name === 'my' && window.loadMyCreations) window.loadMyCreations();
    if(name === 'ranking' && window.loadLeaderboard) window.loadLeaderboard();
    if(name === 'portfolio' && window.loadMyPortfolio) window.loadMyPortfolio();
    setTimeout(() => { if(window.lucide) window.lucide.createIcons(); }, 100);
}

// NOVA FUNÇÃO: ABAS DO GERENCIADOR NFT
window.switchMgrTab = function(tabName, btn) {
    ['mgrTabDash', 'mgrTabWl', 'mgrTabMint'].forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
    document.querySelectorAll('#nftManagerDialog .tab-clean').forEach(b => b.classList.remove('active'));
    
    document.getElementById('mgrTab' + tabName.charAt(0).toUpperCase() + tabName.slice(1)).style.display = 'block';
    if(btn) btn.classList.add('active');
}

window.adjustMintAmount = function(delta) {
    const el = document.getElementById('mintAmountDisplay');
    let val = parseInt(el.innerText) + delta;
    if(val < 1) val = 1;
    if(val > 10) val = 10;
    el.innerText = val;
}

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
