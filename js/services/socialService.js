import { SUPABASE_CONFIG } from '../config.js';
import { bus } from '../core/eventBus.js';
import { web3Service } from './web3Service.js'; // Importa web3 para fallback de endereço

class SocialService {
    constructor() {
        this.client = null;
        this.currentUser = null;
        this.init();
    }

    init() {
        if (window.supabase) {
            this.client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
        } else {
            console.error("SocialService: Supabase lib not loaded.");
        }
    }

    // Carrega perfil, com fallback local se o banco falhar
    async loadUserProfile(walletAddress) {
        if (!this.client || !walletAddress) return;

        try {
            let { data: user, error } = await this.client
                .from('users')
                .select('*')
                .eq('wallet_address', walletAddress)
                .single();

            if (!user) {
                const newUser = {
                    wallet_address: walletAddress,
                    points: 0,
                    avatar_url: `https://robohash.org/${walletAddress}?set=set4`,
                    username: `User ${walletAddress.slice(0,4)}`
                };
                
                // Tenta criar no banco
                const { data: createdUser } = await this.client
                    .from('users')
                    .insert([newUser])
                    .select()
                    .single();
                
                user = createdUser || newUser;
            }

            this.currentUser = user;
            bus.emit('profile:loaded', user);

        } catch (err) {
            console.error("SocialService load error:", err);
            // Fallback de emergência
            this.currentUser = { wallet_address: walletAddress, points: 0, username: 'Guest' };
            bus.emit('profile:loaded', this.currentUser);
        }
    }

    async addPoints(amount) {
        if(!this.currentUser) return;
        this.currentUser.points = (this.currentUser.points || 0) + amount;
        bus.emit('profile:updated', this.currentUser);

        if(this.client) {
            await this.client.from('users').update({ points: this.currentUser.points })
                .eq('wallet_address', this.currentUser.wallet_address);
        }
    }

    async registerCreation(data) {
        // Garante que temos um endereço de carteira (do user ou do web3 direto)
        const owner = this.currentUser?.wallet_address || web3Service.userAddress;
        
        if(!owner) {
            console.error("SocialService: Sem carteira para salvar token.");
            return;
        }

        const tokenData = {
            name: data.name,
            symbol: data.symbol,
            address: data.address,
            owner_wallet: owner,
            initial_supply: data.supply,
            contract_type: data.type, 
            bonus_claimed: false,
            created_at: new Date().toISOString(),
            logo_url: null
        };

        console.log("SocialService: Salvando token...", tokenData);

        // 1. Salva no LocalStorage (Redundância Imediata)
        this._saveToLocalStorage(tokenData, owner);

        // 2. Tenta salvar no Supabase (Background)
        if(this.client) {
            const { error } = await this.client.from('created_tokens').insert([tokenData]);
            if(error) console.error("Supabase Error:", error);
        }
    }

    async getUserTokens() {
        const owner = this.currentUser?.wallet_address || web3Service.userAddress;
        if (!owner) return [];

        let dbTokens = [];
        
        // 1. Busca do Banco
        if (this.client) {
            const { data } = await this.client
                .from('created_tokens')
                .select('*')
                .eq('owner_wallet', owner)
                .order('created_at', { ascending: false });
            if (data) dbTokens = data;
        }

        // 2. Busca do LocalStorage
        const localTokens = this._getFromLocalStorage(owner);

        // 3. Mescla (Prioridade para o banco, adiciona locais se faltar)
        const tokenMap = new Map();
        dbTokens.forEach(t => tokenMap.set(t.address.toLowerCase(), t));
        localTokens.forEach(t => {
            if (!tokenMap.has(t.address.toLowerCase())) {
                tokenMap.set(t.address.toLowerCase(), t);
            }
        });

        return Array.from(tokenMap.values()).sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
    }

    // --- Helpers LocalStorage ---
    _getStorageKey(owner) { return `arc_tokens_${owner}`; }

    _saveToLocalStorage(token, owner) {
        const key = this._getStorageKey(owner);
        let list = this._getFromLocalStorage(owner);
        // Evita duplicatas no local storage
        if(!list.find(t => t.address.toLowerCase() === token.address.toLowerCase())) {
            list.unshift(token);
            localStorage.setItem(key, JSON.stringify(list));
        }
    }

    _getFromLocalStorage(owner) {
        try {
            return JSON.parse(localStorage.getItem(this._getStorageKey(owner))) || [];
        } catch(e) { return []; }
    }
}

export const socialService = new SocialService();
