// js/modules/wallet.js

import { bus } from '../core/eventBus.js'; // Ajustado para 'core'

const ARC_CHAIN_ID_DECIMAL = 755;
const ARC_CHAIN_ID_HEX = '0x2f3'; 
const ARC_RPC_URL = 'https://rpc-testnet.arc.network';
const ARC_EXPLORER = 'https://explorer.arc.network';

class WalletModule {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.userAddress = null;
        this.isConnected = false;
        this.chainId = null;
    }

    async init() {
        if (typeof ethers === 'undefined') {
            console.error("Wallet Crítico: A biblioteca Ethers.js não foi carregada.");
            return;
        }

        if (!window.ethereum) {
            console.error("Wallet: MetaMask não detectada.");
            return;
        }

        this.provider = new ethers.BrowserProvider(window.ethereum);
        this._setupListeners();

        const accounts = await this.provider.send("eth_accounts", []);
        if (accounts.length > 0) {
            await this.connect();
        }
    }

    async connect() {
        try {
            if (!window.ethereum) throw new Error("Carteira não encontrada");

            const accounts = await this.provider.send("eth_requestAccounts", []);
            this.userAddress = accounts[0];
            
            this.signer = await this.provider.getSigner();

            const network = await this.provider.getNetwork();
            this.chainId = Number(network.chainId);

            this.isConnected = true;

            bus.emit('wallet:connected', { 
                address: this.userAddress, 
                chainId: this.chainId 
            });

            console.log(`Wallet: Conectado como ${this.userAddress} na Chain ${this.chainId}`);

            await this.checkNetwork();

        } catch (error) {
            console.error("Wallet: Erro ao conectar", error);
            bus.emit('notification:error', "Falha ao conectar carteira.");
        }
    }

    async disconnect() {
        this.userAddress = null;
        this.signer = null;
        this.isConnected = false;
        this.chainId = null;

        bus.emit('wallet:disconnected');
        console.log("Wallet: Desconectado localmente.");
    }

    async checkNetwork() {
        if (this.chainId !== ARC_CHAIN_ID_DECIMAL) {
            bus.emit('notification:info', "Rede incorreta. Solicitando troca para Arc Network...");
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
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: ARC_CHAIN_ID_HEX,
                            chainName: 'Arc Network Testnet',
                            rpcUrls: [ARC_RPC_URL],
                            nativeCurrency: {
                                name: 'ARC',
                                symbol: 'ARC',
                                decimals: 18
                            },
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

    _setupListeners() {
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                this.disconnect();
            } else if (accounts[0] !== this.userAddress) {
                this.userAddress = accounts[0];
                bus.emit('notification:info', "Conta alterada. Reconectando...");
                this.connect();
            }
        });

        window.ethereum.on('chainChanged', (chainIdHex) => {
            this.chainId = parseInt(chainIdHex, 16);
            
            if (this.chainId !== ARC_CHAIN_ID_DECIMAL) {
                bus.emit('notification:error', "Você saiu da Arc Network!");
            } else {
                bus.emit('notification:success', "Conectado à Arc Network.");
                this.provider.getSigner().then(s => this.signer = s);
            }
        });
    }
}

export const wallet = new WalletModule();
