function updateProfileUI() {
    document.getElementById('userDisplayName').innerText = window.userProfile.username;

    // --- INICIO DA ALTERAÇÃO ---
    const wallet = window.userAddress;
    const shortWallet = wallet.slice(0, 6) + "..." + wallet.slice(-4);
    
    // Injetamos HTML com o ícone Lucide 'copy'
    const badge = document.getElementById('userWalletDisplay');
    badge.innerHTML = `<span>${shortWallet}</span> <i data-lucide="copy"></i>`;
    
    // Adicionamos a função de clique direto aqui
    badge.onclick = function() {
        navigator.clipboard.writeText(wallet);
        // Feedback visual rápido (troca ícone para check)
        badge.innerHTML = `<span>${shortWallet}</span> <i data-lucide="check" style="color:#22c55e"></i>`;
        if(window.lucide) window.lucide.createIcons();
        
        // Volta ao normal em 2 segundos
        setTimeout(() => {
            badge.innerHTML = `<span>${shortWallet}</span> <i data-lucide="copy"></i>`;
            if(window.lucide) window.lucide.createIcons();
        }, 2000);
    };
    
    // Importante: Renderizar o ícone novo
    if(window.lucide) window.lucide.createIcons();
    // --- FIM DA ALTERAÇÃO ---

    document.getElementById('userBioDisplay').innerText = window.userProfile.bio;
    document.getElementById('statTokens').innerText = window.userProfile.tokens;
    document.getElementById('statMulti').innerText = window.userProfile.multisends;
    document.getElementById('statLocks').innerText = window.userProfile.locks;
    document.getElementById('statVests').innerText = window.userProfile.vestings;
    document.getElementById('statXP').innerText = window.userProfile.points;
    document.getElementById('userAvatarDisplay').src = window.userProfile.avatar;
    const banner = document.getElementById('profileBannerDisplay');
    if(window.userProfile.banner) banner.style.backgroundImage = `url('${window.userProfile.banner}')`;
}
