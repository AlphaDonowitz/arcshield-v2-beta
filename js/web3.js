const ABI_NFT_MGR = [
    "function totalSupply() view returns (uint256)",
    "function currentPhase() view returns (uint8)",
    "function setPhase(uint8) external",
    "function withdraw() external",
    "function setMerkleRoot(bytes32) external",
    "function mintPublic(uint256) external payable",
    "function mintPrice() view returns (uint256)"
];

// DADOS GLOBAIS DO MULTISENDER
window.multiData = { token: null, decimals: 18, validRecipients: [], totalAmount: 0n };

window.addEventListener('load', async function() {
    if (localStorage.getItem('userDisconnected') === 'true') return;
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                window.provider = new ethers.BrowserProvider(window.ethereum);
                window.signer = await window.provider.getSigner();
                window.userAddress = await window.signer.getAddress();
                window.enterApp();
                setupUIConnected();
            }
        } catch(e) {}
    }
});

window.connectWallet = async function() {
    localStorage.removeItem('userDisconnected');
    if (!window.ethereum) return alert("Instale MetaMask!");
    await window.ethereum.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts.length) return;
    window.provider = new ethers.BrowserProvider(window.ethereum);
    await ensureNetwork('arc');
    window.signer = await window.provider.getSigner();
    window.userAddress = await window.signer.getAddress();
    setupUIConnected();
}

function setupUIConnected() {
    const btn = document.getElementById("btnConnect");
    btn.innerHTML = `<i data-lucide="check"></i> ${window.userAddress.slice(0,6)}...`;
    btn.onclick = disconnectWallet;
    if(window.loadUserProfile) window.loadUserProfile(window.userAddress);
    if(window.lucide) window.lucide.createIcons();
}

window.disconnectWallet = async function() {
    localStorage.setItem('userDisconnected', 'true');
    window.location.reload();
}

async function ensureNetwork(key) {
    const chainId = key === 'sepolia' ? CCTP_CONFIG.sepolia.chainId : ARC_CHAIN_ID;
    const rpc = key === 'sepolia' ? CCTP_CONFIG.sepolia.rpc : ARC_RPC_URL;
    try { await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] }); } 
    catch (e) { 
        if (e.code === 4902) await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId, chainName: key==='sepolia'?'Sepolia':'Arc Testnet', nativeCurrency: { name: 'Token', symbol: 'TOK', decimals: 18 }, rpcUrls: [rpc], blockExplorerUrls: [] }] });
    }
    window.provider = new ethers.BrowserProvider(window.ethereum);
    window.signer = await window.provider.getSigner();
}

// 1. DEPLOY TOKEN
window.deployToken = async function() {
    await ensureNetwork('arc');
    const name = document.getElementById("tokenName").value;
    const symbol = document.getElementById("tokenSymbol").value;
    const supply = document.getElementById("tokenSupply").value;
    
    if(!name || !symbol || !supply) return alert("Preencha todos os campos!");

    try {
        const c = new ethers.Contract(CONTRACTS.tokenFactory, ABIS.tokenFactory, signer);
        const tx = await c.createToken(name, symbol, supply);
        
        showSuccessModal("Confirmando...", "Aguarde a transação na blockchain.");
        const receipt = await tx.wait();
        
        let addr = null;
        for(const log of receipt.logs) {
            try {
                const parsed = c.interface.parseLog(log);
                if(parsed.name === 'TokenCreated') {
                    addr = parsed.args[0];
                    break;
                }
            } catch(e) {}
        }
        
        if(window.supabaseClient && addr) {
            await window.supabaseClient.from('created_tokens').insert([{ 
                name, symbol, address: addr, 
                owner_wallet: userAddress, 
                initial_supply: supply, 
                logo_url: window.uploadedLogoData, 
                bonus_claimed: false,
                contract_type: 'ERC20'
            }]);
        }
        await incrementStat('tokens_created', 100);
        showSuccessModal("Token Criado!", `Contrato: ${addr}`, addr);
    } catch(e) { alert("Erro: " + (e.reason || e.message)); }
}

