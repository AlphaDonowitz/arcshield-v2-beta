import { SUPABASE_CONFIG } from '../config.js';
import { bus } from '../core/eventBus.js';

class SocialService {
    constructor() {
        this.client = null;
        this.currentUser = null;
        this.sessionTokens = []; // Cache local para tokens recém-criados
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
                
                const { data: createdUser, error: createError } = await this.client
                    .from('users')
                    .insert([newUser])
                    .select()
                    .single();
                
                if (createError) throw createError;
                user = createdUser;
            }

            this.currentUser = user;
            bus.emit('profile:loaded', user);
            console.log("SocialService: Profile loaded", user.username);

        } catch (err) {
            console.error("SocialService Error:", err);
            bus.emit('notification:error', "Erro ao carregar perfil social.");
        }
    }

    async addPoints(amount) {
        if(!this.currentUser || !this.client) return;
        
        const newTotal = (this.currentUser.points || 0) + amount;
        
        const { error } = await this.client
            .from('users')
            .update({ points: newTotal })
            .eq('wallet_address', this.currentUser.wallet_address);

        if(!error) {
            this.currentUser.points = newTotal;
            bus.emit('profile:updated', { ...this.currentUser, points: newTotal });
            bus.emit('notification:success', `+${amount} XP!`);
        }
    }

    async registerCreation(data) {
        // 1. Adiciona ao cache local imediatamente (Optimistic Update)
        const optimisticToken = {
            id: 'temp_' + Date.now(),
            name: data.name,
            symbol: data.symbol,
            address: data.address,
            owner_wallet: this.currentUser ? this.currentUser.wallet_address : data.owner_wallet,
            initial_supply: data.supply,
            contract_type: data.type,
            logo_url: null, // Pode ser preenchido se tivermos a imagem
            created_at: new Date().toISOString()
        };
        
        this.sessionTokens.unshift(optimisticToken);
        console.log("SocialService: Token adicionado ao cache local", optimisticToken);

        // 2. Tenta salvar no banco em background
        if(!this.client || !this.currentUser) return;

        try {
            await this.client.from('created_tokens').insert([{
                name: data.name,
                symbol: data.symbol,
                address: data.address,
                owner_wallet: this.currentUser.wallet_address,
                initial_supply: data.supply,
                contract_type: data.type, 
                bonus_claimed: false
            }]);
            console.log("SocialService: Token salvo no Supabase");
        } catch (e) {
            console.error("SocialService: Falha ao salvar no DB (mas está no cache)", e);
        }
    }

    // Busca tokens do usuário (DB + Cache Local)
    async getUserTokens() {
        if (!this.client || !this.currentUser) return this.sessionTokens;

        // 1. Busca do Banco
        const { data: dbTokens, error } = await this.client
            .from('created_tokens')
            .select('*')
            .eq('owner_wallet', this.currentUser.wallet_address)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Erro ao buscar tokens do DB:", error);
            // Se der erro no banco, retorna pelo menos os locais
            return this.sessionTokens;
        }

        // 2. Mescla Banco com Cache Local (evitando duplicatas)
        // Se o token já está no DB, usamos o do DB. Se não, usamos o do cache.
        const mergedList = [...dbTokens];
        
        this.sessionTokens.forEach(localToken => {
            const exists = mergedList.find(t => t.address.toLowerCase() === localToken.address.toLowerCase());
            if (!exists) {
                // Adiciona no topo se ainda não apareceu no banco
                mergedList.unshift(localToken);
            }
        });

        return mergedList;
    }
}

export const socialService = new SocialService();
