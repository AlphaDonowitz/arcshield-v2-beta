import { bus } from '../core/eventBus.js';
import { aiService } from '../services/aiService.js';

// Estado Local do Studio
let studioState = {
    layers: [], 
    activeLayerId: null,
    previewCanvas: null,
    ctx: null
};

export function initStudio() {
    const container = document.getElementById('studio');
    if (!container) return;

    // 1. Renderiza Interface
    renderStudioStructure(container);

    // 2. Inicializa Canvas
    studioState.previewCanvas = document.getElementById('previewCanvas');
    if(studioState.previewCanvas) {
        studioState.previewCanvas.width = 1024; // Atualizado para HD
        studioState.previewCanvas.height = 1024;
        studioState.ctx = studioState.previewCanvas.getContext('2d');
    }

    // 3. Listeners
    attachBaseListeners();
    
    // 4. Camada Inicial
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
                <div id="layersList" class="layers-list"></div>
            </div>

            <div class="studio-workspace">
                <div class="workspace-header">
                    <div>
                        <h3 id="activeLayerTitle" style="margin:0; font-size:1.1rem;">Selecione uma Camada</h3>
                    </div>
                    <div id="layerTools" style="display:none; gap:10px;">
                        <button class="btn-secondary small ai-badge" id="btnOpenAi">
                            <i data-lucide="zap" style="width:14px; margin-right:5px; color:#facc15;"></i> IA Flash
                        </button>
                        <button class="btn-secondary small" id="btnUploadTrait">
                            <i data-lucide="upload" style="width:14px; margin-right:5px;"></i> Upload
                        </button>
                        <input type="file" id="hiddenUpload" hidden multiple accept="image/png, image/jpeg">
                    </div>
                </div>
                
                <div id="traitGrid" class="trait-grid"></div>

                <div id="emptyStateWorkspace" class="empty-state-studio">
                    <i data-lucide="layers" style="width:48px; height:48px; margin-bottom:10px; opacity:0.3;"></i>
                    <p>Selecione ou crie uma camada à esquerda para começar.</p>
                </div>

                <div id="aiLoadingOverlay" class="ai-loading-overlay" style="display:none;">
                    <i data-lucide="zap" class="spin" style="width:40px; height:40px; color:#facc15; margin-bottom:15px;"></i>
                    <p style="font-weight:600; font-size:1.2rem;">Criando Arte...</p>
                    <p style="font-size:0.9rem; opacity:0.7;">Motor Flux ativado. Quase pronto.</p>
                </div>
            </div>

            <div class="studio-sidebar-right">
                <label class="nav-label" style="margin-top:0;">PREVIEW HD</label>
                <div class="preview-box">
                    <canvas id="previewCanvas"></canvas>
                </div>
                <button class="btn-secondary full" id="btnRandomize">
                    <i data-lucide="refresh-cw" style="width:14px; margin-right:6px;"></i> Randomizar
                </button>

                <hr style="border:0; border-top:1px solid var(--border-color); margin:20px 0;">
                
                <div class="card" style="padding:15px; background:#18181b;">
                    <label class="nav-label" style="margin-top:0; color:var(--success-green);">COLEÇÃO</label>
                    <p style="font-size:0.8rem; color:#666;">Crie traits para olhos, boca e fundo separadamente para gerar combinações únicas.</p>
                    <button class="btn-primary full small" disabled>Gerar Coleção (Em breve)</button>
                </div>
            </div>
        </div>

        <dialog id="aiPromptDialog" class="modal-dialog">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3><i data-lucide="zap" class="text-blue"></i> Gerar com Flux AI</h3>
                <button id="btnCloseAiModal" style="background:none;border:none;color:#fff;cursor:pointer;"><i data-lucide="x"></i></button>
            </div>
            <p class="bio-text" style="margin-bottom:15px;">O motor Flux é ultrarrápido. Descreva o item para esta camada.</p>
            <textarea id="aiPromptInput" rows="3" placeholder="Ex: Cyberpunk golden helmet, 3d render..."></textarea>
            <button id="btnRunAiGeneration" class="btn-primary full mt-4">
                <i data-lucide="zap"></i> Gerar Agora
            </button>
        </dialog>
    `;

    if(window.lucide) window.lucide.createIcons();
}

function attachBaseListeners() {
    document.getElementById('btnAddLayer').addEventListener('click', () => {
        const name = prompt("Nome da nova camada (ex: Olhos, Fundo):");
        if(name) addLayer(name);
    });

    document.getElementById('btnUploadTrait').addEventListener('click', () => {
        document.getElementById('hiddenUpload').click();
    });

    document.getElementById('hiddenUpload').addEventListener('change', handleFileUpload);
    document.getElementById('btnRandomize').addEventListener('click', generatePreview);

    // IA Logic
    const aiDialog = document.getElementById('aiPromptDialog');
    const promptInput = document.getElementById('aiPromptInput');

    document.getElementById('btnOpenAi').addEventListener('click', () => {
        promptInput.value = "";
        aiDialog.showModal();
    });

    document.getElementById('btnCloseAiModal').addEventListener('click', () => {
        aiDialog.close();
    });

    document.getElementById('btnRunAiGeneration').addEventListener('click', async () => {
        const prompt = promptInput.value.trim();
        if(!prompt) return alert("Digite um prompt!");
        
        aiDialog.close();
        
        // Ativa overlay
        document.getElementById('aiLoadingOverlay').style.display = 'flex';

        try {
            const base64Image = await aiService.generateImage(prompt);
            await addTraitToActiveLayer(base64Image, prompt);
            bus.emit('notification:success', "Imagem gerada!");
        } catch (error) {
            bus.emit('notification:error', "Erro: " + error.message);
        } finally {
            document.getElementById('aiLoadingOverlay').style.display = 'none';
        }
    });
}

// --- Funções Core ---

function addLayer(name) {
    const newLayer = { id: Date.now(), name: name, traits: [] };
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

    const imgObj = new Image();
    imgObj.crossOrigin = "Anonymous"; 

    await new Promise((resolve, reject) => {
        imgObj.onload = resolve;
        imgObj.onerror = reject;
        imgObj.src = base64Data;
    });

    layer.traits.push({
        id: Date.now() + Math.random(),
        name: name.slice(0, 20),
        base64: base64Data,
        imgObj: imgObj
    });

    renderWorkspace();
    generatePreview();
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
    e.target.value = ''; 
}

function deleteTrait(layerId, traitId) {
    const layer = studioState.layers.find(l => l.id === layerId);
    if(!layer) return;
    layer.traits = layer.traits.filter(t => t.id !== traitId);
    renderWorkspace();
    generatePreview();
}

// --- Renderização ---

function renderLayersList() {
    const list = document.getElementById('layersList');
    list.innerHTML = '';
    
    studioState.layers.slice().reverse().forEach(layer => {
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

    grid.querySelectorAll('.btn-delete-trait').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTrait(Number(btn.dataset.layer), Number(btn.dataset.trait));
        });
    });

    if(window.lucide) window.lucide.createIcons();
}

function generatePreview() {
    const { ctx, previewCanvas } = studioState;
    if(!ctx) return;
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    studioState.layers.forEach(layer => {
        if(layer.traits.length === 0) return;
        const randomIndex = Math.floor(Math.random() * layer.traits.length);
        const trait = layer.traits[randomIndex];
        if(trait && trait.imgObj) {
            ctx.drawImage(trait.imgObj, 0, 0, previewCanvas.width, previewCanvas.height);
        }
    });
}
