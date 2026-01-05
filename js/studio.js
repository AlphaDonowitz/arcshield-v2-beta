
// ARC STUDIO - MOTOR DE GERAÇÃO DE NFT
window.layers = []; // Estrutura: [{ id, name, traits: [{ file, name, weight, imgObj }] }]

// 1. GERENCIAMENTO DE CAMADAS
window.studioAddLayer = function() {
    const id = Date.now();
    const name = prompt("Nome da Camada (ex: Fundo, Olhos):") || `Layer ${window.layers.length + 1}`;
    
    window.layers.push({ id, name, traits: [] });
    renderLayers();
}

function renderLayers() {
    const list = document.getElementById('layersList');
    if(!list) return;
    
    if(window.layers.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding:20px; border:1px dashed #333; color:#666; border-radius:8px;">Adicione camadas para começar.</div>`;
        return;
    }

    let html = "";
    window.layers.forEach((layer, index) => {
        html += `
        <div class="layer-box">
            <div class="layer-header" onclick="toggleLayerContent(${layer.id})">
                <h4>${index + 1}. ${layer.name} <span style="color:#666; font-size:0.8rem">(${layer.traits.length} itens)</span></h4>
                <div style="display:flex; gap:10px">
                    <button class="btn-icon-only" style="width:24px;height:24px" onclick="event.stopPropagation(); document.getElementById('upload_${layer.id}').click()"><i data-lucide="upload"></i></button>
                    <button class="btn-icon-only" style="width:24px;height:24px;background:#ef4444" onclick="event.stopPropagation(); removeLayer(${index})"><i data-lucide="trash"></i></button>
                </div>
                <input type="file" id="upload_${layer.id}" hidden multiple accept="image/png" onchange="handleTraitUpload(this, ${index})">
            </div>
            <div class="layer-content" id="content_${layer.id}" style="display:none">
                ${layer.traits.map((t, tIndex) => `
                    <div class="trait-item">
                        <img src="${t.file}" class="trait-thumb">
                        <div style="flex-grow:1; margin:0 10px;">
                            <div style="font-size:0.8rem; margin-bottom:4px;">${t.name}</div>
                            <input type="range" min="1" max="100" value="${t.weight}" style="width:100%; height:4px;" onchange="updateWeight(${index}, ${tIndex}, this.value)">
                        </div>
                        <span style="font-size:0.75rem; color:#666; min-width:30px; text-align:right;">${t.weight}%</span>
                    </div>
                `).join('')}
                ${layer.traits.length === 0 ? '<div style="font-size:0.8rem; color:#666; font-style:italic">Nenhuma imagem. Upload PNGs com fundo transparente.</div>' : ''}
            </div>
        </div>`;
    });
    
    list.innerHTML = html;
    if(window.lucide) window.lucide.createIcons();
}

window.toggleLayerContent = function(id) {
    const el = document.getElementById(`content_${id}`);
    if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

window.removeLayer = function(index) {
    if(confirm("Remover esta camada?")) {
        window.layers.splice(index, 1);
        renderLayers();
    }
}

window.handleTraitUpload = function(input, layerIndex) {
    if(input.files) {
        Array.from(input.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                // Salva o objeto de imagem carregado para desenhar rápido depois
                window.layers[layerIndex].traits.push({
                    file: e.target.result,
                    name: file.name.split('.')[0],
                    weight: 50, // Raridade padrão
                    imgObj: img
                });
                renderLayers();
            };
            reader.readAsDataURL(file);
        });
    }
}

window.updateWeight = function(lIndex, tIndex, val) {
    window.layers[lIndex].traits[tIndex].weight = parseInt(val);
    renderLayers(); // Re-renderiza para mostrar o numero atualizado
    // (O ideal seria atualizar só o texto, mas assim é mais seguro pra manter sync)
}

// 2. PREVIEW LÓGICA
window.studioGeneratePreview = function() {
    const canvas = document.getElementById('previewCanvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Limpa
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Para cada camada, escolhe um trait baseado na raridade
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
    // Algoritmo de Roleta Ponderada
    const totalWeight = traits.reduce((sum, t) => sum + t.weight, 0);
    let random = Math.random() * totalWeight;
    
    for(const t of traits) {
        if(random < t.weight) return t;
        random -= t.weight;
    }
    return traits[0]; // Fallback
}

// 3. GERAÇÃO EM MASSA (O PESADO)
window.studioStartGeneration = async function() {
    if(window.layers.length === 0) return alert("Adicione camadas primeiro!");
    
    const count = parseInt(document.getElementById('genCount').value) || 10;
    const res = parseInt(document.getElementById('genRes').value) || 500;
    const btn = document.querySelector('#studio .btn-primary');
    const status = document.getElementById('genStatus');
    const bar = document.getElementById('genProgressBar');
    const container = document.getElementById('genProgress');
    
    btn.disabled = true;
    container.style.display = 'block';
    
    const zip = new JSZip();
    const folderImages = zip.folder("images");
    const folderJson = zip.folder("metadata");
    
    // Canvas temporário na resolução final
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = res;
    tempCanvas.height = res;
    const ctx = tempCanvas.getContext('2d');
    
    // Loop assíncrono para não travar o navegador
    for(let i = 1; i <= count; i++) {
        ctx.clearRect(0, 0, res, res);
        let attributes = [];
        
        // Desenha camadas
        for(const layer of window.layers) {
            if(layer.traits.length > 0) {
                const trait = pickWeighted(layer.traits);
                if(trait && trait.imgObj) {
                    ctx.drawImage(trait.imgObj, 0, 0, res, res);
                    attributes.push({ trait_type: layer.name, value: trait.name });
                }
            }
        }
        
        // 1. Salva Imagem no ZIP
        const blob = await new Promise(r => tempCanvas.toBlob(r, 'image/png'));
        folderImages.file(`${i}.png`, blob);
        
        // 2. Salva Metadata no ZIP (Padrão OpenSea)
        const meta = {
            name: `Arc NFT #${i}`,
            description: "Generated via Arc Studio",
            image: `ipfs://YOUR_CID_HERE/${i}.png`, // Placeholder pro usuário substituir
            attributes: attributes
        };
        folderJson.file(`${i}.json`, JSON.stringify(meta, null, 2));
        
        // Atualiza UI
        const pct = (i / count) * 100;
        bar.style.width = `${pct}%`;
        status.innerText = `Gerando ${i}/${count}...`;
        
        // Pequena pausa para a UI respirar a cada 10 imagens
        if(i % 10 === 0) await new Promise(r => setTimeout(r, 10));
    }
    
    status.innerText = "Compactando ZIP... (Isso pode demorar)";
    const zipBlob = await zip.generateAsync({type:"blob"});
    saveAs(zipBlob, "arc_collection.zip");
    
    status.innerText = "Concluído! Verifique seus downloads.";
    btn.disabled = false;
}
