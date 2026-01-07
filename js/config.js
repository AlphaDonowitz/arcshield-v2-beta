// js/config.js - Configurações Centrais Auditadas

// Configuração do Supabase (Persistência Off-Chain)
export const SUPABASE_CONFIG = {
    url: 'https://seucode.supabase.co', // Substitua pela sua URL se tiver
    key: 'suakey'                       // Substitua pela sua Key se tiver
};

// Endereços dos Contratos (Base Sepolia)
export const CONTRACTS = {
    // Contrato Locker Oficial (Deploy Confirmado)
    locker: "0x4475a197265Dd9c7CaF24Fe1f8cf63B6e9935452",
    
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

    // Interface Específica do ArcShieldLocker.sol
    LOCKER: [
        // Funções de Escrita (Gastam Gas)
        "function lockTokens(address _token, uint256 _amount, uint256 _unlockTime)",
        "function withdraw(uint256 _lockId)",

        // Funções de Leitura (View - Não gastam Gas)
        "function lockIdCounter() view returns (uint256)",
        "function getLockDetails(uint256 _lockId) view returns (address owner, address token, uint256 amount, uint256 unlockTime, bool withdrawn)"
    ]
};
