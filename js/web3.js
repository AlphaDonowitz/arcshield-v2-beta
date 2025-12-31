// ==========================================
// LÓGICA WEB3 & CONTRATOS
// ==========================================

// Inicialização Automática
window.addEventListener('load', async function() {
    if (localStorage.getItem('userDisconnected') === 'true') return;
    
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
                // Se já tem conta, pula landing page direto
                document.getElementById('landingPage').style.display = 'none';
                document.getElementById('dashboardLayout').style.display = 'flex';
                
                window.provider = new ethers.BrowserProvider(window.ethereum);
                window.signer = await window.provider.getSigner();
                window.userAddress = await window.signer.getAddress();
                setupUIConnected();
            }
        } catch(e) { console.log("Sem sessão"); }
    }
});

// Conexão Nuclear
window.connectWallet = async function() {
    localStorage.removeItem('userDisconnected');
    try {
        if (!window.ethereum) { alert("Instale MetaMask ou Rabby!"); return; }
        
        try { await window.ethereum.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] }); } 
        catch (e) { if (e.code === 4001) return; }

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (!accounts || accounts.length === 0) return;

        window.provider = new ethers.BrowserProvider(window.ethereum);
        await ensureNetwork('arc');

        window.signer = await window.provider.getSigner();
        window.userAddress = await window.signer.getAddress();
        setupUIConnected();

    } catch (e) { console.error(e); }
}

function setupUIConnected() {
    const btn = document.getElementById("btnConnect");
    if(btn) {
        btn.innerText = "🟢 " + window.userAddress.slice(0,6) + "...";
        btn.classList.add('btn-disconnect');
        btn.onclick = disconnectWallet;
    }
    
    // Integração com Social
    if(window.loadUserProfile) window.loadUserProfile(window.userAddress);
    
    // Auto-fill bridge
    const bridgeRec = document.getElementById('bridgeRecipient');
    if(bridgeRec) bridgeRec.value = window.userAddress;
}

window.disconnectWallet = async function() {
    localStorage.setItem('userDisconnected', 'true');
    window.location.reload();
}

async function ensureNetwork(networkKey) {
    const cfg = window.CCTP_CONFIG;
    const targetChain = networkKey === 'sepolia' ? cfg.sepolia.chainId : window.ARC_CHAIN_ID;
    const rpc = networkKey === 'sepolia' ? cfg.sepolia.rpc : window.ARC_RPC_URL;
    
    try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: targetChain }] });
    } catch (switchError) {
        if (switchError.code === 4902) {
             await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: targetChain,
                    chainName: networkKey === 'sepolia' ? 'Sepolia' : 'Arc Testnet',
                    nativeCurrency: networkKey === 'sepolia' ? { name: 'ETH', symbol: 'ETH', decimals: 18 } : { name: 'USDC', symbol: 'USDC', decimals: 6 },
                    rpcUrls: [rpc],
                    blockExplorerUrls: [networkKey === 'sepolia' ? 'https://sepolia.etherscan.io' : window.ARC_EXPLORER]
                }]
            });
        }
    }
    window.provider = new ethers.BrowserProvider(window.ethereum);
    window.signer = await window.provider.getSigner();
}

// --- FUNÇÕES DE MÓDULOS ---

// Launchpad
window.createToken = async function() {
    await ensureNetwork('arc');
    const name = document.getElementById("tokenName").value;
    const symbol = document.getElementById("tokenSymbol").value;
    const supply = document.getElementById("tokenSupply").value;
    
    if(!name || !symbol || !supply) return alert("Preencha tudo!");
    setLoading('btnCreate', true); 
    
    try {
        const c = new ethers.Contract(CONTRACTS.factory, ABIS.factory, signer);
        const tx = await c.createToken(name, symbol, supply);
        const receipt = await tx.wait();
        let deployedAddr = null;
        // Parse logs simplificado
        try { if(receipt.logs[0]) deployedAddr = receipt.logs[0].address; } catch(e){}

        if(window.incrementStat) await window.incrementStat('tokens_created', 100);
        
        // Gera Card
        let cardImage = null;
        if(window.generateSocialCard) cardImage = await window.generateSocialCard(name, symbol, supply, window.uploadedLogoData);

        showSuccessModal(`Token ${symbol} Criado!`, "Sucesso!", null, tx.hash, window.uploadedLogoData, cardImage, deployedAddr);
    } catch (e) { console.error(e); alert("Erro: " + e.message); } 
    finally { setLoading('btnCreate', false); }
}

