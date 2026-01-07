export const SUPABASE_CONFIG = {
    url: 'https://seucode.supabase.co',
    key: 'suakey'
};

export const CONTRACTS = {
    // COLOQUE O NOVO ENDEREÇO AQUI VVV
    locker: "COLE_O_NOVO_ENDERECO_AQUI", 
    vesting: "0x0000000000000000000000000000000000000000",
    multisender: "0x0000000000000000000000000000000000000000"
};

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
        "function lockTokens(address _token, uint256 _amount, uint256 _unlockTime)",
        "function withdraw(uint256 _lockId)",
        // A Nova Função Mágica. Note que ela retorna uma struct (tuple)
        "function getLocksByOwner(address _owner) view returns (tuple(uint256 id, address owner, address token, uint256 amount, uint256 unlockTime, bool withdrawn)[])"
    ]
};
