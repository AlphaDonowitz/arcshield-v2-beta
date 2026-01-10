import { web3Service } from '../services/web3Service.js';
import { bus } from '../core/eventBus.js';
import { ERC20_ABI, ERC20_BYTECODE } from '../config/tokenData.js';

export function initTokenFactory() {
    const container = document.getElementById('token-launcher');
    if (!container) return;
    container.innerHTML = `
        <div class="card">
            <h3>Token Factory</h3>
            <p>Crie tokens ERC20 padrão OpenZeppelin na Arc Testnet.</p>
            <input type="text" id="tkName" placeholder="Nome do Token">
            <input type="text" id="tkSymbol" placeholder="Símbolo">
            <input type="number" id="tkSupply" placeholder="Supply Inicial">
            <div id="deployStatus" style="display:none; padding: 15px; background: #000; margin-bottom: 10px; border-radius: 8px;">
                <p id="deployMsg">Aguardando...</p>
                <a id="explorerLink" target="_blank" style="display:none; color: var(--primary-blue);">Ver no Explorer</a>
            </div>
            <button id="btnCreateToken" class="btn-primary">Criar Token (Deploy)</button>
        </div>
    `;
    document.getElementById('btnCreateToken').addEventListener('click', deployToken);
}

async function deployToken() {
    const name = document.getElementById('tkName').value;
    const symbol = document.getElementById('tkSymbol').value;
    const supply = document.getElementById('tkSupply').value;
    if (!name || !symbol || !supply) return bus.emit('notification:error', "Campos vazios.");
    if (!web3Service.isConnected) return bus.emit('notification:error', "Conecte a carteira.");

    const btn = document.getElementById('btnCreateToken');
    const msg = document.getElementById('deployMsg');
    try {
        btn.disabled = true;
        btn.innerText = "Confirmando...";
        document.getElementById('deployStatus').style.display = 'block';
        
        const factory = new window.ethers.ContractFactory(ERC20_ABI, ERC20_BYTECODE, web3Service.signer);
        const amountWei = window.ethers.parseUnits(supply.toString(), 18);
        
        msg.innerText = "Assine a transação na MetaMask...";
        const contract = await factory.deploy(name, symbol, amountWei);
        msg.innerText = "Aguardando confirmação da rede...";
        await contract.waitForDeployment();
        
        const address = await contract.getAddress();
        msg.innerText = `Sucesso! Endereço: ${address}`;
        
        const link = document.getElementById('explorerLink');
        link.href = `${web3Service.getNetworkConfig().explorer}/address/${address}`;
        link.style.display = 'block';

        import('../services/socialService.js').then(m => {
            m.socialService.registerCreation({ name, symbol, address, supply, type: 'ERC20' });
        });
        bus.emit('notification:success', "Token criado!");
    } catch (e) {
        msg.innerText = "Erro: " + (e.reason || e.message);
        btn.disabled = false;
        btn.innerText = "Tentar Novamente";
    }
}
