import { bus } from '../core/eventBus.js';

// Estado Local do Studio
let studioState = {
    layers: [], 
    activeLayerId: null,
    previewCanvas: null,
    ctx: null,
    canvasSize: 1024,
    generatedBatch: [] // Armazena o preview da coleção
};

export function initStudio() {
    const container = document.getElementById('studio');
    if (!container) return;

    renderStudioStructure(container);

    studioState.previewCanvas = document.getElementById('previewCanvas');
    if(studioState.previewCanvas) {
        studioState.previewCanvas.width = studioState.canvasSize;
        studioState.previewCanvas.height = studioState.canvasSize;
        studioState.ctx = studioState.previewCanvas.getContext('2d', { alpha: false });
        studioState.ctx.imageSmoothingEnabled = true;
        studioState.ctx.imageSmoothingQuality = 'high';
    }

    attachListeners();
    
    // Camadas Iniciais Sugeridas
    addLayer("Background");
    addLayer("Body");
    addLayer("Eyes");
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

            <div class="studio-workspace" id="workspaceArea">
                
                <div class="workspace-toolbar">
                    <div>
                        <h3 id="activeLayerTitle" style="margin:0; font-size:1.1rem;">Selecione uma Camada</h3>
                        <span id="activeLayerCount" style="font-size:0.8rem; color:#666;">0 itens</span>
                    </div>
                    <div id="layerTools" style="display:none; gap:10px;">
                        <button class="btn-primary small" id="btnUploadTrait">
                            <i data-lucide="upload" style="width:14px; margin-right:5px;"></i> Upload PNGs
                        </button>
                        <input type="file" id="hiddenUpload" hidden multiple accept="image/png, image/jpeg, image/webp">
                    </div>
                </div>
                
                <div id="traitGrid" class="trait-grid"></div>

                <div id="emptyStateWorkspace" style="text-align:center; margin-top:100px; opacity:0.5;">
                    <i data-lucide="layers" style="width:48px; height:48px; margin-bottom:10px;"></i>
                    <p>Adicione camadas à esquerda e faça upload das suas imagens.</p>
                </div>

                <div id="resultsOverlay" class="generation-overlay" style="display:none;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h3>Resultado da Geração</h3>
                        <button class="btn-secondary small" id="btnCloseResults"><i data-lucide="x"></i> Fechar</button>
                    </div>
                    <p style="font-size:0.9rem; color:#888;">Aqui está uma amostra de como sua coleção ficará.</p>
                    
                    <div id="resultsGrid" class="gen-grid">
                        </div>
                </div>
            </div>

            <div class="studio-sidebar-right">
                <label class="nav-label" style="margin-top:0;">PREVIEW ÚNICO</label>
                <div class="preview-box">
                    <canvas id="previewCanvas"></canvas>
                </div>
                <button class="btn-secondary full" id="btnRandomize">
                    <i data-lucide="refresh-cw" style="width:14px; margin-right:6px;"></i> Testar Combinação
                </button>

                <hr style="border:0; border-top:1px solid var(--border-color); margin:20px 0;">
                
                <div class="card" style="padding:15px; background:#18181b;">
                    <label class="nav-label" style="margin-top:0; color:var(--success-green);">CRIAR COLEÇÃO</label>
                    <p style="font-size:0.8rem; color:#666; margin-bottom:15px;">
                        Gere a coleção completa com metadados prontos para OpenSea.
                    </p>
                    
                    <div style="margin-bottom:10px;">
                        <label style="font-size:0.75rem;">Quantidade Total</label>
                        <input type="number" id="collectionSize" value="50" min="1" max="10000" style="padding:8px; width:100%; background:#000; border:1px solid #333; color:#fff; border-radius:4px;">
                    </div>

                    <button class="btn-secondary full mb-2" id="btnPreviewBatch" style="margin-bottom:10px;">
                        <i data-lucide="grid"></i> Ver Amostra (Preview)
                    </button>

                    <button class="btn-primary full" id="btnGenerateZip">
                        <i data-lucide="download"></i> Baixar ZIP (OpenSea)
                    </button>
                    
                    <div id="genStatus" style="font-size:0.75rem; color:#888; margin-top:10px; display:none;">Aguardando...</div>
                </div>
            </div>
        </div>
    `;

    if(window.lucide) window.lucide.createIcons();
}

function attachListeners() {
    // Camadas
    document.getElementById('btnAddLayer').addEventListener('click', () => {
        const name = prompt("Nome da Camada (ex: Eyes, Mouth):");
        if(name) addLayer(name);
    });

    // Upload
    document.getElementById('btnUploadTrait').addEventListener('click', () => {
        document.getElementById('hiddenUpload').click();
    });
    document.getElementById('hiddenUpload').addEventListener('change', handleFileUpload);

    // Preview Único
    document.getElementById('btnRandomize').addEventListener('click', generateSinglePreview);

    // Preview em Massa (Novo)
    document.getElementById('btnPreviewBatch').addEventListener('click', generateBatchPreview);
    document.getElementById('btnCloseResults').addEventListener('click', () => {
        document.getElementById('resultsOverlay').style.display = 'none';
    });

    // Download Final
    document.getElementById('btnGenerateZip').addEventListener('click', generateCollectionZip);
}

// --- Gerenciamento de Camadas ---

function addLayer(name) {
    const newLayer = { id: Date.now(), name: name, traits: [] };
    studioState.layers.unshift(newLayer); // Adiciona no topo da lista (Fundo visualmente)
    setActiveLayer(newLayer.id);
    renderLayersList();
}

function setActiveLayer(layerId) {
    studioState.activeLayerId = layerId;
    renderLayersList();
    renderWorkspace();
}

function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    if(files.length === 0 || !studioState.activeLayerId) return;

    let loaded = 0;
    files.forEach(file => {
        if(!file.type.match('image.*')) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                addTraitToLayer(studioState.activeLayerId, ev.target.result, file.name.split('.')[0], img);
                loaded++;
                if(loaded === files.length) {
                    renderWorkspace();
                    generateSinglePreview();
                }
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });
    e.target.value = '';
}

function addTraitToLayer(layerId, base64, name, imgObj) {
    const layer = studioState.layers.find(l => l.id === layerId);
    if(layer) layer.traits.push({ id: Date.now()+Math.random(), name, base64, imgObj });
}

function deleteTrait(layerId, traitId) {
    const layer = studioState.layers.find(l => l.id === layerId);
    if(layer) {
        layer.traits = layer.traits.filter(t => t.id !== traitId);
        renderWorkspace();
    }
}

// --- Renderização UI ---

function renderLayersList() {
    const list = document.getElementById('layersList');
    list.innerHTML = '';
    
    // A ordem de desenho é inversa à ordem da lista visual
    studioState.layers.forEach((layer, idx) => {
        const isActive = layer.id === studioState.activeLayerId;
        const item = document.createElement('div');
        item.className = `layer-item ${isActive ? 'active' : ''}`;
        item.innerHTML = `
            <span>${layer.name}</span>
            <span class="badge">${layer.traits.length}</span>
        `;
        item.addEventListener('click', () => setActiveLayer(layer.id));
        list.appendChild(item);
    });
}

function renderWorkspace() {
    const activeLayer = studioState.layers.find(l => l.id === studioState.activeLayerId);
    const tools = document.getElementById('layerTools');
    const empty = document.getElementById('emptyStateWorkspace');
    const title = document.getElementById('activeLayerTitle');
    const grid = document.getElementById('traitGrid');
    const count = document.getElementById('activeLayerCount');

    if(!activeLayer) {
        tools.style.display = 'none'; empty.style.display = 'block'; grid.innerHTML = '';
        return;
    }

    tools.style.display = 'flex'; empty.style.display = 'none';
    title.innerText = activeLayer.name;
    count.innerText = `${activeLayer.traits.length} arquivos`;

    grid.innerHTML = activeLayer.traits.map(t => `
        <div class="trait-card">
            <button class="btn-delete-trait" data-l="${activeLayer.id}" data-t="${t.id}"><i data-lucide="trash-2" style="width:14px;"></i></button>
            <div class="trait-img-box"><img src="${t.base64}"></div>
            <div class="trait-info">${t.name}</div>
        </div>
    `).join('');

    grid.querySelectorAll('.btn-delete-trait').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTrait(Number(btn.dataset.l), Number(btn.dataset.t));
        });
    });
    if(window.lucide) window.lucide.createIcons();
}

// --- Lógica de Geração ---

function generateSinglePreview() {
    const { ctx, previewCanvas } = studioState;
    ctx.clearRect(0,0, previewCanvas.width, previewCanvas.height);

    // Desenha do Fundo para Frente (Inverte array de camadas)
    const layersToDraw = [...studioState.layers].reverse();

    layersToDraw.forEach(layer => {
        if(layer.traits.length === 0) return;
        const rand = Math.floor(Math.random() * layer.traits.length);
        const trait = layer.traits[rand];
        ctx.drawImage(trait.imgObj, 0, 0, previewCanvas.width, previewCanvas.height);
    });
}

// GERA UMA AMOSTRA DE 20 ITENS PARA O USUÁRIO VER
async function generateBatchPreview() {
    const overlay = document.getElementById('resultsOverlay');
    const grid = document.getElementById('resultsGrid');
    
    // Validação
    if(studioState.layers.some(l => l.traits.length === 0)) {
        return bus.emit('notification:error', "Preencha todas as camadas com imagens.");
    }

    overlay.style.display = 'flex';
    grid.innerHTML = '<div style="color:#fff; padding:20px;">Gerando amostra...</div>';

    const sampleSize = 20;
    let html = '';

    // Usa um canvas temporário offscreen
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 512; // Resolução menor para preview rápido
    offCanvas.height = 512;
    const offCtx = offCanvas.getContext('2d');
    const layersToDraw = [...studioState.layers].reverse();

    for(let i=1; i<=sampleSize; i++) {
        offCtx.clearRect(0,0,512,512);
        
        layersToDraw.forEach(layer => {
            if(layer.traits.length > 0) {
                const rand = Math.floor(Math.random() * layer.traits.length);
                const trait = layer.traits[rand];
                offCtx.drawImage(trait.imgObj, 0, 0, 512, 512);
            }
        });

        // Converte para base64 thumb
        const thumb = offCanvas.toDataURL('image/jpeg', 0.7);
        html += `
            <div class="gen-item">
                <img src="${thumb}">
                <div class="gen-item-meta">#${i}</div>
            </div>
        `;
    }

    grid.innerHTML = html;
}

// GERA O ZIP FINAL PADRÃO OPENSEA
async function generateCollectionZip() {
    if(typeof JSZip === 'undefined') {
        return bus.emit('notification:error', "Erro: JSZip não carregado.");
    }

    const qty = parseInt(document.getElementById('collectionSize').value);
    const btn = document.getElementById('btnGenerateZip');
    const status = document.getElementById('genStatus');
    
    if(qty < 1) return;
    if(studioState.layers.some(l => l.traits.length === 0)) {
        return bus.emit('notification:error', "Camadas vazias detectadas!");
    }

    try {
        btn.disabled = true;
        status.style.display = 'block';
        status.innerText = "Inicializando...";

        const zip = new JSZip();
        // OpenSea recomenda estrutura plana, mas pastas organizam melhor
        // Vamos criar pastas 'images' e 'metadata'
        const imgFolder = zip.folder("images");
        const metaFolder = zip.folder("metadata"); // Importante para OpenSea

        const layersToDraw = [...studioState.layers].reverse();
        const { ctx, previewCanvas } = studioState;

        for(let i=1; i<=qty; i++) {
            ctx.clearRect(0,0, previewCanvas.width, previewCanvas.height);
            let attributes = [];

            // Desenha e coleta atributos
            layersToDraw.forEach(layer => {
                const rand = Math.floor(Math.random() * layer.traits.length);
                const trait = layer.traits[rand];
                
                ctx.drawImage(trait.imgObj, 0, 0, previewCanvas.width, previewCanvas.height);
                
                // Padrão OpenSea de Metadados
                attributes.push({
                    "trait_type": layer.name,
                    "value": trait.name
                });
            });

            // 1. Salva Imagem
            await new Promise(resolve => {
                previewCanvas.toBlob(blob => {
                    imgFolder.file(`${i}.png`, blob);
                    resolve();
                }, 'image/png');
            });

            // 2. Cria JSON (OpenSea Standard)
            const metadata = {
                "name": `NFT #${i}`,
                "description": "Generated with Arc Shield Studio",
                "image": `ipfs://YOUR_CID_HERE/${i}.png`, // Usuário deve substituir isso ao subir no Pinata
                "attributes": attributes
            };
            
            // O arquivo deve ser apenas o número (ex: '1' ou '1.json')
            // Pinata geralmente pede '1.json' ou apenas '1' para pastas
            metaFolder.file(`${i}.json`, JSON.stringify(metadata, null, 2));

            // Feedback Visual a cada 5%
            if(i % Math.ceil(qty/20) === 0) {
                status.innerText = `Gerando... ${Math.round((i/qty)*100)}%`;
                await new Promise(r => setTimeout(r, 0));
            }
        }

        status.innerText = "Compactando ZIP...";
        const content = await zip.generateAsync({type:"blob"});
        saveAs(content, "Arc_Collection_OpenSea_Ready.zip");
        
        bus.emit('notification:success', "Download iniciado! Extraia e suba no Pinata.");
        status.innerText = "Concluído!";

    } catch(e) {
        console.error(e);
        bus.emit('notification:error', "Erro: " + e.message);
    } finally {
        btn.disabled = false;
    }
}
