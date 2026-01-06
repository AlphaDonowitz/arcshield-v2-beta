async disconnect() {
        try {
            // Tenta revogar permissões para forçar o Metamask a pedir senha/conta na próxima vez
            if (window.ethereum) {
                await window.ethereum.request({
                    method: "wallet_revokePermissions",
                    params: [{ eth_accounts: {} }]
                });
            }
        } catch (e) {
            console.warn("Web3: Permissões não puderam ser revogadas (pode ser ignorado)", e);
        }

        this.provider = null;
        this.signer = null;
        this.userAddress = null;
        this.isConnected = false;
        localStorage.removeItem('arcShield_connected');
        
        bus.emit('wallet:disconnected');
        
        // Pequeno delay para garantir que a UI limpe antes de recarregar (opcional, mas bom para UX)
        setTimeout(() => {
            window.location.reload(); 
        }, 500);
    }