// 2. DEPLOY NFT FROM STUDIO
window.deployNFTFromStudio = async function() {
    await ensureNetwork('arc');
    const name = document.getElementById("studioNftName").value;
    const symbol = document.getElementById("studioNftSymbol").value;
    const priceEth = document.getElementById("studioNftPrice").value;
    const maxSupply = document.getElementById("genCount").value; 

    if(!name || !symbol || !maxSupply || !priceEth) return alert("Preencha todos os campos!");

    try {
        const priceWei = ethers.parseUnits(priceEth, 18);
        const c = new ethers.Contract(CONTRACTS.nftFactory, ABIS.nftFactory, signer);
        const tx = await c.createNFTCollection(name, symbol, maxSupply, priceWei);
        
        showSuccessModal("Criando Coleção...", "Aguarde a confirmação.");
        const receipt = await tx.wait();
        
        let addr = null;
        for(const log of receipt.logs) {
            try {
                const parsed = c.interface.parseLog(log);
                if(parsed.name === 'CollectionCreated') {
                    addr = parsed.args[0];
                    break;
                }
            } catch(e) {}
        }
        
        let logoToSave = window.uploadedLogoData;
        if(!logoToSave) {
            const cvs = document.getElementById('previewCanvas');
            if(cvs) logoToSave = cvs.toDataURL('image/jpeg', 0.5);
        }

        if(window.supabaseClient && addr) {
            await window.supabaseClient.from('created_tokens').insert([{ 
                name, symbol, address: addr, 
                owner_wallet: userAddress, 
                logo_url: logoToSave, 
                bonus_claimed: false,
                initial_supply: maxSupply,
                contract_type: 'ERC721',
                mint_price: priceEth
            }]);
        }
        await incrementStat('tokens_created', 150);
        showSuccessModal("Coleção Criada!", `Contrato: ${addr}`, addr);
    } catch(e) { console.error(e); alert("Erro: " + (e.reason || e.message)); }
}

// 3. NFT MANAGER
window.refreshManagerData = async function(addr) {
    try {
        const c = new ethers.Contract(addr, ABI_NFT_MGR, window.provider);
        const minted = await c.totalSupply();
        const bal = await window.provider.getBalance(addr);
        const price = await c.mintPrice();
        const currentText = document.getElementById('mgrSupply').innerText.split('/')[1] || '?';
        document.getElementById('mgrSupply').innerText = `${minted}/${currentText}`;
        document.getElementById('mgrBalance').innerText = `${ethers.formatEther(bal)} ARC`;
        const priceEth = ethers.formatEther(price);
        document.getElementById('mgrPrice').innerText = priceEth;
        document.getElementById('publicMintPriceDisplay').innerText = `${priceEth} ETH`;
    } catch(e) { console.log("Erro refresh manager", e); }
}

window.updateWhitelist = async function() {
    const addr = document.getElementById('mgrAddress').value;
    const raw = document.getElementById('wlAddresses').value;
    const addresses = raw.split(/[\n,;]+/).map(a => a.trim()).filter(a => ethers.isAddress(a));
    if(addresses.length === 0) return alert("Nenhum endereço válido encontrado!");

    try {
        const leaves = addresses.map(x => keccak256(x));
        const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
        const root = tree.getHexRoot();
        const c = new ethers.Contract(addr, ABI_NFT_MGR, signer);
        const tx = await c.setMerkleRoot(root);
        await tx.wait();
        alert(`Whitelist atualizada com ${addresses.length} endereços!`);
    } catch(e) { console.error(e); alert("Erro ao atualizar WL."); }
}

window.publicMintAction = async function() {
    const addr = document.getElementById('mgrAddress').value;
    const amount = parseInt(document.getElementById('mintAmountDisplay').innerText);
    try {
        const c = new ethers.Contract(addr, ABI_NFT_MGR, signer);
        const price = await c.mintPrice();
        const totalCost = price * BigInt(amount);
        const tx = await c.mintPublic(amount, { value: totalCost });
        await tx.wait();
        alert("Mint realizado com sucesso!");
        refreshManagerData(addr);
    } catch(e) { alert("Erro no Mint: " + (e.reason || e.message)); }
}

window.setNFTPhase = async function(phaseId) {
    const addr = document.getElementById('mgrAddress').value;
    try {
        const c = new ethers.Contract(addr, ABI_NFT_MGR, signer);
        await (await c.setPhase(phaseId)).wait();
        alert("Fase Atualizada!");
    } catch(e) { alert("Erro ao mudar fase: " + e.message); }
}

