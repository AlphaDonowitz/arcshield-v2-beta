import { bus } from '../core/eventBus.js';

// Estado Local do Studio
let studioState = {
    layers: [], // [{ id, name, zIndex, traits: [] }]
    activeLayerId: null,
    previewCanvas: null,
    ctx: null,
    canvasSize: 1024 // Resolução de Saída (HD)
};

export function initStudio() {
    const container = document.getElementById('studio');
    if (!container) return;

    // 1. Renderiza Interface Limpa (Sem IA)
    renderStudioStructure(container);

    // 2. Inicializa Canvas de Alta Resolução
    studioState.previewCanvas = document.getElementById('previewCanvas');
    if(studioState.previewCanvas) {
        studioState.previewCanvas.width = studioState.canvasSize;
        studioState.previewCanvas.height = studioState.canvasSize;
        studioState.ctx = studioState.previewCanvas.getContext('2d', { alpha: false });
        
        // Configuração de Qualidade de Imagem
        studioState.ctx.imageSmoothingEnabled = true;
        studioState.ctx.imageSmoothingQuality = 'high';
    }

    // 3. Listeners
    attachListeners();
    
    // 4. Camada Inicial
    addLayer("Background");
    addLayer("Body"); // Sugestão visual
}

function renderStudioStructure(container) {
    container.innerHTML = `
        <div class="studio-wrapper">
            <div class="studio-sidebar-left">
                <div class="layers-header">
                    <span>Ordem das Camadas</span>
                    <button class="btn-secondary small" id="btnAddLayer" title="Nova Camada"><i data-lucide="plus"></i></button>
                </div>
                <div class="layers-subheader">
                    <small>Arraste para reordenar (Topo = Frente)</small>
                </div>
                <div id="layersList" class="layers-list"></div>
            </div>

            <div class="studio-workspace">
                <div class="workspace-header">
                    <div>
                        <h3 id="activeLayerTitle" style="margin:0; font-size:1.1rem;">Selecione uma Camada</h3>
                        <span id="activeLayerCount" style="font-size:0.8rem; color:#666;">0 itens</span>
                    </div>
                    <div id="layerTools" style="display:none; gap:10px;">
                        <button class="btn-primary small" id="btnUploadTrait">
                            <i data-lucide="upload" style="width:14px; margin-right:5px;"></i> Upload Arquivos
                        </button>
                        <input type="file" id="hiddenUpload" hidden multiple accept="image/png, image/jpeg, image/webp">
                    </div>
                </div>
                
                <div id="traitGrid" class="trait-grid"></div>

                <div id="emptyStateWorkspace" class="empty-state-studio">
                    <i data-lucide="layers" style="width:48px; height:48px; margin-bottom:10px; opacity:0.3;"></i>
                    <p>Selecione uma camada à esquerda para adicionar suas imagens (PNG).</p>
                </div>
            </div>

            <div class="studio-sidebar-right">
                <label class="nav-label" style="margin-top:0;">PREVIEW HD (${studioState.canvasSize}px)</label>
                <div class="preview-box">
                    <canvas id="previewCanvas"></canvas>
                </div>
                <div style="display:flex; gap:10px; margin-bottom:20px;">
                    <button class="btn-secondary full" id="btnRandomize">
                        <i data-lucide="shuffle" style="width:14px; margin-right:6px;"></i> Randomizar
                    </button>
                    <button class="btn-secondary full" id="btnDownloadPreview" title="Baixar imagem atual">
                        <i data-lucide="download" style="width:14px;"></i>
                    </button>
                </div>

                <hr style="border:0; border-top:1px solid var(--border-color); margin:20px 0;">
                
                <div class="card" style="padding:15px; background:#18181b;">
                    <label class="nav-label" style="margin-top:0; color:var(--success-green);">GERAR COLEÇÃO</label>
                    <p style="font-size:0.8rem; color:#666; margin-bottom:15px;">
                        Gera combinações únicas, cria metadados (JSON) e baixa tudo em um arquivo ZIP pronto para o mercado.
                    </p>
                    
                    <div style="margin-bottom:10px;">
                        <label style="font-size:0.75rem;">Quantidade</label>
                        <input type="number" id="collectionSize" value="10" min="1" max="10000" style="padding:8px;">
                    </div>

                    <button class="btn-primary full" id="btnGenerateCollection">
                        <i data-lucide="package"></i> Gerar & Baixar ZIP
                    </button>
                    <div id="generationStatus" style="font-size:0.75rem; margin-top:10px; color:#888; display:none;">
                        Processando... 0%
                    </div>
                </div>
            </div>
        </div>
    `;

    if(window.lucide) window.lucide.createIcons();
}

