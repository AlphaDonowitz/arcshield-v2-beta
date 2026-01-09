import { web3Service } from '../services/web3Service.js';
import { bus } from '../core/eventBus.js';

export function initSidebar() {
    const btn = document.getElementById('btnConnect');
    if (!btn) return;
    
    // 1. Lógica do Clique
    btn.addEventListener('click', async () => {
        if (!web3Service.isConnected) {
            btn.innerText = "Conectando...";
            // Atualizado para usar o novo método do Service unificado
            await web3Service.connectWallet(); 
        } else {
            if(confirm("Deseja desconectar sua carteira?")) {
                web3Service.disconnect();
            }
        }
    });

    // 2. Reação passiva aos eventos do Sistema
    bus.on('wallet:connected', (data) => {
        const short = data.address.slice(0, 6) + "..." + data.address.slice(-4);
        // Atualiza visual do botão para estado 'Conectado'
        btn.innerHTML = `
            <i data-lucide="check-circle" style="color: var(--success-green);"></i> 
            <span style="font-family: var(--font-mono);">${short}</span>
        `;
        btn.style.borderColor = 'var(--success-green)';
        btn.style.background = 'rgba(34, 197, 94, 0.1)';
        
        if(window.lucide) window.lucide.createIcons();
    });

    bus.on('wallet:disconnected', () => {
        // Reseta botão para estado original
        btn.innerHTML = `Connect Wallet`;
        btn.style.borderColor = 'var(--border-color)';
        btn.style.background = '#000';
    });
}
