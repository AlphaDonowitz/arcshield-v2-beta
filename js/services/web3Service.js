import { NETWORKS, CONTRACTS } from '../config.js';
import { ABIS } from '../config/abis.js'; 
import { bus } from '../core/eventBus.js';

class Web3Service {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.userAddress = null;
        this.chainId = null;
        this.isConnected = false;

        // Binda o contexto para não perder o 'this' nos listeners
        this._handleAccountsChanged = this._handleAccountsChanged.bind(this);
        this._handleChainChanged = this._handleChainChanged.bind(this);
    }

    // --- Core Connection ---

    async init() {
        if (window.ethereum) {
            // Escuta mudanças no Metamask
            window.ethereum.on('accountsChanged', this._handleAccountsChanged);
            window.ethereum.on('chainChanged', this._handleChainChanged);
            
            // Verifica se já estava conectado (Persistência)
            const wasConnected = localStorage.getItem('arcShield_connected') === 'true';
            if (wasConnected) {
                // Tenta reconectar silenciosamente
                await this.connect();
            }
        } else {
            console.warn("Web3: Metamask not detected.");
        }
    }

    async connect() {
        if (!window.ethereum) {
            bus.emit('notification:error', "Metamask não encontrada! Por favor, instale.");
            return;
        }

        try {
            // 1. Solicita acesso às contas
            await window.ethereum.request({ method: "eth_requestAccounts" });
            
            // 2. Configura Provider e Signer (Ethers v6)
            this.provider = new ethers.BrowserProvider(window.ethereum);
            this.signer = await this.provider.getSigner();
            this.userAddress = await this.signer.getAddress();
            
            const net = await this.provider.getNetwork();
            this.chainId = "0x" + net.chainId.toString(16);

            // 3. Valida Rede Inicial (Força Arc Testnet por padrão)
            // Se não estiver na Arc, tenta trocar/adicionar
            if (this.chainId !== NETWORKS.ARC.chainId) {
                console.log("Web3: Rede incorreta detectada. Tentando trocar para Arc Testnet...");
                await this.switchNetwork('ARC');
            }

            this.isConnected = true;
            localStorage.setItem('arcShield_connected', 'true');

            // 4. Emite evento de sucesso para todo o app
            bus.emit('wallet:connected', {
                address: this.userAddress,
                chainId: this.chainId
            });

            console.log(`Web3: Connected to ${this.userAddress}`);

        } catch (error) {
            console.error("Web3 Connection Error:", error);
            // Mensagem amigável para o usuário
            bus.emit('notification:error', "Falha ao conectar: " + (error.message || "Erro desconhecido"));
            this.disconnect(); // Limpa estado se falhar
        }
    }

    async disconnect() {
        this.provider = null;
        this.signer = null;
        this.userAddress = null;
        this.isConnected = false;
        localStorage.removeItem('arcShield_connected');
        
        bus.emit('wallet:disconnected');
        // Não recarregamos a página forçadamente no disconnect para melhor UX,
        // mas limpamos a UI via eventos.
        console.log("Web3: Disconnected");
    }

    // --- Network Management (CORRIGIDO) ---

    async switchNetwork(networkKey) {
        const target = NETWORKS[networkKey];
        if (!target) {
            console.error(`Rede ${networkKey} não configurada.`);
            return;
        }

        try {
            // Tentativa 1: Trocar de rede
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: target.chainId }],
            });
        } catch (switchError) {
            // Se der QUALQUER erro (seja 4902 ou outro genérico de "chain not found")
            // Nós tentamos adicionar a rede imediatamente.
            console.warn("Web3: Switch falhou, tentando adicionar a rede...", switchError);

            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: target.chainId,
                        chainName: target.name,
                        rpcUrls: [target.rpc],
                        // O Metamask exige que blockExplorerUrls seja um array, ou null
                        blockExplorerUrls: target.explorer ? [target.explorer] : [],
                        nativeCurrency: target.currency
                    }],
                });
                
                // Se adicionar funcionar, o Metamask geralmente troca automaticamente.
                // Mas vamos aguardar um pouco para garantir.
            } catch (addError) {
                // Se falhar ao adicionar, aí sim é um erro crítico
                console.error("Web3: Falha crítica ao adicionar rede.", addError);
                throw new Error(`Não foi possível adicionar a rede ${target.name}. Verifique seu Metamask.`);
            }
        }
        
        // Atualiza estado interno após troca
        if(this.provider) {
            // Pequeno delay para garantir que o provider atualizou
            await new Promise(r => setTimeout(r, 500));
            const net = await this.provider.getNetwork();
            this.chainId = "0x" + net.chainId.toString(16);
        }
    }

    // --- Contract Helpers ---

    getContract(typeOrAddress, customAbi = null) {
        if (!this.signer) throw new Error("Carteira não conectada.");

        let address;
        let abi;

        // Se for um nome conhecido em config (ex: 'tokenFactory')
        if (CONTRACTS[typeOrAddress]) {
            address = CONTRACTS[typeOrAddress];
            abi = ABIS[typeOrAddress];
        } else {
            // Se for um endereço arbitrário
            address = typeOrAddress;
            abi = customAbi || ABIS.erc20; // Default para ERC20 se não passar ABI
        }

        if (!address || !abi) throw new Error("Endereço ou ABI inválidos para contrato.");

        return new ethers.Contract(address, abi, this.signer);
    }
    
    getNetworkConfig() {
        if(this.chainId === NETWORKS.ARC.chainId) return NETWORKS.ARC;
        if(this.chainId === NETWORKS.SEPOLIA.chainId) return NETWORKS.SEPOLIA;
        return NETWORKS.ARC; // fallback
    }

    // --- Listeners Internos ---
    
    _handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
            this.disconnect();
        } else if (accounts[0] !== this.userAddress) {
            // Se trocou de conta, reconecta para atualizar signer
            this.userAddress = accounts[0];
            // Atualiza UI sem recarregar tudo
            this.connect(); 
            bus.emit('notification:info', "Conta alterada.");
        }
    }

    _handleChainChanged(_chainId) {
        // Metamask recomenda reload ao trocar de chain para evitar inconsistência
        window.location.reload(); 
    }
}

// Exporta uma instância única (Singleton)
export const web3Service = new Web3Service();
