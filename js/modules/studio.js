import { bus } from '../core/eventBus.js';
import { aiService } from '../services/aiService.js';

// Estado Local do Studio
let studioState = {
    layers: [], // [{ id, name, traits: [] }]
    activeLayerId: null,
    previewCanvas: null,
    ctx: null
};

export function initStudio() {
    const container = document.getElementById('studio');
    if (!container) return;

    // 1. Renderiza a Estrutura Base
    renderStudioStructure(container);

    // 2. Inicializa Canvas
    studioState.previewCanvas = document.getElementById('previewCanvas');
    if(studioState.previewCanvas) {
        // Define resolução interna alta (1000x1000) para qualidade
        studioState.previewCanvas.width = 1000;
        studioState.previewCanvas.height = 1000;
        studioState.ctx = studioState.previewCanvas.getContext('2d');
    }

    // 3. Attach Listeners Iniciais
    attachBaseListeners();
    
    // 4. Adiciona uma camada inicial por padrão
    addLayer("Background");
}

function renderStudioStructure(container) {
    container.innerHTML = `
        <div class="studio-wrapper">
            <div class="studio-sidebar-left">
                <div class="layers-header">
                    <span>Camadas</span>
                    <button class="btn-secondary small" id="btnAddLayer"><i data-lucide="plus"></i></button>
                </div>
                <div id="layersList" class="layers-list">
                    </div>
            </div>

            <div class="studio-workspace">
                <div class="workspace-header">
                    <div>
                        <h3 id="activeLayerTitle" style="margin:0; font-size:1.1rem;">Selecione uma Camada</h3>
                    </div>
                    <div id="layerTools" style="display:none; gap:10px;">
                        <button class="btn-secondary small ai-badge" id="btnOpenAi">
                            <i data-lucide="sparkles" style="width:14px; margin-right:5px;"></i> Gerar com IA
                        </button>
                        <button class="btn-secondary small" id="btnUploadTrait">
                            <i data-lucide="upload" style="width:14px; margin-right:5px;"></i> Upload
                        </button>
                        <input type="file" id="hiddenUpload" hidden multiple accept="image/png, image/jpeg">
                    </div>
                </div>
                
                <div id="traitGrid" class="trait-grid">
                    </div>

                <div id="emptyStateWorkspace" class="empty-state-studio">
                    <i data-lucide="layers" style="width:48px; height:48px; margin-bottom:10px; opacity:0.3;"></i>
                    <p>Selecione ou crie uma camada à esquerda para começar.</p>
                </div>

                <div id="aiLoadingOverlay" class="ai-loading-overlay" style="display:none;">
                    <i data-lucide="loader-2" class="spin" style="width:40px; height:40px; color:var(--primary-blue); margin-bottom:15px;"></i>
                    <p style="font-weight:600;">A IA está criando sua imagem...</p>
                    <p style="font-size:0.8rem; opacity:0.7;">Isso pode levar de 10 a 30 segundos.</p>
                </div>
            </div>

            <div class="studio-sidebar-right">
                <label class="nav-label" style="margin-top:0;">PREVIEW EM TEMPO REAL</label>
                <div class="preview-box">
                    <canvas id="previewCanvas"></canvas>
                </div>
                <button class="btn-secondary full" id="btnRandomize">
                    <i data-lucide="refresh-cw" style="width:14px; margin-right:6px;"></i> Randomizar
                </button>

                <hr style="border:0; border-top:1px solid var(--border-color); margin:20px 0;">
                
                <div class="card" style="padding:15px; background:#18181b;">
                    <label class="nav-label" style="margin-top:0; color:var(--success-green);">PRÓXIMOS PASSOS</label>
                    <p style="font-size:0.8rem; color:#666;">Quando finalizar suas camadas, você poderá gerar milhares de combinações e lançar a coleção.</p>
                    <button class="btn-primary full small" disabled title="Adicione traits primeiro">
                        Gerar Coleção (Em breve)
                    </button>
                </div>
            </div>
        </div>

        <dialog id="aiPromptDialog" class="modal-dialog">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3><i data-lucide="sparkles" class="text-blue"></i> Gerar Trait com IA</h3>
                <button id="btnCloseAiModal" style="background:none;border:none;color:#fff;cursor:pointer;"><i data-lucide="x"></i></button>
            </div>
            <p class="bio-text" style="margin-bottom:15px;">Descreva o elemento que você quer adicionar a esta camada. Ex: "cyberpunk sunglasses", "golden crown".</p>
            <textarea id="aiPromptInput" rows="3" placeholder="Digite seu prompt em inglês para melhores resultados..."></textarea>
            <button id="btnRunAiGeneration" class="btn-primary full mt-4">Gerar Imagem</button>
        </dialog>
    `;

    if(window.lucide) window.lucide.createIcons();
}

