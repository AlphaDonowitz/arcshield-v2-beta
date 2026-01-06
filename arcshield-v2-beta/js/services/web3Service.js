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
            bus.emit('notification:error', "Falha ao conectar carteira: " + error.message);
        }
    }

    async disconnect() {
        this.provider = null;
        this.signer = null;
        this.userAddress = null;
        this.isConnected = false;
        localStorage.removeItem('arcShield_connected');
        
        bus.emit('wallet:disconnected');
        window.location.reload(); 
    }

    async switchNetwork(networkKey) {
        const target = NETWORKS[networkKey];
        if (!target) return;

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: target.chainId }],
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: target.chainId,
                            chainName: target.name,
                            rpcUrls: [target.rpc],
                            blockExplorerUrls: [target.explorer],
                            nativeCurrency: target.currency
                        }],
                    });
                } catch (addError) {
                    throw new Error("Não foi possível adicionar a rede.");
                }
            } else {
                throw switchError;
            }
        }
        if(this.provider) {
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

        if (!address || !abi) throw new Error("Endereço ou ABI inválidos para contrato.");

        return new ethers.Contract(address, abi, this.signer);
    }
    
    // Helper para pegar configs da rede atual (ex: URL Explorer)
    getNetworkConfig() {
        if(this.chainId === NETWORKS.ARC.chainId) return NETWORKS.ARC;
        if(this.chainId === NETWORKS.SEPOLIA.chainId) return NETWORKS.SEPOLIA;
        return NETWORKS.ARC; // fallback
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