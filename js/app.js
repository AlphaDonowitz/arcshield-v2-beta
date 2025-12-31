// ==========================================
// 1. NAVEGAÇÃO & UI LOGIC
// ==========================================

// Iniciar App (Sai da Landing Page)
function enterApp() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('dashboardLayout').style.display = 'flex';
    
    // Verifica se é a primeira vez
    const hasSeenTutorial = localStorage.getItem('arcShieldTutorial');
    if (!hasSeenTutorial) {
        document.getElementById('tutorialOverlay').style.display = 'flex';
    }
}

// Troca de Páginas (Tabs)
function navigate(pageId, btnElement) {
    // 1. Atualiza Menu
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');

    // 2. Atualiza Conteúdo
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    // 3. Atualiza Título do Topo
    const titles = {
        'creator': 'Launchpad',
        'multisender': 'Multisender',
        'locker': 'Liquidity Locker',
        'vesting': 'Vesting',
        'leaderboard': 'Ranking'
    };
    document.getElementById('pageTitle').innerText = titles[pageId];
}

// Tutorial Logic
function nextTutorial(step) {
    document.querySelectorAll('.tut-step').forEach(el => el.classList.remove('active'));
    document.getElementById(`tutStep${step}`).classList.add('active');
}

function finishTutorial() {
    document.getElementById('tutorialOverlay').style.display = 'none';
    localStorage.setItem('arcShieldTutorial', 'true');
}

// Upload de Logo
function handleLogoUpload(input) {
    if(input.files && input.files[0]) {
        document.getElementById('logoFileName').innerText = input.files[0].name;
        // Reader logic mantida
        const reader = new FileReader();
        reader.onload = function(e) { window.uploadedLogoData = e.target.result; };
        reader.readAsDataURL(input.files[0]);
    }
}

// ==========================================
// 2. WEB3 CONNECTION (NUCLEAR MODE)
// ==========================================
// ... (Copie a lógica de conexão Nuclear/Rabby da resposta anterior AQUI) ...
// OBS: Mantenha as constantes (ARC_CHAIN_ID, etc) e a função connectWallet igualzinha à ultima versão funcional.

// ATENÇÃO: Para economizar espaço na resposta, vou colocar apenas o esqueleto das funções Web3.
// Você deve manter o conteúdo robusto que já fizemos.

// Exemplo de adaptação para o novo layout:
window.connectWallet = async function() {
    // ... lógica nuclear ...
    // Se sucesso:
    const btn = document.getElementById("btnConnect");
    btn.innerText = "0x" + userAddress.slice(2,6) + "..." + userAddress.slice(-4);
    btn.classList.add('btn-disconnect');
    // ...
}

// ==========================================
// 3. FUNÇÕES DOS MÓDULOS (Launchpad, etc)
// ==========================================
// Mantenha as funções createToken, sendBatch, lockTokens, createVesting exatamente como antes.
// Apenas certifique-se de que os IDs dos inputs no HTML acima batem com o JS (Eu verifiquei, batem: tokenName, tokenSymbol, etc).

// Função de Sucesso (Modal) - Adaptada para o novo HTML
window.showSuccessModal = async function(title, msg, tweetText, txHash, imageUrl = null, cardData = null, tokenAddress = null) {
    document.getElementById("modalTitle").innerText = title;
    document.getElementById("modalMsg").innerText = msg;
    
    if(tokenAddress) {
        document.getElementById("tokenCreatedInfo").style.display = 'block';
        document.getElementById("newContractAddr").innerText = tokenAddress;
    }

    // Lógica do Card...
    const modal = document.getElementById("successModal");
    modal.style.display = 'flex';
}
