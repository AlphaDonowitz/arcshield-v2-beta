window.addEventListener('load', async function() {
    if (localStorage.getItem('userDisconnected') === 'true') return;
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                document.getElementById('landingPage').style.display = 'none';
                document.getElementById('dashboardLayout').style.display = 'flex';
                window.provider = new ethers.BrowserProvider(window.ethereum);
                window.signer = await window.provider.getSigner();
                window.userAddress = await window.signer.getAddress();
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
    btn.innerText = "🟢 " + window.userAddress.slice(0,6) + "...";
    btn.classList.add('btn-disconnect');
    btn.onclick = disconnectWallet;
    if(window.loadUserProfile) window.loadUserProfile(window.userAddress);
    const br = document.getElementById('bridgeRecipient'); if(br) br.value = window.userAddress;
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

// CREATE TOKEN
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
        let addr = null; try { if(receipt.logs[0]) addr = receipt.logs[0].address; } catch(e){}
        
        if(window.supabaseClient && addr) {
            await window.supabaseClient.from('created_tokens').insert([{ name, symbol, address: addr, owner_wallet: userAddress, initial_supply: supply, logo_url: window.uploadedLogoData }]);
        }
        await incrementStat('tokens_created', 100);
        let card = await generateSocialCard(name, symbol, supply, window.uploadedLogoData);
        showSuccessModal(`Token ${symbol} Criado!`, "Sucesso!", null, tx.hash, null, card, addr);
    } catch(e) { console.error(e); alert("Erro: " + e.message); } finally { setLoading('btnCreate', false); }
}

// MULTISENDER
window.sendBatch = async function() {
    await ensureNetwork('arc');
    const token = document.getElementById("multiTokenAddr").value;
    const raw = document.getElementById("csvInput").value;
    if(!token || !raw) return alert("Preencha campos");
    setLoading('btnMulti', true);
    try {
        const lines = raw.split(/\r?\n/); let rec=[], amt=[];
        for(let l of lines) {
            let p = l.split(/[;,\t\s]+/); p=p.filter(x=>x.trim()!=="");
            if(p.length>=2 && ethers.isAddress(p[0])) { rec.push(p[0]); try { amt.push(ethers.parseUnits(p[1], 18)); } catch(e){} }
        }
        if(!rec.length) throw new Error("CSV Vazio");
        const c = new ethers.Contract(CONTRACTS.multi, ABIS.multi, signer);
        const tx = await c.multisendToken(token, rec, amt);
        await tx.wait();
        await incrementStat('multisends_count', 50);
        showSuccessModal("Envio em Massa!", `${rec.length} endereços receberam.`, null, tx.hash);
    } catch(e) { alert("Erro Multisend: " + e.message); } finally { setLoading('btnMulti', false); }
}

// LOCKER
window.lockTokens = async function() {
    await ensureNetwork('arc');
    const token = document.getElementById("lockTokenAddr").value;
    const amount = document.getElementById("lockAmount").value;
    const date = document.getElementById("lockDate").value;
    if(!token || !amount || !date) return alert("Preencha tudo");
    setLoading('btnLock', true);
    try {
        const wei = ethers.parseUnits(amount, 18);
        const time = Math.floor(new Date(date).getTime() / 1000);
        const c = new ethers.Contract(CONTRACTS.lock, ABIS.lock, signer);
        const tx = await c.lockTokens(token, wei, time);
        await tx.wait();
        await incrementStat('locks_created', 50);
        showSuccessModal("Liquidez Trancada!", "Tokens seguros.", null, tx.hash);
    } catch(e) { alert("Erro Lock"); } finally { setLoading('btnLock', false); }
}

// VESTING
window.createVesting = async function() {
    await ensureNetwork('arc');
    const token = document.getElementById("vestTokenAddr").value;
    const bene = document.getElementById("vestBeneficiary").value;
    const amt = document.getElementById("vestAmount").value;
    const dur = document.getElementById("vestDuration").value;
    if(!token || !bene || !amt || !dur) return alert("Preencha tudo");
    setLoading('btnVest', true);
    try {
        const wei = ethers.parseUnits(amt, 18);
        const sec = parseInt(dur) * 60;
        const c = new ethers.Contract(CONTRACTS.vest, ABIS.vest, signer);
        const tx = await c.createVestingSchedule(token, bene, Math.floor(Date.now()/1000), 0, sec, wei, true);
        await tx.wait();
        await incrementStat('vestings_created', 75);
        showSuccessModal("Vesting Criado!", "Pagamento programado.", null, tx.hash);
    } catch(e) { alert("Erro Vesting"); } finally { setLoading('btnVest', false); }
}

