import { bus } from '../core/eventBus.js';

let studioState = { uploadedFiles: [], name: "Arc Collection" };

export function initStudio() {
    const container = document.getElementById('studio');
    if (!container) return;
    container.innerHTML = `
        <div class="studio-wrapper">
            <div class="drop-area" id="dropZone">
                <h3>NFT Drop Manager</h3>
                <p>Arraste suas imagens prontas aqui.</p>
                <button id="btnSelectFiles" class="btn-secondary">Selecionar Arquivos</button>
                <input type="file" id="fileInput" multiple style="display:none">
            </div>
            <div id="previewArea" style="display:none; padding: 20px; width:100%">
                <input type="text" id="collName" placeholder="Nome da Coleção">
                <p id="fileCountLabel"></p>
                <div id="imageGrid" class="files-grid"></div>
                <button id="btnExportPackage" class="btn-primary mt-4">Gerar Metadados & ZIP</button>
            </div>
        </div>
    `;
    attachStudioEvents();
}

function attachStudioEvents() {
    const drop = document.getElementById('dropZone');
    const input = document.getElementById('fileInput');
    
    drop.ondragover = (e) => { e.preventDefault(); drop.style.borderColor = 'var(--primary-blue)'; };
    drop.ondragleave = () => { drop.style.borderColor = 'var(--border-color)'; };
    drop.ondrop = (e) => { e.preventDefault(); handleFiles(Array.from(e.dataTransfer.files)); };
    
    document.getElementById('btnSelectFiles').onclick = () => input.click();
    input.onchange = (e) => handleFiles(Array.from(e.target.files));
    document.getElementById('btnExportPackage').onclick = generateZIP;
}

function handleFiles(files) {
    const images = files.filter(f => f.type.startsWith('image/')).sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
    if (images.length === 0) return;
    studioState.uploadedFiles = images;
    document.getElementById('dropZone').style.display = 'none';
    document.getElementById('previewArea').style.display = 'block';
    document.getElementById('fileCountLabel').innerText = `${images.length} Imagens Detectadas.`;
    
    const grid = document.getElementById('imageGrid');
    grid.innerHTML = images.slice(0, 10).map((f, i) => `<div class="file-card">#${i+1} - ${f.name}</div>`).join('');
}

async function generateZIP() {
    const zip = new JSZip();
    const imgFolder = zip.folder("images");
    const metaFolder = zip.folder("metadata");
    const collName = document.getElementById('collName').value || "Arc Collection";

    studioState.uploadedFiles.forEach((file, i) => {
        const id = i + 1;
        const ext = file.name.split('.').pop();
        imgFolder.file(`${id}.${ext}`, file);
        const meta = { name: `${collName} #${id}`, image: `ipfs://CID/${id}.${ext}`, attributes: [] };
        metaFolder.file(`${id}.json`, JSON.stringify(meta, null, 2));
    });

    const content = await zip.generateAsync({type:"blob"});
    saveAs(content, "ArcShield_Drop_Package.zip");
    bus.emit('notification:success', "Download Iniciado!");
}
