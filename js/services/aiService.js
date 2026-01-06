import { bus } from '../core/eventBus.js';

class AiService {
    constructor() {
        // Usando a API pública da Stable Horde. 
        // Para maior velocidade, pode-se usar uma API Key no futuro.
        this.baseUrl = 'https://stablehorde.net/api/v2';
    }

    async generateImage(prompt) {
        if (!prompt) throw new Error("Prompt vazio");
        
        console.log("AI Service: Iniciando geração via Stable Horde...");
        bus.emit('notification:info', "Enviando pedido para a rede de IA...");

        // 1. Envia o pedido de geração
        const payload = {
            prompt: prompt + " high quality, detailed, digital art", // Adiciona sufixo para melhorar qualidade
            params: {
                // Parâmetros para melhor resultado
                sampler_name: "k_euler_a",
                cfg_scale: 7.5,
                steps: 25,
                height: 512,
                width: 512,
                karras: true,
                tiling: false,
                // Usa 1 imagem apenas para o Studio
                n: 1 
            },
            nsfw: false,
            censor_nsfw: true,
            trusted_workers: false,
            // Usa um modelo bom e genérico (Stable Diffusion 1.5 ou similar disponível na horda)
            models: ["stable_diffusion"]
        };

        try {
            const response = await fetch(`${this.baseUrl}/generate/async`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': '0000000000' // API Key anônima da Horde
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if(!data.id) {
               console.error("Horde Error:", data);
               throw new Error(data.message || "Falha ao iniciar geração na Horde");
            }

            const generationId = data.id;
            console.log(`AI Service: Pedido aceito. ID: ${generationId}. Aguardando processamento...`);
            bus.emit('notification:info', "IA processando imagem. Aguarde...");

            // 2. Polling: Verifica o status até ficar pronto
            return await this._pollForStatus(generationId);

        } catch (error) {
            console.error("AI Generation Error:", error);
            throw error;
        }
    }

    async _pollForStatus(id, attempts = 0) {
        // Limite de segurança (kb 60 segundos)
        if (attempts > 30) throw new Error("Tempo limite de geração excedido.");

        // Espera 2 segundos entre checagens
        await new Promise(r => setTimeout(r, 2000));

        const response = await fetch(`${this.baseUrl}/generate/status/${id}`, {
             headers: { 'apikey': '0000000000' }
        });
        const statusData = await response.json();

        if (statusData.done) {
            // 3. Geração concluída, pega a URL da imagem
            if(statusData.generations && statusData.generations.length > 0) {
                const imageUrl = statusData.generations[0].img;
                console.log("AI Service: Imagem pronta:", imageUrl);
                
                // Precisamos carregar a imagem e converter para Base64 para evitar problemas de CORS no Canvas depois
                return await this._convertToBase64(imageUrl);
            } else {
                 throw new Error("Geração finalizada mas sem imagem retornada.");
            }
        } else {
            // Ainda processando...
            console.log(`AI Service: Status ${statusData.wait_time}s restantes...`);
            return this._pollForStatus(id, attempts + 1);
        }
    }

    // Helper para baixar a imagem e converter para Base64 (DataURL)
    // Isso é crucial para poder salvar o resultado no Studio sem erro de segurança do navegador
    async _convertToBase64(url) {
        bus.emit('notification:info', "Baixando resultado...");
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

export const aiService = new AiService();