window.loadDashboardData = async function() {
    const div = document.getElementById("dashboardContent"); div.innerHTML = "Buscando...";
    try {
        const c = new ethers.Contract(CONTRACTS.vest, ABIS.vest, signer);
        const count = await c.getUserScheduleCount(userAddress);
        let html = "";
        for(let i=0; i<count; i++) {
            const id = await c.getUserScheduleIdAtIndex(userAddress, i);
            const s = await c.schedules(id);
            html += `<div style="display:flex;justify-content:space-between;margin-bottom:5px;border-bottom:1px solid #333"><span>#${id}</span> <span>${ethers.formatEther(s.amountTotal)} Tokens</span> <button class="mini-btn" onclick="claimVesting(${id})">Sacar</button></div>`;
        }
        div.innerHTML = html || "Sem vestings.";
    } catch(e) { div.innerHTML = "Erro ao buscar."; }
}

window.claimVesting = async function(id) {
    try { const c = new ethers.Contract(CONTRACTS.vest, ABIS.vest, signer); await (await c.release(id)).wait(); alert("Sacado!"); loadDashboardData(); } catch(e){ alert("Erro saque"); }
}

// BRIDGE
window.approveUSDC = async function() { await ensureNetwork('sepolia'); setLoading('btnApproveCCTP', true); try { const c = new ethers.Contract(CCTP_CONFIG.sepolia.usdc, ABIS.erc20, signer); await (await c.approve(CCTP_CONFIG.sepolia.tokenMessenger, ethers.parseUnits(document.getElementById('bridgeAmount').value, 6))).wait(); alert("Aprovado!"); document.getElementById('btnBurnCCTP').disabled=false; } catch(e) { alert("Erro"); } finally { setLoading('btnApproveCCTP', false); } }
window.burnUSDC = async function() { await ensureNetwork('sepolia'); setLoading('btnBurnCCTP', true); try { const c = new ethers.Contract(CCTP_CONFIG.sepolia.tokenMessenger, ABIS.tokenMessenger, signer); const tx = await c.depositForBurn(ethers.parseUnits(document.getElementById('bridgeAmount').value, 6), CCTP_CONFIG.arc.domainId, ethers.zeroPadValue(userAddress, 32), CCTP_CONFIG.sepolia.usdc); await tx.wait(); showSuccessModal("Bridge Iniciada!", "Aguarde Circle.", null, tx.hash); } catch(e) { alert("Erro Burn"); } finally { setLoading('btnBurnCCTP', false); } }
window.mintUSDC = async function() { await ensureNetwork('arc'); setLoading('btnClaimCCTP', true); try { const c = new ethers.Contract(CCTP_CONFIG.arc.messageTransmitter, ABIS.messageTransmitter, signer); const tx = await c.receiveMessage(document.getElementById('cctpMessageBytes').value, document.getElementById('cctpAttestation').value); await tx.wait(); showSuccessModal("Sucesso!", "USDC Recebido.", null, tx.hash); } catch(e) { alert("Erro Mint"); } finally { setLoading('btnClaimCCTP', false); } }

// UTILS
window.approveToken = async function(mod) {
    const map = { multi: [CONTRACTS.multi, 'multiTokenAddr'], lock: [CONTRACTS.lock, 'lockTokenAddr'], vest: [CONTRACTS.vest, 'vestTokenAddr'] };
    const t = document.getElementById(map[mod][1]).value;
    if(!t) return alert("Token?");
    try { const c = new ethers.Contract(t, ABIS.erc20, signer); await (await c.approve(map[mod][0], ethers.MaxUint256)).wait(); alert("Aprovado!"); } catch(e){ alert("Erro Approve"); }
}
window.setLoading = function(id, status) { const b=document.getElementById(id); if(!b) return; if(status) { b.innerText="⏳"; b.disabled=true; } else { b.innerText="Enviar"; b.disabled=false; } }
window.incrementStat = async function(col, pts) { if(window.supabaseClient) { const {data:u}=await supabaseClient.from('users').select('*').eq('wallet_address', userAddress).single(); const up={points:(u.points||0)+pts}; up[col]=(u[col]||0)+1; await supabaseClient.from('users').update(up).eq('wallet_address', userAddress); } }
window.showSuccessModal = function(t,m,tw,h,i,c,a) { document.getElementById("modalTitle").innerText=t; document.getElementById("modalMsg").innerText=m; if(a) { document.getElementById("tokenCreatedInfo").style.display='block'; document.getElementById("newContractAddr").innerText=a; } document.getElementById("successModal").style.display='flex'; if(window.confetti) window.confetti(); }
window.generateSocialCard = async function(n,s,sp,l) { document.getElementById('cardTokenSymbol').innerText="$"+s; document.getElementById('cardTokenName').innerText=n; document.getElementById('cardTokenSupply').innerText=sp; document.getElementById('cardTokenLogo').src=l||""; try{const c=await html2canvas(document.getElementById("socialCardTemplate"),{scale:2});return c.toDataURL("image/png");}catch(e){return null;} }