function attachBaseListeners() {
    // Botão Adicionar Camada
    document.getElementById('btnAddLayer').addEventListener('click', () => {
        const name = prompt("Nome da nova camada (ex: Olhos, Fundo):");
        if(name) addLayer(name);
    });

    // Botão Upload
    document.getElementById('btnUploadTrait').addEventListener('click', () => {
        document.getElementById('hiddenUpload').click();
    });

    document.getElementById('hiddenUpload').addEventListener('change', handleFileUpload);

    // Botão Randomizar Preview
    document.getElementById('btnRandomize').addEventListener('click', generatePreview);

    // --- Listeners de IA ---
    const aiDialog = document.getElementById('aiPromptDialog');
    const promptInput = document.getElementById('aiPromptInput');

    // Abrir Modal
    document.getElementById('btnOpenAi').addEventListener('click', () => {
        promptInput.value = "";
        aiDialog.showModal();
    });

    // Fechar Modal
    document.getElementById('btnCloseAiModal').addEventListener('click', () => {
        aiDialog.close();
    });

    // Executar Geração
    document.getElementById('btnRunAiGeneration').addEventListener('click', async () => {
        const prompt = promptInput.value.trim();
        if(!prompt) return alert("Digite um prompt!");
        
        aiDialog.close();
        document.getElementById('aiLoadingOverlay').style.display = 'flex';

        try {
            // Chama o serviço novo (Stable Horde)
            const base64Image = await aiService.generateImage(prompt);
            // Adiciona a imagem gerada como um trait na camada ativa
            await addTraitToActiveLayer(base64Image, prompt);
            bus.emit('notification:success', "Imagem gerada e adicionada com sucesso!");
        } catch (error) {
            bus.emit('notification:error', "Erro na IA: " + error.message);
        } finally {
            document.getElementById('aiLoadingOverlay').style.display = 'none';
        }
    });
}

// --- Gerenciamento de Estado ---

function addLayer(name) {
    const newLayer = {
        id: Date.now(),
        name: name,
        traits: []
    };
    studioState.layers.push(newLayer);
    setActiveLayer(newLayer.id);
    renderLayersList();
}

function setActiveLayer(layerId) {
    studioState.activeLayerId = layerId;
    renderLayersList();
    renderWorkspace();
}

async function addTraitToActiveLayer(base64Data, name) {
    if(!studioState.activeLayerId) return;

    const layer = studioState.layers.find(l => l.id === studioState.activeLayerId);
    if(!layer) return;

    // Cria objeto de imagem para desenhar no canvas
    const imgObj = new Image();
    // Crucial para evitar problemas de CORS se a imagem vier de fora
    imgObj.crossOrigin = "Anonymous"; 

    // Promessa para garantir que a imagem carregou antes de prosseguir
    await new Promise((resolve, reject) => {
        imgObj.onload = resolve;
        imgObj.onerror = reject;
        imgObj.src = base64Data;
    });

    layer.traits.push({
        id: Date.now() + Math.random(),
        name: name.slice(0, 20), // Nome curto
        base64: base64Data,
        imgObj: imgObj, // Guarda a referência da imagem carregada
        weight: 50 // Raridade padrão
    });

    renderWorkspace();
    generatePreview(); // Atualiza o canvas principal
}

function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    if(files.length === 0 || !studioState.activeLayerId) return;

    files.forEach(file => {
        if(!file.type.match('image.*')) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
             await addTraitToActiveLayer(event.target.result, file.name.split('.')[0]);
        };
        reader.readAsDataURL(file);
    });
    e.target.value = ''; // Limpa input
}

function deleteTrait(layerId, traitId) {
    const layer = studioState.layers.find(l => l.id === layerId);
    if(!layer) return;
    layer.traits = layer.traits.filter(t => t.id !== traitId);
    renderWorkspace();
    generatePreview();
}

// --- Renderização da UI ---

function renderLayersList() {
    const list = document.getElementById('layersList');
    list.innerHTML = '';
    
    studioState.layers.slice().reverse().forEach(layer => { // Mostra na ordem inversa (topo da pilha primeiro)
        const isActive = layer.id === studioState.activeLayerId;
        const item = document.createElement('div');
        item.className = `layer-item ${isActive ? 'active' : ''}`;
        item.innerHTML = `
            <span style="font-weight:500">${layer.name}</span>
            <span class="badge">${layer.traits.length}</span>
        `;
        item.addEventListener('click', () => setActiveLayer(layer.id));
        list.appendChild(item);
    });
}

function renderWorkspace() {
    const tools = document.getElementById('layerTools');
    const emptyState = document.getElementById('emptyStateWorkspace');
    const title = document.getElementById('activeLayerTitle');
    const grid = document.getElementById('traitGrid');

    const activeLayer = studioState.layers.find(l => l.id === studioState.activeLayerId);

    if(!activeLayer) {
        tools.style.display = 'none';
        emptyState.style.display = 'flex';
        grid.innerHTML = '';
        title.innerText = "Selecione uma Camada";
        return;
    }

    tools.style.display = 'flex';
    emptyState.style.display = 'none';
    title.innerText = `Camada: ${activeLayer.name}`;

    grid.innerHTML = activeLayer.traits.map(trait => `
        <div class="trait-card">
            <button class="btn-delete-trait" data-layer="${activeLayer.id}" data-trait="${trait.id}">
                <i data-lucide="x" style="width:14px;"></i>
            </button>
            <div class="trait-img-box">
                <img src="${trait.base64}">
            </div>
            <div class="trait-info">
                <div class="trait-name" title="${trait.name}">${trait.name}</div>
            </div>
        </div>
    `).join('');

    // Listeners de delete
    grid.querySelectorAll('.btn-delete-trait').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTrait(Number(btn.dataset.layer), Number(btn.dataset.trait));
        });
    });

    if(window.lucide) window.lucide.createIcons();
}

// --- Lógica do Canvas (Preview) ---

function generatePreview() {
    const { ctx, previewCanvas } = studioState;
    if(!ctx) return;

    // Limpa o canvas
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    // Itera pelas camadas na ordem correta (fundo -> frente)
    studioState.layers.forEach(layer => {
        if(layer.traits.length === 0) return;

        // Simples escolha aleatória por enquanto (sem pesos)
        const randomIndex = Math.floor(Math.random() * layer.traits.length);
        const trait = layer.traits[randomIndex];

        if(trait && trait.imgObj) {
            // Desenha a imagem esticada para preencher o canvas (1000x1000)
            ctx.drawImage(trait.imgObj, 0, 0, previewCanvas.width, previewCanvas.height);
        }
    });
}