function attachListeners() {
    // Camadas
    document.getElementById('btnAddLayer').addEventListener('click', () => {
        const name = prompt("Nome da Camada (ex: Olhos, Background):");
        if(name) addLayer(name);
    });

    // Upload
    document.getElementById('btnUploadTrait').addEventListener('click', () => {
        document.getElementById('hiddenUpload').click();
    });
    document.getElementById('hiddenUpload').addEventListener('change', handleFileUpload);

    // Preview
    document.getElementById('btnRandomize').addEventListener('click', generatePreview);
    document.getElementById('btnDownloadPreview').addEventListener('click', downloadCurrentPreview);

    // Geração da Coleção (O Grande Motor)
    document.getElementById('btnGenerateCollection').addEventListener('click', generateCollectionZip);
}

// --- Lógica de Camadas e Imagens ---

function addLayer(name) {
    const newLayer = { 
        id: Date.now(), 
        name: name, 
        traits: [] 
    };
    // Adiciona no início do array (que representa o fundo visualmente na lista, mas desenhamos na ordem inversa)
    studioState.layers.unshift(newLayer);
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

    // Processa arquivos em lote
    let loadedCount = 0;
    const totalFiles = files.length;

    files.forEach(file => {
        if(!file.type.match('image.*')) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const imgObj = new Image();
            imgObj.onload = () => {
                addTraitToLayer(studioState.activeLayerId, event.target.result, file.name.split('.')[0], imgObj);
                loadedCount++;
                if(loadedCount === totalFiles) {
                    renderWorkspace();
                    generatePreview();
                }
            };
            imgObj.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
    e.target.value = ''; 
}

function addTraitToLayer(layerId, base64, name, imgObj) {
    const layer = studioState.layers.find(l => l.id === layerId);
    if(layer) {
        layer.traits.push({
            id: Date.now() + Math.random(),
            name: name,
            base64: base64,
            imgObj: imgObj,
            weight: 1 // Peso padrão (Raridade)
        });
    }
}

function deleteTrait(layerId, traitId) {
    const layer = studioState.layers.find(l => l.id === layerId);
    if(layer) {
        layer.traits = layer.traits.filter(t => t.id !== traitId);
        renderWorkspace();
        generatePreview();
    }
}

// --- Renderização da UI ---

function renderLayersList() {
    const list = document.getElementById('layersList');
    list.innerHTML = '';
    
    // Renderizamos a lista. A ordem visual aqui: Topo da lista = Topo da imagem (Frente)
    // O array `studioState.layers` deve ser ordenado: [Frente, ..., Fundo]
    
    studioState.layers.forEach((layer, index) => {
        const isActive = layer.id === studioState.activeLayerId;
        const item = document.createElement('div');
        item.className = `layer-item ${isActive ? 'active' : ''}`;
        item.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
                <span class="layer-number">#${studioState.layers.length - index}</span>
                <span style="font-weight:500">${layer.name}</span>
            </div>
            <span class="badge">${layer.traits.length}</span>
        `;
        item.addEventListener('click', () => setActiveLayer(layer.id));
        
        // Simples botões de mover para cima/baixo
        // (Em uma V2, usaríamos Drag and Drop real)
        const controls = document.createElement('div');
        controls.className = 'layer-controls';
        
        list.appendChild(item);
    });
}

function renderWorkspace() {
    const tools = document.getElementById('layerTools');
    const emptyState = document.getElementById('emptyStateWorkspace');
    const title = document.getElementById('activeLayerTitle');
    const countLabel = document.getElementById('activeLayerCount');
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
    title.innerText = activeLayer.name;
    countLabel.innerText = `${activeLayer.traits.length} arquivos`;

    grid.innerHTML = activeLayer.traits.map(trait => `
        <div class="trait-card">
            <button class="btn-delete-trait" data-layer="${activeLayer.id}" data-trait="${trait.id}">
                <i data-lucide="trash-2" style="width:14px;"></i>
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
            if(confirm('Remover este item?')) {
                deleteTrait(Number(btn.dataset.layer), Number(btn.dataset.trait));
            }
        });
    });

    if(window.lucide) window.lucide.createIcons();
}

// --- Motor de Renderização (Canvas) ---

