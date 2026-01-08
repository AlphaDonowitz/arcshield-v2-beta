// js/modules/tokenFactory.js

import { bus } from '../utils/eventBus.js'; // Caminho corrigido
import { tokenBytecode, tokenAbi } from '../config/tokenData.js';

export async function deployToken() {
    const btn = document.getElementById('btn-deploy-token');
    const statusMsg = document.getElementById('deploy-status');
    
    // Inputs
    const nameInput = document.getElementById('token-name');
    const symbolInput = document.getElementById('token-symbol');
    const supplyInput = document.getElementById('token-supply');

    const name = nameInput.value.trim();
    const symbol = symbolInput.value.trim();
    const supply = supplyInput.value.trim();

    // 1. Validação Básica
    if (!name || !symbol || !supply) {
        bus.emit('notification:error', "Preencha todos os campos (Nome, Símbolo, Supply).");
        return;
    }

    try {
        // 2. Estado de Carregamento Inicial
        btn.disabled = true;
        const originalBtnContent = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="pen-tool" class="spin"></i> Aguardando Assinatura...`;
        lucide.createIcons();
        statusMsg.innerHTML = `<span style="color:var(--text-gray)">Iniciando conexão com a carteira...</span>`;

        // 3. Configuração do Provider (Ethers v6)
        if (!window.ethereum) throw new Error("Carteira não detectada.");
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();

        // 4. Verificação de Saldo (Prevenção de Erros)
        const balance = await provider.getBalance(userAddress);
        if (balance <= 0n) {
            throw new Error("Saldo insuficiente para cobrir as taxas de gás (ETH/ARC).");
        }

        // 5. Preparação do Contrato
        statusMsg.innerHTML = `<span style="color:var(--primary-blue)">Aguardando confirmação na carteira...</span>`;
        const factory = new ethers.ContractFactory(tokenAbi, tokenBytecode, signer);

        // 6. Deploy (Disparo da Transação)
        // Nota: O supply deve ser passado como string ou BigInt para evitar overflow de números JS
        const contract = await factory.deploy(name, symbol, supply);
        
        // Atualiza UI para estado de "Minerando/Confirmando"
        btn.innerHTML = `<i data-lucide="loader" class="spin"></i> Implantando na Blockchain...`;
        lucide.createIcons();
        statusMsg.innerHTML = `<span style="color:var(--primary-blue)">Transação enviada! Aguardando confirmação de rede...</span>`;
        
        console.log("Transação enviada:", contract.deploymentTransaction().hash);

        // 7. Aguardar Confirmação (Ethers v6 syntax)
        await contract.waitForDeployment();
        const contractAddress = await contract.getAddress();

        console.log(`Token ${symbol} implantado em: ${contractAddress}`);

        // 8. Persistência no Supabase (Lógica v15)
        statusMsg.innerHTML = `<span style="color:var(--primary-blue)">Salvando registo na base de dados...</span>`;

        // Assume que a variável 'supabase' está disponível globalmente via CDN no index.html
        const { error: dbError } = await supabase
            .from('tokens_created')
            .insert([
                {
                    owner_address: userAddress,
                    contract_address: contractAddress,
                    name: name,
                    symbol: symbol,
                    initial_supply: supply,
                    created_at: new Date().toISOString()
                }
            ]);

        if (dbError) {
            console.error("Erro ao salvar no Supabase:", dbError);
            // Não lançamos throw aqui para não invalidar o deploy que já ocorreu na blockchain,
            // apenas avisamos o utilizador.
            bus.emit('notification:error', "Token criado, mas falha ao salvar no histórico.");
        }

        // 9. Sucesso Final
        statusMsg.innerHTML = `<span style="color:var(--success-green)">Sucesso! Token: ${contractAddress}</span>`;
        bus.emit('notification:success', `Token ${symbol} criado com sucesso!`);
        
        // Efeito de Confetti (se disponível globalmente)
        if (window.confetti) {
            window.confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }

        // Reset do Botão com atraso para leitura
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="rocket"></i> Criar Outro Token`;
            lucide.createIcons();
            
            // Limpar campos
            nameInput.value = '';
            symbolInput.value = '';
            supplyInput.value = '';
        }, 5000);

    } catch (error) {
        console.error("Deploy Error:", error);
        
        let errorText = error.message || "Falha desconhecida";
        
        // Tratamento detalhado de erros comuns
        if (error.code === 'ACTION_REJECTED') {
            errorText = "Transação rejeitada pelo utilizador.";
        } else if (error.toString().includes('insufficient funds')) {
            errorText = "Saldo insuficiente para o Gás.";
        } else if (error.toString().includes('invalid bytecode')) {
            errorText = "Erro interno: Bytecode inválido ou corrompido.";
        } else if (error.toString().includes('User denied')) {
            errorText = "Acesso à carteira negado.";
        }

        statusMsg.innerHTML = `<span style="color:var(--error-red)">Erro: ${errorText}</span>`;
        bus.emit('notification:error', `Falha no Deploy: ${errorText}`);
        
        // Restaura o botão imediatamente em caso de erro
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="refresh-cw"></i> Tentar Novamente`;
        lucide.createIcons();
    }
}
