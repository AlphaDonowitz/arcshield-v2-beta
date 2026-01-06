import { bus } from '../core/eventBus.js';

class AiService {
    constructor() {
        // Usando gateway Flux otimizado
        this.model = 'flux'; // O modelo mais rápido e realista do momento
    }

    async generateImage(prompt) {
        if (!prompt) throw new Error("Prompt vazio");
        
        console.log("AI Service: Iniciando geração rápida (Flux Engine)...");
        bus.emit('notification:info', "Gerando imagem em alta velocidade...");

        // 1. Prepara o Prompt para Alta Qualidade
        // Adicionamos "magic words" para forçar o realismo do Google/Midjourney
        const enhancedPrompt = `${prompt}, hyper-realistic, 8k resolution, detailed texture, professional photography, cinematic lighting, sharp focus`;
        const encodedPrompt = encodeURIComponent(enhancedPrompt);
        
        // Seed aleatória para garantir que a imagem mude a cada clique
        const seed = Math.floor(Math.random() * 10000000);

        // 2. Monta a URL (Direct Stream)
        // model=flux: Garante o motor moderno
        // nologo=true: Remove marcas d'água
        // seed: Garante variação
        const url = `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=1024&model=${this.model}&seed=${seed}&nologo=true&enhance=true`;

        try {
            // 3. Baixa a imagem diretamente (sem espera de fila)
            const base64 = await this._downloadAndConvert(url);
            console.log("AI Service: Imagem pronta.");
            return base64;

        } catch (error) {
            console.error("AI Generation Error:", error);
            throw new Error("Falha na conexão com o serviço de IA rápida.");
        }
    }

    // Helper: Baixa a URL e converte para Base64 limpo para o Canvas
    async _downloadAndConvert(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
            
            const blob = await response.blob();
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (err) {
            throw err;
        }
    }
}

export const aiService = new AiService();
