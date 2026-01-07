import { bus } from '../core/eventBus.js';

let studioState = {
    uploadedFiles: [], // Array de objetos File
    collectionName: "Arc Collection",
    collectionDesc: "Created on Arc Shield",
    baseImageCid: "ipfs://REPLACE_WITH_CID" // O usuário substitui depois ou deixamos placeholder
};

export function initStudio() {
    const container = document.getElementById('studio');
    if (!container) return;

    renderStudioUI(container);
    attachListeners();
}

function renderStudioUI(container) {
    container.innerHTML = `
        <div class="studio-wrapper" style="flex-direction:column; overflow:hidden;">
            <div style="padding:20px; border-bottom:1px solid var(--border-color); background:#121215; display:flex; gap:20px; align-items:flex-end;">
                <div style="flex-grow:1; display:flex; gap:15px;">
                    <div style="flex:1;">
                        <label style="font-size:0.8rem; color:#888;">Nome da Coleção</label>
                        <input type="text" id="collName" value="My Arc NFT" placeholder="Ex: Bored Ape" style="width:100%; padding:10px; background:#000; border:1px solid #333; color:#fff; border-radius:4px;">
                    </div>
                    <div style="flex:2;">
                        <label style="font-size:0.8rem; color:#888;">Descrição</label>
                        <input type="text" id="collDesc" value="Exclusive collection on Arc Network" placeholder="Descrição para o OpenSea" style="width:100%; padding:10px; background:#000; border:1px solid #333; color:#fff; border-radius:4px;">
                    </div>
                </div>
                <div>
                    <button class="btn-primary" id="btnExportPackage" disabled>
                        <i data-lucide="package"></i> Gerar Metadados & ZIP
                    </button>
                </div>
            </div>

            <div style="flex-grow:1; display:flex; overflow:hidden;">
                
                <div class="drop-area" id="dropZone">
                    <div style="text-align:center;">
                        <i data-lucide="upload-cloud" style="width:64px; height:64px; color:var(--primary-blue); margin-bottom:15px;"></i>
                        <h3>Arraste sua coleção aqui</h3>
                        <p style="color:#666; margin-bottom:20px;">Ou selecione a pasta com suas imagens prontas (.png, .jpg)</p>
                        <button class="btn-secondary" id="btnSelectFiles">Selecionar Arquivos</button>
                        <input type="file" id="fileInput" multiple hidden accept="image/*">
                    </div>
                </div>

                <div id="previewArea" style="display:none; flex-grow:1; flex-direction:column; padding:20px; overflow-y:auto; background:#09090b;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                        <h4 id="fileCountLabel" style="margin:0;">0 Imagens Carregadas</h4>
                        <button class="btn-secondary small" id="btnClear"><i data-lucide="trash"></i> Limpar Tudo</button>
                    </div>
                    <div id="imageGrid" class="files-grid"></div>
                </div>
            </div>
            
            <div id="statusFooter" style="padding:10px 20px; background:#000; border-top:1px solid #333; font-size:0.8rem; color:#666; display:none;">
                Pronto.
            </div>
        </div>
    `;

    if(window.lucide) window.lucide.createIcons();
}

function attachListeners() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const btnSelect = document.getElementById('btnSelectFiles');

    // Drag & Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--primary-blue)';
        dropZone.style.background = 'rgba(59, 130, 246, 0.05)';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border-color)';
        dropZone.style.background = 'transparent';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border-color)';
        dropZone.style.background = 'transparent';
        if(e.dataTransfer.files.length > 0) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    });

    // Clique manual
    btnSelect.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if(e.target.files.length > 0) {
            handleFiles(Array.from(e.target.files));
        }
    });

    // Botão Limpar
    document.getElementById('btnClear').addEventListener('click', resetStudio);

    // Botão Exportar
    document.getElementById('btnExportPackage').addEventListener('click', generatePackage);
}