// Bridge CCTP
window.setBridgeMode = function(mode) {
    document.getElementById('bridgeDepositArea').style.display = mode === 'deposit' ? 'block' : 'none';
    document.getElementById('bridgeClaimArea').style.display = mode === 'claim' ? 'block' : 'none';
    // Toggle classes visual (se quiser)
}

window.approveUSDC = async function() {
    await ensureNetwork('sepolia');
    const amt = document.getElementById('bridgeAmount').value;
    const wei = ethers.parseUnits(amt, 6);
    const c = new ethers.Contract(CCTP_CONFIG.sepolia.usdc, ABIS.erc20, signer);
    setLoading('btnApproveCCTP', true);
    try {
        await (await c.approve(CCTP_CONFIG.sepolia.tokenMessenger, wei)).wait();
        alert("Aprovado!"); document.getElementById('btnBurnCCTP').disabled = false;
    } catch(e) { alert("Erro"); } finally { setLoading('btnApproveCCTP', false); }
}

window.burnUSDC = async function() {
    await ensureNetwork('sepolia');
    const amt = document.getElementById('bridgeAmount').value;
    const wei = ethers.parseUnits(amt, 6);
    const recip = ethers.zeroPadValue(userAddress, 32);
    const c = new ethers.Contract(CCTP_CONFIG.sepolia.tokenMessenger, ABIS.tokenMessenger, signer);
    setLoading('btnBurnCCTP', true);
    try {
        const tx = await c.depositForBurn(wei, CCTP_CONFIG.arc.domainId, recip, CCTP_CONFIG.sepolia.usdc);
        await tx.wait();
        showSuccessModal("Bridge Iniciada!", "Aguarde assinatura da Circle.", null, tx.hash);
    } catch(e) { alert("Erro Burn"); } finally { setLoading('btnBurnCCTP', false); }
}

window.mintUSDC = async function() {
    await ensureNetwork('arc');
    const msg = document.getElementById('cctpMessageBytes').value;
    const att = document.getElementById('cctpAttestation').value;
    const c = new ethers.Contract(CCTP_CONFIG.arc.messageTransmitter, ABIS.messageTransmitter, signer);
    setLoading('btnClaimCCTP', true);
    try {
        const tx = await c.receiveMessage(msg, att);
        await tx.wait();
        showSuccessModal("Bridge Finalizada!", "USDC Recebido na Arc.", null, tx.hash);
    } catch(e) { alert("Erro Mint"); } finally { setLoading('btnClaimCCTP', false); }
}

// Multisender, Locker e Vesting seguem a mesma lógica (abreviados aqui para caber, mas copie do seu antigo app.js se precisar, apenas certifique-se de chamar window.incrementStat se sucesso)

// Utils do Modal
window.showSuccessModal = function(title, msg, tweet, hash, img, card, addr) {
    document.getElementById("modalTitle").innerText = title;
    document.getElementById("modalMsg").innerText = msg;
    if(addr) {
        document.getElementById("tokenCreatedInfo").style.display = 'block';
        document.getElementById("newContractAddr").innerText = addr;
    }
    document.getElementById("successModal").style.display = 'flex';
    if(window.confetti) window.confetti();
}

window.generateSocialCard = async function(name, symbol, supply, logoData) {
    // Lógica do html2canvas
    document.getElementById('cardTokenSymbol').innerText = "$" + symbol;
    document.getElementById('cardTokenName').innerText = name;
    document.getElementById('cardTokenSupply').innerText = supply;
    const imgEl = document.getElementById('cardTokenLogo');
    if(logoData) { imgEl.src = logoData; imgEl.style.display='block'; } else { imgEl.style.display='none'; }
    
    try {
        const canvas = await html2canvas(document.getElementById("socialCardTemplate"), { backgroundColor: null, scale: 2 });
        return canvas.toDataURL("image/png");
    } catch(e) { return null; }
}