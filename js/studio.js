// ARC STUDIO 2.0 - LÓGICA MODERNA
window.layers = []; 
window.activeLayerIndex = null;

// 1. GERENCIAMENTO DE CAMADAS (SIDEBAR)
window.studioAddLayer = function() {
    const name = prompt("Nome da Camada (ex: Background, Body, Head):");
    if(!name) return;
    
    window.layers.push({ id: Date.now(), name: name, traits: [] });
    // Seleciona automaticamente a nova camada
    window.activeLayerIndex = window.layers.length - 1;
    renderStudioUI();
}

window.selectLayer = function(index) {
    window.activeLayerIndex = index;
    renderStudioUI();
}

window.deleteLayer = function(index, event) {
    if(event) event.stopPropagation();
    if(confirm("Deletar camada e todas as imagens?")) {
        window.layers.splice(index, 1);
        if(window.activeLayerIndex === index) window.activeLayerIndex = null;
        if(window.activeLayerIndex > index) window.activeLayerIndex--;
        renderStudioUI();
    }
}

// 2. RENDERIZAÇÃO DA UI (LISTA E WORKSPACE)
function renderStudioUI() {
    const list = document.getElementById('layersList');
    const grid = document.getElementById('traitGrid');
    const emptyState = document.getElementById('emptyStateWorkspace');
    const title = document.getElementById('activeLayerTitle');
    const count = document.getElementById('activeLayerCount');

    // Render Sidebar List
    if(window.layers.length === 0) {
        list.innerHTML = `<div style="padding:20px; text-align:center; color:#666; font-size:0.8rem;">Clique em + para adicionar.</div>`;
    } else {
        let html = "";
        window.layers.forEach((l, i) => {
            const isActive = i === window.activeLayerIndex ? 'active' : '';
            html += `
            <div class="layer-item ${isActive}" onclick="selectLayer(${i})">
                <span style="font-weight:500">${i+1}. ${l.name}</span>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span class="layer-count">${l.traits.length}</span>
                    <i data-lucide="trash-2" style="width:14px; cursor:pointer; color:#666;" onclick="deleteLayer(${i}, event)"></i>
                </div>
            </div>`;
        });
        list.innerHTML = html;
    }

    // Render Workspace Grid
    if(window.activeLayerIndex === null) {
        grid.style.display = 'none';
        emptyState.style.display = 'block';
        title.innerText = "Studio";
        count.innerText = "";
    } else {
        grid.style.display = 'grid';
        emptyState.style.display = 'none';
        
        const currentLayer = window.layers[window.activeLayerIndex];
        title.innerText = currentLayer.name;
        count.innerText = `${currentLayer.traits.length} assets`;

        let gridHtml = "";
        
        // Render Traits Cards
        currentLayer.traits.forEach((t, tIndex) => {
            gridHtml += `
            <div class="trait-card">
                <button class="btn-delete-trait" onclick="deleteTrait(${tIndex})"><i data-lucide="x" style="width:14px;"></i></button>
                <div class="trait-img-box"><img src="${t.file}"></div>
                <div class="trait-info">
                    <div class="trait-name" title="${t.name}">${t.name}</div>
                    <div style="display:flex; justify-content:space-between; color:#666; font-size:0.7rem;">
                        <span>Rarity</span>
                        <span id="weightVal_${tIndex}">${t.weight}%</span>
                    </div>
                    <input type="range" class="trait-slider" min="1" max="100" value="${t.weight}" 
                        oninput="document.getElementById('weightVal_${tIndex}').innerText = this.value + '%'"
                        onchange="updateTraitWeight(${tIndex}, this.value)">
                </div>
            </div>`;
        });

        // Add Drop Zone at the end
        gridHtml += `
        <div class="drop-zone" onclick="document.getElementById('hiddenUpload').click()" ondrop="handleDrop(event)" ondragover="event.preventDefault()">
            <i data-lucide="upload-cloud" style="width:32px; height:32px; margin-bottom:10px;"></i>
            <span style="font-size:0.8rem;">Drag images or Click</span>
            <input type="file" id="hiddenUpload" hidden multiple accept="image/png" onchange="handleFiles(this.files)">
        </div>`;

        grid.innerHTML = gridHtml;
    }

    if(window.lucide) window.lucide.createIcons();
}

