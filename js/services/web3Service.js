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

        this._handleAccountsChanged = this._handleAccountsChanged.bind(this);
        this._handleChainChanged = this._handleChainChanged.bind(this);
    }

    // --- Core Connection ---

    async init() {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', this._handleAccountsChanged);
            window.ethereum.on('chainChanged', this._handleChainChanged);
            
            const wasConnected = localStorage.getItem('arcShield_connected') === 'true';
            if (wasConnected) {
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
            await window.ethereum.request({ method: "eth_requestAccounts" });
            
            this.provider = new ethers.BrowserProvider(window.ethereum);
            this.signer = await this.provider.getSigner();
            this.userAddress = await this.signer.getAddress();
            
            const net = await this.provider.getNetwork();
            this.chainId = "0x" + net.chainId.toString(16);

            if (this.chainId !== NETWORKS.ARC.chainId) {
                console.log("Web3: Rede incorreta. Tentando trocar...");
                await this.switchNetwork('ARC');
            }

            this.isConnected = true;
            localStorage.setItem('arcShield_connected', 'true');

            bus.emit('wallet:connected', {
                address: this.userAddress,
                chainId: this.chainId
            });

            console.log(`Web3: Connected to ${this.userAddress}`);

        } catch (error) {
            console.error("Web3 Connection Error:", error);
            bus.emit('notification:error', "Falha ao conectar: " + (error.message || "Erro desconhecido"));
            this.disconnect(); 
        }
    }

    async disconnect() {
        // LOGOUT REAL: Tenta revogar permissões no Metamask
        try {
            if (window.ethereum) {
                await window.ethereum.request({
                    method: "wallet_revokePermissions",
                    params: [{ eth_accounts: {} }]
                });
            }
        } catch (e) {
            console.warn("Web3: Revogação de permissão não suportada ou cancelada", e);
        }

        this.provider = null;
        this.signer = null;
        this.userAddress = null;
        this.isConnected = false;
        localStorage.removeItem('arcShield_connected');
        
        bus.emit('wallet:disconnected');
        
        // Pequeno delay para garantir limpeza de estado antes do reload
        setTimeout(() => {
            window.location.reload(); 
        }, 500);
    }

    // --- Network Management ---

    async switchNetwork(networkKey) {
        const target = NETWORKS[networkKey];
        if (!target) {
            console.error(`Rede ${networkKey} não configurada.`);
            return;
        }

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: target.chainId }],
            });
        } catch (switchError) {
            console.warn("Web3: Switch falhou, tentando adicionar rede...", switchError);
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: target.chainId,
                        chainName: target.name,
                        rpcUrls: [target.rpc],
                        blockExplorerUrls: target.explorer ? [target.explorer] : [],
                        nativeCurrency: target.currency
                    }],
                });
            } catch (addError) {
                console.error("Web3: Falha crítica ao adicionar rede.", addError);
                throw new Error(`Não foi possível adicionar a rede ${target.name}.`);
            }
        }
        
        if(this.provider) {
            await new Promise(r => setTimeout(r, 500));
            const net = await this.provider.getNetwork();
            this.chainId = "0x" + net.chainId.toString(16);
        }
    }

    getContract(typeOrAddress, customAbi = null) {
        if (!this.signer) throw new Error("Carteira não conectada.");

        let address;
        let abi;

        if (CONTRACTS[typeOrAddress]) {
            address = CONTRACTS[typeOrAddress];
            abi = ABIS[typeOrAddress];
        } else {
            address = typeOrAddress;
            abi = customAbi || ABIS.erc20; 
        }

        if (!address || !abi) throw new Error("Endereço ou ABI inválidos.");

        return new ethers.Contract(address, abi, this.signer);
    }
    
    getNetworkConfig() {
        if(this.chainId === NETWORKS.ARC.chainId) return NETWORKS.ARC;
        if(this.chainId === NETWORKS.SEPOLIA.chainId) return NETWORKS.SEPOLIA;
        return NETWORKS.ARC; 
    }

    _handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
            this.disconnect();
        } else if (accounts[0] !== this.userAddress) {
            this.userAddress = accounts[0];
            this.connect(); 
            bus.emit('notification:info', "Conta alterada.");
        }
    }

    _handleChainChanged(_chainId) {
        window.location.reload(); 
    }
}

export const web3Service = new Web3Service();