window.withdrawNFTFunds = async function() {
    const addr = document.getElementById('mgrAddress').value;
    try {
        const c = new ethers.Contract(addr, ABI_NFT_MGR, signer);
        await (await c.withdraw()).wait();
        alert("Saque realizado com sucesso!");
        refreshManagerData(addr);
    } catch(e) { alert("Erro saque: " + e.message); }
}

// 4. SMART MULTISENDER LOGIC
window.validateMultiToken = async function() {
    const addr = document.getElementById('multiTokenAddr').value;
    const info = document.getElementById('tokenCheckInfo');
    if(!ethers.isAddress(addr)) { info.style.display='none'; return; }
    
    try {
        const c = new ethers.Contract(addr, ABIS.erc20, window.provider);
        const sym = await c.symbol();
        const dec = await c.decimals();
        document.getElementById('validTokenSym').innerText = sym;
        document.getElementById('validTokenDec').innerText = dec;
        info.style.display = 'block';
        window.multiData.token = addr;
        window.multiData.decimals = parseInt(dec);
        processMultiCSV(); // Re-calcula se já tiver CSV
    } catch(e) { info.style.display='none'; alert("Endereço não é um token ERC20 válido."); }
}

window.loadExampleCSV = function() {
    document.getElementById('csvInput').value = `0x742d35Cc6634C0532925a3b844Bc454e4438f44e, 100\n0x8894e0a0c962CB723c1976a4421c95949bE2D4E3, 50.5`;
    processMultiCSV();
}

window.processMultiCSV = function() {
    if(!window.multiData.token) return; // Espera token ser validado
    
    const raw = document.getElementById('csvInput').value;
    const lines = raw.split(/\r?\n/);
    let validCount = 0;
    let invalidCount = 0;
    let total = 0n;
    window.multiData.validRecipients = [];
    
    for(const line of lines) {
        if(!line.trim()) continue;
        const parts = line.split(/[;,\t]+/); // Aceita virgula, ponto-virgula ou tab
        if(parts.length >= 2) {
            const addr = parts[0].trim();
            const amtStr = parts[1].trim();
            
            if(ethers.isAddress(addr) && !isNaN(amtStr)) {
                try {
                    const wei = ethers.parseUnits(amtStr, window.multiData.decimals);
                    window.multiData.validRecipients.push({ address: addr, amount: wei });
                    total += wei;
                    validCount++;
                } catch(e) { invalidCount++; }
            } else { invalidCount++; }
        } else { invalidCount++; }
    }
    
    // Atualiza UI
    window.multiData.totalAmount = total;
    document.getElementById('totalWallets').innerText = validCount;
    document.getElementById('totalTokens').innerText = ethers.formatUnits(total, window.multiData.decimals);
    document.getElementById('validRows').innerText = `Válidos: ${validCount}`;
    document.getElementById('invalidRows').innerText = `Inválidos: ${invalidCount}`;
    
    // Habilita Botão 1 se tiver dados validos
    document.getElementById('btnMultiApprove').disabled = validCount === 0;
}

window.approveMultisend = async function() {
    await ensureNetwork('arc');
    if(!window.multiData.token || window.multiData.totalAmount === 0n) return;
    
    const btn = document.getElementById('btnMultiApprove');
    btn.innerText = "Aprovando...";
    btn.disabled = true;
    
    try {
        const c = new ethers.Contract(window.multiData.token, ABIS.erc20, signer);
        // Aprova o contrato Multisender para gastar o total
        const tx = await c.approve(CONTRACTS.multi, window.multiData.totalAmount);
        logMulti(`Aguardando aprovação Tx: ${tx.hash.slice(0,10)}...`);
        await tx.wait();
        
        logMulti("Aprovação confirmada! Pronto para envio.");
        btn.innerText = "Aprovado ✓";
        document.getElementById('btnMultiSend').disabled = false;
        
    } catch(e) { 
        logMulti("Erro na aprovação: " + e.message);
        btn.innerText = "1. Aprovar Tokens";
        btn.disabled = false;
    }
}

