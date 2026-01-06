import { SUPABASE_CONFIG } from '../config.js';
import { bus } from '../core/eventBus.js';

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

    async loadUserProfile(walletAddress) {
        if (!this.client || !walletAddress) return;

        try {
            // Tenta buscar usuário
            let { data: user, error } = await this.client
                .from('users')
                .select('*')
                .eq('wallet_address', walletAddress)
                .single();

            // Se não existir (ou der erro de busca), cria um objeto local temporário
            // Isso evita que a UI quebre se o banco estiver inacessível
            if (!user) {
                const newUser = {
                    wallet_address: walletAddress,
                    points: 0,
                    avatar_url: `https://robohash.org/${walletAddress}?set=set4`,
                    username: `User ${walletAddress.slice(0,4)}`
                };
                
                // Tenta salvar no banco
                const { data: createdUser, error: createError } = await this.client
                    .from('users')
                    .insert([newUser])
                    .select()
                    .single();
                
                // Se salvar funcionar, usa o do banco. Se falhar (RLS), usa o local.
                user = createdUser || newUser; 
            }

            this.currentUser = user;
            bus.emit('profile:loaded', user);
            console.log("SocialService: Profile loaded", user.username);

        } catch (err) {
            console.error("SocialService Error:", err);
            // Fallback de segurança para não travar o app
            this.currentUser = { wallet_address: walletAddress, points: 0, username: 'Guest' };
            bus.emit('profile:loaded', this.currentUser);
        }
    }

    async addPoints(amount) {
        if(!this.currentUser || !this.client) return;
        
        const newTotal = (this.currentUser.points || 0) + amount;
        this.currentUser.points = newTotal; // Atualiza localmente primeiro
        bus.emit('profile:updated', this.currentUser);

        await this.client
            .from('users')
            .update({ points: newTotal })
            .eq('wallet_address', this.currentUser.wallet_address);
    }

    async registerCreation(data) {
        if(!this.currentUser) return;

        const tokenData = {
            name: data.name,
            symbol: data.symbol,
            address: data.address,
            owner_wallet: this.currentUser.wallet_address,
            initial_supply: data.supply,
            contract_type: data.type, 
            bonus_claimed: false,
            created_at: new Date().toISOString(),
            logo_url: null
        };

        // 1. Salva no LocalStorage (Redundância Suprema)
        this._saveToLocalStorage(tokenData);

        // 2. Tenta salvar no Supabase
        if(this.client) {
            try {
                const { error } = await this.client.from('created_tokens').insert([tokenData]);
                if(error) console.error("Supabase Insert Error (RLS?):", error);
                else console.log("SocialService: Token salvo no Supabase");
            } catch (e) {
                console.error("SocialService: Falha de conexão DB", e);
            }
        }
    }

    async getUserTokens() {
        if (!this.currentUser) return [];

        let dbTokens = [];
        
        // 1. Tenta buscar do Banco
        if (this.client) {
            const { data, error } = await this.client
                .from('created_tokens')
                .select('*')
                .eq('owner_wallet', this.currentUser.wallet_address)
                .order('created_at', { ascending: false });
            
            if (!error && data) dbTokens = data;
        }

        // 2. Busca do LocalStorage (Tokens que criamos neste navegador)
        const localTokens = this._getFromLocalStorage();

        // 3. Mesclagem Inteligente (Sem duplicatas)
        // Usamos um Map para garantir unicidade pelo endereço do contrato
        const tokenMap = new Map();

        // Adiciona tokens do banco
        dbTokens.forEach(t => tokenMap.set(t.address.toLowerCase(), t));

        // Adiciona tokens locais (apenas se não existirem no banco ainda)
        localTokens.forEach(t => {
            if (!tokenMap.has(t.address.toLowerCase())) {
                tokenMap.set(t.address.toLowerCase(), t);
            }
        });

        // Converte de volta para array e ordena por data
        return Array.from(tokenMap.values()).sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
    }

    // --- Helpers de LocalStorage ---
    
    _getStorageKey() {
        if(!this.currentUser) return null;
        return `arc_tokens_${this.currentUser.wallet_address}`;
    }

    _saveToLocalStorage(token) {
        const key = this._getStorageKey();
        if(!key) return;

        let list = this._getFromLocalStorage();
        list.unshift(token);
        localStorage.setItem(key, JSON.stringify(list));
    }

    _getFromLocalStorage() {
        const key = this._getStorageKey();
        if(!key) return [];
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch(e) { return []; }
    }
}

export const socialService = new SocialService();
