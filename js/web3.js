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
    if(window.renderIcons) window.renderIcons();
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

// 1. LAUNCHPAD
window.createToken = async function() {
    await ensureNetwork('arc');
    const name = document.getElementById("tokenName").value;
    const symbol = document.getElementById("tokenSymbol").value;
    const supply = document.getElementById("tokenSupply").value;
    if(!name || !symbol || !supply) return alert("Preencha tudo!");
    
    try {
        const c = new ethers.Contract(CONTRACTS.factory, ABIS.factory, signer);
        const tx = await c.createToken(name, symbol, supply);
        const receipt = await tx.wait();
        let addr = null; try { if(receipt.logs[0]) addr = receipt.logs[0].address; } catch(e){}
        
        if(window.supabaseClient && addr) {
            await window.supabaseClient.from('created_tokens').insert([{ name, symbol, address: addr, owner_wallet: userAddress, initial_supply: supply, logo_url: window.uploadedLogoData, bonus_claimed: false }]);
        }
        await incrementStat('tokens_created', 100);
        showSuccessModal(`Token ${symbol} Criado!`, `Contrato: ${addr}`, addr);
    } catch(e) { alert("Erro: " + e.message); }
}

// 2. MULTISENDER (Speedrun)
window.sendBatch = async function() {
    await ensureNetwork('arc');
    const tokenAddr = document.getElementById("multiTokenAddr").value;
    const raw = document.getElementById("csvInput").value;
    
    try {
        const lines = raw.split(/\r?\n/); let rec=[], amt=[];
        for(let l of lines) {
            let p = l.split(/[;,\t\s]+/); p=p.filter(x=>x.trim()!=="");
            if(p.length>=2 && ethers.isAddress(p[0])) { rec.push(p[0]); try { amt.push(ethers.parseUnits(p[1], 18)); } catch(e){} }
        }
        const c = new ethers.Contract(CONTRACTS.multi, ABIS.multi, signer);
        const tx = await c.multisendToken(tokenAddr, rec, amt);
        await tx.wait();
        await incrementStat('multisends_count', 50);

        // Speedrun Bonus
        if(window.supabaseClient) {
            const { data: token } = await window.supabaseClient.from('created_tokens').select('*').eq('address', tokenAddr).single();
            if(token && !token.bonus_claimed && token.owner_wallet.toLowerCase() === userAddress.toLowerCase()) {
                 const diff = (Date.now() - new Date(token.created_at).getTime()) / 36e5;
                 if(diff <= 2) {
                     await incrementStat('points', 500);
                     await window.supabaseClient.from('created_tokens').update({ bonus_claimed: true }).eq('id', token.id);
                     alert("🚀 SPEEDRUN BONUS: +500 XP!");
                 }
            }
        }
        showSuccessModal("Multisend Enviado!", `${rec.length} endereços.`);
    } catch(e) { alert("Erro: " + e.message); }
}

// 3. LOCKER
window.lockTokens = async function() {
    await ensureNetwork('arc');
    const token = document.getElementById("lockTokenAddr").value;
    const amount = document.getElementById("lockAmount").value;
    const date = document.getElementById("lockDate").value;
    
    try {
        const wei = ethers.parseUnits(amount, 18);
        const time = Math.floor(new Date(date).getTime() / 1000);
        const c = new ethers.Contract(CONTRACTS.lock, ABIS.lock, signer);
        await (await c.lockTokens(token, wei, time)).wait();
        await incrementStat('locks_created', 50);
        showSuccessModal("Liquidez Trancada!", "Tokens Seguros.");
    } catch(e) { alert("Erro Lock"); }
}

// 4. VESTING
window.createVesting = async function() {
    await ensureNetwork('arc');
    const token = document.getElementById("vestTokenAddr").value;
    const bene = document.getElementById("vestBeneficiary").value;
    const amt = document.getElementById("vestAmount").value;
    const dur = document.getElementById("vestDuration").value;
    
    try {
        const wei = ethers.parseUnits(amt, 18);
        const sec = parseInt(dur) * 60;
        const c = new ethers.Contract(CONTRACTS.vest, ABIS.vest, signer);
        await (await c.createVestingSchedule(token, bene, Math.floor(Date.now()/1000), 0, sec, wei, true)).wait();
        await incrementStat('vestings_created', 75);
        showSuccessModal("Vesting Criado!", "Pagamento Agendado.");
    } catch(e) { alert("Erro Vesting"); }
}

// UTILS
window.approveToken = async function(mod) {
    const map = { multi: [CONTRACTS.multi, 'multiTokenAddr'], lock: [CONTRACTS.lock, 'lockTokenAddr'], vest: [CONTRACTS.vest, 'vestTokenAddr'] };
    const t = document.getElementById(map[mod][1]).value;
    try { const c = new ethers.Contract(t, ABIS.erc20, signer); await (await c.approve(map[mod][0], ethers.MaxUint256)).wait(); alert("Aprovado!"); } catch(e){ alert("Erro Approve"); }
}
window.incrementStat = async function(col, pts) { if(window.supabaseClient) { const {data:u}=await supabaseClient.from('users').select('*').eq('wallet_address', userAddress).single(); const up={points:(u.points||0)+pts}; if(col!=='points') up[col]=(u[col]||0)+1; await supabaseClient.from('users').update(up).eq('wallet_address', userAddress); } }
window.showSuccessModal = function(t,m,a) { 
    document.getElementById("modalTitle").innerText=t; document.getElementById("modalMsg").innerText=m; 
    if(a) { document.getElementById("tokenCreatedInfo").style.display='block'; document.getElementById("newContractAddr").innerText=a; } 
    document.getElementById("successModal").style.display='flex'; if(window.confetti) window.confetti(); 
}
// Bridge functions are same as before (omitted for brevity but assumed present in logic)
window.approveUSDC = async function() { await ensureNetwork('sepolia'); try { const c = new ethers.Contract(CCTP_CONFIG.sepolia.usdc, ABIS.erc20, signer); await (await c.approve(CCTP_CONFIG.sepolia.tokenMessenger, ethers.parseUnits(document.getElementById('bridgeAmount').value, 6))).wait(); alert("Aprovado!"); } catch(e) { alert("Erro"); } }
window.burnUSDC = async function() { await ensureNetwork('sepolia'); try { const c = new ethers.Contract(CCTP_CONFIG.sepolia.tokenMessenger, ABIS.tokenMessenger, signer); await (await c.depositForBurn(ethers.parseUnits(document.getElementById('bridgeAmount').value, 6), CCTP_CONFIG.arc.domainId, ethers.zeroPadValue(userAddress, 32), CCTP_CONFIG.sepolia.usdc)).wait(); alert("Enviado! Aguarde Circle."); } catch(e) { alert("Erro Burn"); } }
window.mintUSDC = async function() { await ensureNetwork('arc'); try { const c = new ethers.Contract(CCTP_CONFIG.arc.messageTransmitter, ABIS.messageTransmitter, signer); await (await c.receiveMessage(document.getElementById('cctpMessageBytes').value, document.getElementById('cctpAttestation').value)).wait(); alert("Recebido!"); } catch(e) { alert("Erro Mint"); } }
