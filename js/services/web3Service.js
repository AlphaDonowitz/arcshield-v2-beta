// js/services/web3Service.js

import { bus } from '../core/eventBus.js';

// Configurações Oficiais Arc Testnet
const ARC_CHAIN_ID_DECIMAL = 5042002;
const ARC_CHAIN_ID_HEX = '0x4cefa2'; // 5042002 to Hex
const ARC_RPC_URL = 'https://rpc.testnet.arc.network';
const ARC_EXPLORER = 'https://testnet.arcscan.app';
const ARC_CURRENCY = {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18
};

class Web3Service {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.userAddress = null;
        this.isConnected = false;
        this.chainId = null;
    }

    async init() {
        // AUDITORIA: Verifica se a lib global foi carregada no HTML
        if (!window.ethers) {
            console.error("CRITICAL: Ethers.js global não encontrado.");
            return;
        }

        if (window.ethereum) {
            this.provider = new window.ethers.BrowserProvider(window.ethereum);
            
            // Listeners de Rede
            window.ethereum.on('accountsChanged', (accounts) => this.handleAccountsChanged(accounts));
            window.ethereum.on('chainChanged', (chainId) => this.handleChainChanged(chainId));
            
            // Tenta reconectar sessão anterior
            try {
                const accounts = await this.provider.listAccounts();
                if (accounts.length > 0) {
                    await this.connectWallet();
                }
            } catch (e) { console.warn("Erro ao verificar contas:", e); }

            const btn = document.getElementById('btnConnect');
            if(btn) btn.addEventListener('click', () => this.connectWallet());
        }
    }

    async connectWallet() {
        if (!window.ethereum) return alert("Instale a Metamask!");
        
        try {
            const accounts = await this.provider.send("eth_requestAccounts", []);
            this.handleAccountsChanged(accounts);
        } catch (error) {
            console.error("Connection Error:", error);
            bus.emit('notification:error', "Conexão rejeitada.");
        }
    }

    async handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
            this.disconnect();
        } else {
            this.userAddress = accounts[0];
            this.signer = await this.provider.getSigner();
            this.isConnected = true;
            
            const network = await this.provider.getNetwork();
            this.chainId = Number(network.chainId);

            console.log("Wallet Connected:", this.userAddress, "Chain:", this.chainId);
            
            // Atualiza UI do botão
            const btn = document.getElementById('btnConnect');
            if(btn) {
                btn.innerHTML = `<i data-lucide="check-circle" style="color:var(--success-green)"></i> ${this.userAddress.slice(0,6)}...${this.userAddress.slice(-4)}`;
                btn.classList.add('connected');
                btn.style.borderColor = 'var(--success-green)';
                btn.style.background = 'rgba(34, 197, 94, 0.1)';
                if(window.lucide) window.lucide.createIcons();
            }

            bus.emit('wallet:connected', { address: this.userAddress, chainId: this.chainId });
            
            // Valida Rede Arc
            await this.checkNetwork();
        }
    }

    handleChainChanged(chainIdHex) {
        // Recarrega a página é a prática recomendada pela Metamask, 
        // mas podemos apenas atualizar o estado se preferir.
        window.location.reload();
    }

    disconnect() {
        this.isConnected = false;
        this.userAddress = null;
        this.signer = null;
        
        const btn = document.getElementById('btnConnect');
        if(btn) {
            btn.innerHTML = `Connect Wallet`;
            btn.classList.remove('connected');
            btn.style.borderColor = 'var(--border-color)';
            btn.style.background = '#000';
        }
        
        bus.emit('wallet:disconnected');
    }

    // Lógica de Rede (trazida do antigo wallet.js)
    async checkNetwork() {
        if (this.chainId !== ARC_CHAIN_ID_DECIMAL) {
            bus.emit('notification:info', "Rede incorreta. Solicitando troca para Arc Testnet...");
            await this.switchToArcNetwork();
        }
    }

    async switchToArcNetwork() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: ARC_CHAIN_ID_HEX }],
            });
        } catch (switchError) {
            // Código 4902: A rede não existe na carteira
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: ARC_CHAIN_ID_HEX,
                            chainName: 'Arc Testnet',
                            rpcUrls: [ARC_RPC_URL],
                            nativeCurrency: ARC_CURRENCY,
                            blockExplorerUrls: [ARC_EXPLORER]
                        }],
                    });
                } catch (addError) {
                    console.error("Wallet: Falha ao adicionar rede", addError);
                    bus.emit('notification:error', "Não foi possível adicionar a Arc Network.");
                }
            } else {
                console.error("Wallet: Falha ao trocar de rede", switchError);
            }
        }
    }

    // Factory de Contratos Segura
    getContract(addressOrName, abi = null, addressOverride = null) {
        if (!this.signer) throw new Error("Carteira não conectada");

        let address = addressOrName;
        let contractAbi = abi;

        // Se for apenas um endereço (ERC20 genérico)
        if (!abi && window.ethers.isAddress(addressOrName)) {
            contractAbi = [
                "function name() view returns (string)",
                "function symbol() view returns (string)",
                "function decimals() view returns (uint8)",
                "function balanceOf(address) view returns (uint256)",
                "function approve(address, uint256) returns (bool)",
                "function allowance(address, address) view returns (uint256)"
            ];
        }

        if (addressOverride) {
            address = addressOverride;
        }

        return new window.ethers.Contract(address, contractAbi, this.signer);
    }
    
    getNetworkConfig() {
        return {
            chainId: ARC_CHAIN_ID_DECIMAL,
            explorer: ARC_EXPLORER,
            currency: ARC_CURRENCY.symbol
        };
    }
}

export const web3Service = new Web3Service();