// 3. MANIPULAÇÃO DE ARQUIVOS (DRAG & DROP)
window.handleDrop = function(e) {
    e.preventDefault();
    if(e.dataTransfer.files) handleFiles(e.dataTransfer.files);
}

window.handleFiles = function(files) {
    if(window.activeLayerIndex === null) return;
    
    Array.from(files).forEach(file => {
        if(!file.type.match('image.*')) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            
            // Adiciona ao layer ativo
            window.layers[window.activeLayerIndex].traits.push({
                file: e.target.result,
                name: file.name.split('.')[0],
                weight: 50,
                imgObj: img
            });
            renderStudioUI();
            studioGeneratePreview(); // Atualiza preview auto
        };
        reader.readAsDataURL(file);
    });
}

window.deleteTrait = function(traitIndex) {
    window.layers[window.activeLayerIndex].traits.splice(traitIndex, 1);
    renderStudioUI();
    studioGeneratePreview();
}

window.updateTraitWeight = function(tIndex, val) {
    window.layers[window.activeLayerIndex].traits[tIndex].weight = parseInt(val);
}

// 4. PREVIEW SYSTEM
window.studioGeneratePreview = function() {
    const canvas = document.getElementById('previewCanvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Desenha em ordem das camadas
    window.layers.forEach(layer => {
        if(layer.traits.length > 0) {
            const trait = pickWeighted(layer.traits);
            if(trait && trait.imgObj) {
                ctx.drawImage(trait.imgObj, 0, 0, canvas.width, canvas.height);
            }
        }
    });
}

function pickWeighted(traits) {
    const total = traits.reduce((sum, t) => sum + t.weight, 0);
    let r = Math.random() * total;
    for(const t of traits) {
        if(r < t.weight) return t;
        r -= t.weight;
    }
    return traits[0];
}

// 5. GERAÇÃO FINAL (ZIP)
window.studioStartGeneration = async function() {
    if(window.layers.length === 0) return alert("Adicione camadas primeiro!");
    
    const count = parseInt(document.getElementById('genCount').value) || 10;
    const res = parseInt(document.getElementById('genRes').value) || 500;
    const bar = document.getElementById('genBar');
    const txt = document.getElementById('genStatusText');
    const pctTxt = document.getElementById('genPct');
    document.getElementById('genProgress').style.display = 'block';

    const zip = new JSZip();
    const folderImg = zip.folder("images");
    const folderMeta = zip.folder("metadata");
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = res; 
    tempCanvas.height = res;
    const ctx = tempCanvas.getContext('2d');

    for(let i = 1; i <= count; i++) {
        ctx.clearRect(0, 0, res, res);
        let attrs = [];
        
        for(const layer of window.layers) {
            if(layer.traits.length > 0) {
                const trait = pickWeighted(layer.traits);
                if(trait && trait.imgObj) {
                    ctx.drawImage(trait.imgObj, 0, 0, res, res);
                    attrs.push({ trait_type: layer.name, value: trait.name });
                }
            }
        }

        // Salvar Blob
        const blob = await new Promise(r => tempCanvas.toBlob(r, 'image/png'));
        folderImg.file(`${i}.png`, blob);
        
        // Metadata
        const meta = { name: `Arc NFT #${i}`, image: `ipfs://CID/${i}.png`, attributes: attrs };
        folderMeta.file(`${i}.json`, JSON.stringify(meta, null, 2));

        // Update UI
        const pct = Math.floor((i / count) * 100);
        bar.style.width = `${pct}%`;
        pctTxt.innerText = `${pct}%`;
        txt.innerText = `Gerando ${i}/${count}...`;
        
        if(i % 5 === 0) await new Promise(r => setTimeout(r, 0));
    }

    txt.innerText = "Compactando ZIP...";
    const content = await zip.generateAsync({type:"blob"});
    saveAs(content, "arc_collection.zip");
    txt.innerText = "Download Iniciado!";
}
