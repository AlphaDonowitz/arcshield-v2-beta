// ==========================================
// 3. INICIALIZAÇÃO & UI (ROBUSTA)
// ==========================================

// Função para tentar encontrar a biblioteca Web3Auth
async function initWeb3AuthRetry(attempts = 0) {
    if (attempts > 10) {
        console.error("❌ Erro Crítico: Web3Auth não carregou após 10 tentativas.");
        return;
    }

    // Tenta encontrar a classe em vários lugares possíveis (Capitalização varia por versão)
    const Web3AuthConstructor = window.Web3Auth || window.modal?.Web3Auth || window.Modal?.Web3Auth;

    if (Web3AuthConstructor) {
        try {
            web3auth = new Web3AuthConstructor({
                clientId: WEB3AUTH_CLIENT_ID,
                web3AuthNetwork: "sapphire_devnet", // Tenha certeza que no Painel Web3Auth está Devnet
                chainConfig: ARC_CHAIN_CONFIG,
            });

            await web3auth.initModal();
            console.log("✅ Web3Auth Iniciado com Sucesso!");
        } catch (e) {
            console.error("❌ Erro ao configurar Web3Auth:", e);
        }
    } else {
        // Se não achou, espera 500ms e tenta de novo
        console.log(`⏳ Aguardando biblioteca Web3Auth... (Tentativa ${attempts + 1})`);
        setTimeout(() => initWeb3AuthRetry(attempts + 1), 500);
    }
}

// Inicia a busca assim que a janela carregar
window.onload = function() {
    initWeb3AuthRetry();
};
