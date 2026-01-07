// js/config.js - Configurações Centrais Auditadas

export const SUPABASE_CONFIG = {
    url: 'https://seucode.supabase.co',
    key: 'suakey'
};

// Endereços dos Contratos (Base Sepolia)
export const CONTRACTS = {
    // Contrato Locker V2 (Otimizado com getLocksByOwner)
    locker: "0xB56f81bdDd3E53067ed75fCEE9326383c6d0719f", 
    
    // Placeholders para módulos futuros
    vesting: "0x0000000000000000000000000000000000000000",
    multisender: "0x0000000000000000000000000000000000000000"
};

// Interfaces (ABIs) para interação com Smart Contracts
export const ABIS = {
    // Padrão ERC20 (Para aprovar tokens antes de trancar)
    ERC20: [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)"
    ],

    // Interface Específica do ArcShieldLockerV2
    LOCKER: [
        // Funções de Escrita
        "function lockTokens(address _token, uint256 _amount, uint256 _unlockTime)",
        "function withdraw(uint256 _lockId)",

        // Nova Função Otimizada (Traz tudo de uma vez)
        // Retorna um array de structs (tuples)
        "function getLocksByOwner(address _owner) view returns (tuple(uint256 id, address owner, address token, uint256 amount, uint256 unlockTime, bool withdrawn)[])"
    ]
};