function handleFiles(files) {
    // Filtra apenas imagens
    const images = files.filter(f => f.type.startsWith('image/'));
    
    if(images.length === 0) {
        bus.emit('notification:error', "Nenhuma imagem válida encontrada.");
        return;
    }

    // Ordenação Inteligente (Natural Sort: 1.png, 2.png, 10.png)
    // Isso garante que a ordem dos arquivos no computador seja respeitada
    studioState.uploadedFiles = images.sort((a, b) => {
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    renderGrid();
}

function renderGrid() {
    const dropZone = document.getElementById('dropZone');
    const previewArea = document.getElementById('previewArea');
    const grid = document.getElementById('imageGrid');
    const label = document.getElementById('fileCountLabel');
    const btnExport = document.getElementById('btnExportPackage');

    dropZone.style.display = 'none';
    previewArea.style.display = 'flex';
    btnExport.disabled = false;
    btnExport.classList.add('btn-primary'); // Garante estilo visual
    
    label.innerText = `${studioState.uploadedFiles.length} Imagens Prontas (Sequenciadas)`;

    // Renderiza apenas as primeiras 50 para não travar o navegador se forem 10k imagens
    // Mas processaremos todas no final
    const limit = 50;
    const displayFiles = studioState.uploadedFiles.slice(0, limit);

    grid.innerHTML = displayFiles.map((file, index) => {
        const url = URL.createObjectURL(file);
        return `
            <div class="file-card">
                <div class="img-wrap"><img src="${url}"></div>
                <div class="file-meta">
                    <span class="seq-num">#${index + 1}</span>
                    <span class="file-name">${file.name}</span>
                </div>
            </div>
        `;
    }).join('');

    if(studioState.uploadedFiles.length > limit) {
        grid.innerHTML += `
            <div class="file-card more-card">
                +${studioState.uploadedFiles.length - limit} imagens...
            </div>
        `;
    }
}

function resetStudio() {
    studioState.uploadedFiles = [];
    document.getElementById('previewArea').style.display = 'none';
    document.getElementById('dropZone').style.display = 'flex';
    document.getElementById('btnExportPackage').disabled = true;
    document.getElementById('fileInput').value = '';
}

async function generatePackage() {
    if(typeof JSZip === 'undefined') {
        return bus.emit('notification:error', "Erro: Biblioteca JSZip não carregada.");
    }

    const name = document.getElementById('collName').value || "Arc Collection";
    const desc = document.getElementById('collDesc').value || "";
    const status = document.getElementById('statusFooter');
    const btn = document.getElementById('btnExportPackage');

    try {
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Processando...`;
        status.style.display = 'block';
        status.innerText = "Iniciando empacotamento...";

        const zip = new JSZip();
        const imgFolder = zip.folder("images");
        const metaFolder = zip.folder("metadata");

        // Loop principal
        for (let i = 0; i < studioState.uploadedFiles.length; i++) {
            const file = studioState.uploadedFiles[i];
            const tokenId = i + 1; // IDs começam em 1 no padrão ERC721
            const extension = file.name.split('.').pop();
            
            // 1. Adiciona Imagem renomeada (1.png, 2.png...)
            // Isso normaliza a coleção independente dos nomes originais
            imgFolder.file(`${tokenId}.${extension}`, file);

            // 2. Gera JSON
            const metadata = {
                name: `${name} #${tokenId}`,
                description: desc,
                image: `ipfs://REPLACE_WITH_CID/${tokenId}.${extension}`,
                attributes: [] // Usuário pode adicionar traits genéricos se quiser, deixamos vazio por padrão
            };
            
            // O arquivo deve se chamar apenas o número (ex: "1") para compatibilidade máxima (Pinata/IPFS)
            metaFolder.file(`${tokenId}.json`, JSON.stringify(metadata, null, 2)); // Padrão OpenSea aceita .json
            metaFolder.file(`${tokenId}`, JSON.stringify(metadata, null, 2)); // Padrão puro IPFS (sem extensão)

            // Feedback UI
            if(i % 50 === 0) {
                status.innerText = `Processando item ${tokenId} de ${studioState.uploadedFiles.length}...`;
                await new Promise(r => setTimeout(r, 0));
            }
        }

        status.innerText = "Compactando arquivo ZIP final...";
        const content = await zip.generateAsync({type:"blob"});
        saveAs(content, "Arc_Metadata_Package.zip");

        bus.emit('notification:success', "Pacote gerado! Extraia e suba no IPFS.");
        status.innerText = "Concluído com sucesso.";

    } catch (e) {
        console.error(e);
        bus.emit('notification:error', "Erro: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="package"></i> Gerar Metadados & ZIP`;
        if(window.lucide) window.lucide.createIcons();
    }
}
