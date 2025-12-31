// ==========================================
// UI & NAVEGAÇÃO
// ==========================================

// 1. Entrar no App (Função que estava falhando)
window.enterApp = function() {
    console.log("Entrando no App...");
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('dashboardLayout').style.display = 'flex';
    
    // Verifica tutorial
    const hasSeenTutorial = localStorage.getItem('arcShieldTutorial');
    if (!hasSeenTutorial) {
        document.getElementById('tutorialOverlay').style.display = 'flex';
    }
}

// 2. Navegação Sidebar
window.navigate = function(pageId, btnElement) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');

    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(pageId);
    if(target) target.classList.add('active');

    const titles = {
        'creator': 'Launchpad', 'multisender': 'Multisender', 'locker': 'Liquidity Locker',
        'vesting': 'Vesting', 'bridge': 'Bridge CCTP', 'leaderboard': 'Social Hub'
    };
    const titleEl = document.getElementById('pageTitle');
    if(titleEl) titleEl.innerText = titles[pageId] || 'Dashboard';
}

// 3. Tutorial
window.nextTutorial = function(step) {
    document.querySelectorAll('.tut-step').forEach(el => el.classList.remove('active'));
    const stepEl = document.getElementById(`tutStep${step}`);
    if(stepEl) stepEl.classList.add('active');
}
window.finishTutorial = function() {
    document.getElementById('tutorialOverlay').style.display = 'none';
    localStorage.setItem('arcShieldTutorial', 'true');
}

// 4. Utils Visuais
window.setLoading = function(btnId, isLoading) {
    const btn = document.getElementById(btnId);
    if(!btn) return;
    if (isLoading) {
        btn.dataset.originalText = btn.innerText;
        btn.innerText = "⏳ ...";
        btn.disabled = true;
        btn.style.opacity = "0.7";
    } else {
        btn.innerText = btn.dataset.originalText || "Enviar";
        btn.disabled = false;
        btn.style.opacity = "1";
    }
}

window.handleLogoUpload = function(input) {
    if(input.files && input.files[0]) {
        document.getElementById('logoFileName').innerText = input.files[0].name;
        const reader = new FileReader();
        reader.onload = function(e) { window.uploadedLogoData = e.target.result; };
        reader.readAsDataURL(input.files[0]);
    }
}

window.handleFileUpload = function(input) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) { 
        document.getElementById('csvInput').value = e.target.result; 
        if(window.updateSummary) window.updateSummary(); // Chama se existir
    };
    reader.readAsText(file);
}

// Helpers do Modal
window.copyContractAddr = function() {
    const addr = document.getElementById('newContractAddr').innerText;
    navigator.clipboard.writeText(addr);
    alert("Copiado!");
}
