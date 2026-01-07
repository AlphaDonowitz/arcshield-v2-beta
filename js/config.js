export const SUPABASE_CONFIG = {
    url: 'https://seucode.supabase.co',
    key: 'suakey'
};

// Endereços (Base Sepolia)
export const CONTRACTS = {
    locker: "0x4475a197265Dd9c7CaF24Fe1f8cf63B6e9935452", // SEU CONTRATO DEPLOYADO
    vesting: "0x0000000000000000000000000000000000000000",
    multisender: "0x0000000000000000000000000000000000000000"
};

// Interfaces (ABIs) Exatas do seu Contrato
export const ABIS = {
    ERC20: [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)"
    ],

    LOCKER: [
        // Função de escrita (Criar bloqueio)
        "function lockTokens(address _token, uint256 _amount, uint256 _unlockTime)",
        
        // Função de escrita (Sacar)
        "function withdraw(uint256 _lockId)",
        
        // Funções de leitura (Para montar o dashboard)
        "function lockIdCounter() view returns (uint256)",
        "function getLockDetails(uint256 _lockId) view returns (address owner, address token, uint256 amount, uint256 unlockTime, bool withdrawn)"
    ]
};