window.executeMultisend = async function() {
    await ensureNetwork('arc');
    const btn = document.getElementById('btnMultiSend');
    btn.innerText = "Enviando...";
    btn.disabled = true;
    
    try {
        const recipients = window.multiData.validRecipients.map(x => x.address);
        const amounts = window.multiData.validRecipients.map(x => x.amount);
        
        const c = new ethers.Contract(CONTRACTS.multi, ABIS.multi, signer);
        const tx = await c.multisendToken(window.multiData.token, recipients, amounts);
        
        logMulti(`Disparo iniciado! Tx: ${tx.hash}`);
        await tx.wait();
        
        showSuccessModal("Airdrop Concluído!", `Enviado para ${recipients.length} carteiras com sucesso.`);
        await incrementStat('multisends_count', recipients.length * 10);
        
        btn.innerText = "Sucesso!";
    } catch(e) {
        logMulti("Erro no envio: " + e.message);
        btn.innerText = "2. Disparar Airdrop";
        btn.disabled = false;
    }
}

function logMulti(msg) {
    const box = document.getElementById('multiLog');
    box.style.display = 'block';
    box.innerHTML += `<div>[${new Date().toLocaleTimeString()}] ${msg}</div>`;
    box.scrollTop = box.scrollHeight;
}

// UTILS E HELPERS
window.incrementStat = async function(col, pts) { if(window.supabaseClient) { const {data:u}=await supabaseClient.from('users').select('*').eq('wallet_address', userAddress).single(); const up={points:(u.points||0)+pts}; if(col!=='points') up[col]=(u[col]||0)+1; await supabaseClient.from('users').update(up).eq('wallet_address', userAddress); } }
window.showSuccessModal = function(t,m,a) { document.getElementById("modalTitle").innerText=t; document.getElementById("modalMsg").innerText=m; if(a) { document.getElementById("tokenCreatedInfo").style.display='block'; document.getElementById("newContractAddr").innerText=a; } document.getElementById("successModal").style.display='flex'; if(window.confetti) window.confetti(); }
window.approveUSDC = async function() { await ensureNetwork('sepolia'); try { const c = new ethers.Contract(CCTP_CONFIG.sepolia.usdc, ABIS.erc20, signer); await (await c.approve(CCTP_CONFIG.sepolia.tokenMessenger, ethers.parseUnits(document.getElementById('bridgeAmount').value, 6))).wait(); alert("Aprovado!"); } catch(e) { alert("Erro"); } }
window.burnUSDC = async function() { await ensureNetwork('sepolia'); try { const c = new ethers.Contract(CCTP_CONFIG.sepolia.tokenMessenger, ABIS.tokenMessenger, signer); await (await c.depositForBurn(ethers.parseUnits(document.getElementById('bridgeAmount').value, 6), CCTP_CONFIG.arc.domainId, ethers.zeroPadValue(userAddress, 32), CCTP_CONFIG.sepolia.usdc)).wait(); alert("Enviado! Aguarde Circle."); } catch(e) { alert("Erro Burn"); } }
window.mintUSDC = async function() { await ensureNetwork('arc'); try { const c = new ethers.Contract(CCTP_CONFIG.arc.messageTransmitter, ABIS.messageTransmitter, signer); await (await c.receiveMessage(document.getElementById('cctpMessageBytes').value, document.getElementById('cctpAttestation').value)).wait(); alert("Recebido!"); } catch(e) { alert("Erro Mint"); } }
window.lockTokens = async function() { await ensureNetwork('arc'); const token = document.getElementById("lockTokenAddr").value; const amount = document.getElementById("lockAmount").value; const date = document.getElementById("lockDate").value; try { const wei = ethers.parseUnits(amount, 18); const time = Math.floor(new Date(date).getTime() / 1000); const c = new ethers.Contract(CONTRACTS.lock, ABIS.lock, signer); await (await c.lockTokens(token, wei, time)).wait(); await incrementStat('locks_created', 50); showSuccessModal("Liquidez Trancada!", "Tokens Seguros."); } catch(e) { alert("Erro Lock"); } }
window.createVesting = async function() { await ensureNetwork('arc'); const token = document.getElementById("vestTokenAddr").value; const bene = document.getElementById("vestBeneficiary").value; const amt = document.getElementById("vestAmount").value; const dur = document.getElementById("vestDuration").value; try { const wei = ethers.parseUnits(amount, 18); const sec = parseInt(dur) * 60; const c = new ethers.Contract(CONTRACTS.vest, ABIS.vest, signer); await (await c.createVestingSchedule(token, bene, Math.floor(Date.now()/1000), 0, sec, wei, true)).wait(); await incrementStat('vestings_created', 75); showSuccessModal("Vesting Criado!", "Pagamento Agendado."); } catch(e) { alert("Erro Vesting"); } }
