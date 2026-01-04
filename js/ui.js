window.enterApp = function() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('dashboardLayout').style.display = 'flex';
}

window.safeNavigate = function(pageId, btn) {
    if(window.navigate) window.navigate(pageId, btn);
    setTimeout(() => { if(window.lucide) window.lucide.createIcons(); }, 50);
}

window.navigate = function(pageId, btnElement) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    const titles = { 'creator': 'Launchpad', 'multisender': 'Multisender', 'locker': 'Liquidity Locker', 'vesting': 'Vesting Schedule', 'bridge': 'CCTP Bridge', 'leaderboard': 'User Hub' };
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

window.handleLogoUpload = async function(input) {
    if(input.files && input.files[0]) {
        document.getElementById('logoFileName').innerText = "Processando...";
        window.uploadedLogoData = await window.compressImage(input.files[0]);
        document.getElementById('logoFileName').innerText = input.files[0].name;
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