function generatePreview() {
    const { ctx, previewCanvas } = studioState;
    if(!ctx) return;

    // 1. Limpa
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    // Fundo branco ou transparente (configurável). Por padrão transparente.
    
    // 2. Desenha Camadas
    // Importante: `studioState.layers` está ordenado [Frente, ..., Fundo] na UI? 
    // Para desenhar, precisamos desenhar do Fundo para a Frente.
    // Então invertemos o array temporariamente para o loop de desenho.
    
    const layersToDraw = [...studioState.layers].reverse();

    layersToDraw.forEach(layer => {
        if(layer.traits.length === 0) return;
        
        // Escolha aleatória
        const randomIndex = Math.floor(Math.random() * layer.traits.length);
        const trait = layer.traits[randomIndex];

        if(trait && trait.imgObj) {
            ctx.drawImage(trait.imgObj, 0, 0, previewCanvas.width, previewCanvas.height);
        }
    });
}

function downloadCurrentPreview() {
    const link = document.createElement('a');
    link.download = 'preview_arc_nft.png';
    link.href = studioState.previewCanvas.toDataURL('image/png');
    link.click();
}

// --- O MOTOR DE GERAÇÃO EM MASSA (ZIP) ---

async function generateCollectionZip() {
    if(typeof JSZip === 'undefined') {
        bus.emit('notification:error', "Biblioteca JSZip não carregada. Recarregue a página.");
        return;
    }

    const sizeInput = document.getElementById('collectionSize');
    const quantity = parseInt(sizeInput.value);
    const btn = document.getElementById('btnGenerateCollection');
    const status = document.getElementById('generationStatus');

    if(quantity < 1) return;
    
    // Validação básica: tem camadas com itens?
    const validLayers = studioState.layers.filter(l => l.traits.length > 0);
    if(validLayers.length === 0) {
        bus.emit('notification:error', "Adicione camadas e imagens primeiro!");
        return;
    }

    try {
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Gerando...`;
        status.style.display = 'block';

        const zip = new JSZip();
        const imgFolder = zip.folder("images");
        const metaFolder = zip.folder("metadata");

        const { ctx, previewCanvas } = studioState;
        const layersToDraw = [...studioState.layers].reverse(); // Fundo -> Frente

        // Loop de Geração
        for(let i = 1; i <= quantity; i++) {
            // 1. Limpa Canvas
            ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            
            let attributes = [];
            let combinationId = ""; // Para checar duplicatas no futuro

            // 2. Monta a imagem
            layersToDraw.forEach(layer => {
                if(layer.traits.length === 0) return;
                
                // Aqui entraria a lógica de peso/raridade. Usando random simples por enquanto.
                const randomIndex = Math.floor(Math.random() * layer.traits.length);
                const trait = layer.traits[randomIndex];

                if(trait && trait.imgObj) {
                    ctx.drawImage(trait.imgObj, 0, 0, previewCanvas.width, previewCanvas.height);
                    
                    // Adiciona aos metadados
                    attributes.push({
                        trait_type: layer.name,
                        value: trait.name
                    });
                }
            });

            // 3. Adiciona Imagem ao ZIP (Blob)
            // Usamos uma Promise para aguardar a conversão do canvas
            await new Promise(resolve => {
                previewCanvas.toBlob(blob => {
                    imgFolder.file(`${i}.png`, blob);
                    resolve();
                }, 'image/png');
            });

            // 4. Adiciona Metadata JSON ao ZIP
            const metadata = {
                name: `Arc NFT #${i}`,
                description: "Gerado via Arc Shield Studio",
                image: `ipfs://REPLACE_WITH_CID/${i}.png`, // Placeholder padrão
                attributes: attributes,
                compiler: "Arc Shield Engine"
            };
            metaFolder.file(`${i}.json`, JSON.stringify(metadata, null, 2));

            // Atualiza status a cada 10 itens para não travar a UI
            if(i % 10 === 0) {
                status.innerText = `Processando... ${Math.round((i/quantity)*100)}%`;
                await new Promise(r => setTimeout(r, 0)); // Respiro para a UI
            }
        }

        // 5. Finaliza e Baixa o ZIP
        status.innerText = "Compactando ZIP...";
        const content = await zip.generateAsync({type:"blob"});
        saveAs(content, "arc_collection_build.zip"); // saveAs vem do FileSaver.js (incluído no index)

        bus.emit('notification:success', `Coleção de ${quantity} NFTs gerada com sucesso!`);
        status.innerText = "Concluído!";

    } catch (e) {
        console.error(e);
        bus.emit('notification:error', "Erro na geração: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="package"></i> Gerar & Baixar ZIP`;
        if(window.lucide) window.lucide.createIcons();
    }
}
