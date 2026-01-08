import { bus } from '../core/eventBus.js';

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
            // Usa o BrowserProvider da versão v6 global
            this.provider = new window.ethers.BrowserProvider(window.ethereum);
            
            // Tenta reconectar sessão anterior
            try {
                const accounts = await this.provider.listAccounts();
                if (accounts.length > 0) {
                    await this.connectWallet();
                }
            } catch (e) { console.warn("Erro ao verificar contas:", e); }

            // Listeners de Rede
            window.ethereum.on('accountsChanged', () => window.location.reload());
            window.ethereum.on('chainChanged', () => window.location.reload());
            
            const btn = document.getElementById('btnConnect');
            if(btn) btn.addEventListener('click', () => this.connectWallet());
        }
    }

    async connectWallet() {
        if (!window.ethereum) return alert("Instale a Metamask!");
        
        try {
            this.signer = await this.provider.getSigner();
            this.userAddress = await this.signer.getAddress();
            this.isConnected = true;
            
            console.log("Wallet Connected:", this.userAddress);
            
            const btn = document.getElementById('btnConnect');
            if(btn) {
                btn.innerText = this.userAddress.slice(0,6) + "..." + this.userAddress.slice(-4);
                btn.classList.add('connected');
            }

            bus.emit('wallet:connected', { address: this.userAddress });

        } catch (error) {
            console.error("Connection Error:", error);
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

        // Se for um contrato do sistema (Locker, etc)
        if (addressOverride) {
            address = addressOverride;
        }

        return new window.ethers.Contract(address, contractAbi, this.signer);
    }
}

export const web3Service = new Web3Service();
