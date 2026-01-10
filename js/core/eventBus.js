class EventBus {
    constructor() {
        this.events = {};
    }
    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    }
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
}
export const bus = new EventBus();
js/services/web3Service.js
Motor Web3 centralizado com suporte a window.ethers global.
import { bus } from '../core/eventBus.js';
import { NETWORKS, CONTRACTS } from '../config.js';

class Web3Service {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.userAddress = null;
        this.isConnected = false;
        this.chainId = null;
    }

    async init() {
        if (!window.ethers) {
            console.error("CRITICAL: Ethers.js não carregado no escopo global.");
            return;
        }
        if (window.ethereum) {
            this.provider = new window.ethers.BrowserProvider(window.ethereum);
            try {
                const accounts = await this.provider.listAccounts();
                if (accounts.length > 0) await this.connectWallet();
            } catch (e) { console.warn("Sessão anterior não encontrada."); }

            window.ethereum.on('accountsChanged', () => window.location.reload());
            window.ethereum.on('chainChanged', () => window.location.reload());
        }
    }

    async connectWallet() {
        if (!window.ethereum) return alert("Instale a MetaMask!");
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            this.signer = await this.provider.getSigner();
            this.userAddress = await this.signer.getAddress();
            this.isConnected = true;
            
            const net = await this.provider.getNetwork();
            this.chainId = "0x" + net.chainId.toString(16);

            const btn = document.getElementById('btnConnect');
            if (btn) {
                btn.innerText = `${this.userAddress.slice(0, 6)}...${this.userAddress.slice(-4)}`;
                btn.classList.add('connected');
            }
            bus.emit('wallet:connected', { address: this.userAddress });
        } catch (error) {
            console.error("Erro na conexão:", error);
            bus.emit('notification:error', "Falha ao conectar carteira.");
        }
    }

    async disconnect() {
        try {
            if (window.ethereum) {
                await window.ethereum.request({
                    method: "wallet_revokePermissions",
                    params: [{ eth_accounts: {} }]
                });
            }
        } catch (e) {}
        this.isConnected = false;
        localStorage.removeItem('arcShield_connected');
        window.location.reload();
    }

    getContract(addressOrType, abi = null) {
        if (!this.signer) throw new Error("Carteira não conectada.");
        let address = addressOrType;
        let contractAbi = abi;

        if (CONTRACTS[addressOrType]) {
            address = CONTRACTS[addressOrType];
            contractAbi = abi; 
        }
        return new window.ethers.Contract(address, contractAbi, this.signer);
    }

    getNetworkConfig() {
        return NETWORKS.ARC;
    }
}
export const web3Service = new Web3Service();
js/services/socialService.js
Gerenciamento de perfil, XP e persistência local/Supabase.
import { SUPABASE_CONFIG } from '../config.js';
import { bus } from '../core/eventBus.js';
import { web3Service } from './web3Service.js';

class SocialService {
    constructor() {
        this.client = null;
        this.currentUser = null;
        this.init();
    }

    init() {
        if (window.supabase) {
            this.client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
        }
    }

    async loadUserProfile(walletAddress) {
        if (!this.client || !walletAddress) return;
        try {
            let { data: user } = await this.client.from('users').select('*').eq('wallet_address', walletAddress).single();
            if (!user) {
                const newUser = { wallet_address: walletAddress, points: 0, username: `User ${walletAddress.slice(0,4)}` };
                const { data } = await this.client.from('users').insert([newUser]).select().single();
                user = data || newUser;
            }
            this.currentUser = user;
            bus.emit('profile:loaded', user);
        } catch (err) {
            this.currentUser = { wallet_address: walletAddress, points: 0, username: 'Guest' };
            bus.emit('profile:loaded', this.currentUser);
        }
    }

    async registerCreation(data) {
        const owner = this.currentUser?.wallet_address || web3Service.userAddress;
        if (!owner) return;
        const tokenData = { ...data, owner_wallet: owner, created_at: new Date().toISOString() };
        this._saveLocal(tokenData, owner);
        if (this.client) await this.client.from('created_tokens').insert([tokenData]);
    }

    async getUserTokens() {
        const owner = this.currentUser?.wallet_address || web3Service.userAddress;
        if (!owner) return [];
        let dbTokens = [];
        if (this.client) {
            const { data } = await this.client.from('created_tokens').select('*').eq('owner_wallet', owner).order('created_at', { ascending: false });
            if (data) dbTokens = data;
        }
        const local = this._getLocal(owner);
        const map = new Map();
        dbTokens.forEach(t => map.set(t.address.toLowerCase(), t));
        local.forEach(t => { if (!map.has(t.address.toLowerCase())) map.set(t.address.toLowerCase(), t); });
        return Array.from(map.values()).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    }

    _saveLocal(token, owner) {
        const key = `arc_tokens_${owner}`;
        let list = this._getLocal(owner);
        if (!list.find(t => t.address.toLowerCase() === token.address.toLowerCase())) {
            list.unshift(token);
            localStorage.setItem(key, JSON.stringify(list));
        }
    }

    _getLocal(owner) {
        try { return JSON.parse(localStorage.getItem(`arc_tokens_${owner}`)) || []; } catch { return []; }
    }
}
export const socialService = new SocialService();
