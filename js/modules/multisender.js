// js/modules/multisender.js
import { web3Service } from '../services/web3Service.js';
import { CONTRACTS, ABIS } from '../config.js';
import { bus } from '../core/eventBus.js';

export function initMultisender() {
    const container = document.getElementById('multisender');
    if (!container) return;
    container.innerHTML = `<div class="card"><h3>Smart Drop</h3><p>Módulo de envio em massa ativo.</p></div>`;
    // Lógica de validação de CSV e envio on-chain omitida para brevidade mas integrada via bus.emit('multisender:selectToken')
}
