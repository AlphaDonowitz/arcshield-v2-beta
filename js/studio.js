// ARC STUDIO 2.0 - LÓGICA MODERNA COM IA
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
    const tools = document.getElementById('layerTools');

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
        tools.style.display = 'none';
    } else {
        grid.style.display = 'grid';
        emptyState.style.display = 'none';
        tools.style.display = 'flex';
        
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

        grid.innerHTML = gridHtml;
    }

    if(window.lucide) window.lucide.createIcons();
}

// 3. MANIPULAÇÃO DE ARQUIVOS (DRAG & DROP)
window.handleFiles = function(files) {
    if(window.activeLayerIndex === null) return;
    
    Array.from(files).forEach(file => {
        if(!file.type.match('image.*')) return;
        const reader = new FileReader();
        reader.onload = (e) => { addTraitToLayer(e.target.result, file.name.split('.')[0]); };
        reader.readAsDataURL(file);
    });
}

function addTraitToLayer(base64Data, name) {
    const img = new Image();
    img.src = base64Data;
    img.crossOrigin = "Anonymous"; // Importante para IA
    window.layers[window.activeLayerIndex].traits.push({
        file: base64Data,
        name: name,
        weight: 50,
        imgObj: img
    });
    renderStudioUI();
    studioGeneratePreview();
}

window.deleteTrait = function(traitIndex) {
    window.layers[window.activeLayerIndex].traits.splice(traitIndex, 1);
    renderStudioUI();
    studioGeneratePreview();
}

window.updateTraitWeight = function(tIndex, val) {
    window.layers[window.activeLayerIndex].traits[tIndex].weight = parseInt(val);
}

// --- INTEGRAÇÃO COM IA (NOVO) ---
window.openAiGenerator = function() {
    document.getElementById('aiResultArea').style.display = 'none';
    document.getElementById('aiPrompt').value = "";
    document.getElementById('aiDialog').showModal();
}

window.runAiGeneration = function() {
    const prompt = document.getElementById('aiPrompt').value;
    if(!prompt) return alert("Digite um prompt!");
    
    const btn = document.getElementById('btnGenerateAi');
    const img = document.getElementById('aiResultImg');
    const area = document.getElementById('aiResultArea');
    
    btn.innerText = "Gerando (Aguarde)...";
    btn.disabled = true;
    
    // Usa Pollinations.ai (Free, No-Key)
    // Adicionamos seed aleatoria para sempre mudar
    const seed = Math.floor(Math.random() * 9999);
    const safePrompt = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${safePrompt}?seed=${seed}&width=500&height=500&nologo=true`;
    
    img.onload = function() {
        btn.innerText = "Gerar Imagem";
        btn.disabled = false;
        area.style.display = 'block';
    };
    img.onerror = function() {
        alert("Erro ao gerar imagem. Tente outro termo.");
        btn.innerText = "Gerar Imagem";
        btn.disabled = false;
    };
    
    img.crossOrigin = "Anonymous"; // Crucial para permitir salvar depois
    img.src = url;
}

window.useAiImage = function(imgElement) {
    if(window.activeLayerIndex === null) return alert("Selecione uma camada primeiro!");
    
    // Converter para Base64 local para evitar problemas futuros de CORS
    const canvas = document.createElement('canvas');
    canvas.width = imgElement.naturalWidth;
    canvas.height = imgElement.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgElement, 0, 0);
    
    try {
        const dataUrl = canvas.toDataURL('image/png');
        addTraitToLayer(dataUrl, "AI_Generated_" + Date.now());
        document.getElementById('aiDialog').close();
    } catch(e) {
        alert("Erro de segurança do navegador (CORS). Tente fazer upload manual.");
    }
}

// 4. PREVIEW SYSTEM
window.studioGeneratePreview = function() {
    const canvas = document.getElementById('previewCanvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
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

        const blob = await new Promise(r => tempCanvas.toBlob(r, 'image/png'));
        folderImg.file(`${i}.png`, blob);
        
        const meta = { name: `Arc NFT #${i}`, image: `ipfs://CID/${i}.png`, attributes: attrs };
        folderMeta.file(`${i}.json`, JSON.stringify(meta, null, 2));

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
