// Configurações da Rede Arc e Sepolia
export const NETWORKS = {
    ARC: {
        chainId: '0x4c9a62',
        rpc: 'https://rpc.testnet.arc.network',
        explorer: 'https://testnet.arcscan.app',
        name: 'Arc Testnet',
        currency: { name: 'Arc', symbol: 'ARC', decimals: 18 }
    },
    SEPOLIA: {
        chainId: '0xaa36a7',
        rpc: 'https://rpc.sepolia.org',
        explorer: 'https://sepolia.etherscan.io'
    }
};

// Endereços de Contratos (V15.0)
export const CONTRACTS = {
    tokenFactory: "0x0A16cfAd6f186fc97d8534eF403f1aB9FB94a5BE",
    nftFactory: "0x5139fd59Bd7c023785af99F02b55D2FFEFE8A51A",
    multi: "0x59BcE4bE3e31B14a0528c9249a0580eEc2E59032",
    lock: "0x4475a197265Dd9c7CaF24Fe1f8cf63B6e9935452",
    vest: "0xcC8a723917b0258280Ea1647eCDe13Ffa2E1D30b"
};

// Supabase Keys
export const SUPABASE_CONFIG = {
    url: 'https://jfgiiuzqyqjbfaubdhja.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZ2lpdXpxeXFqYmZhdWJkaGphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTk2NzIsImV4cCI6MjA4MTQ3NTY3Mn0.4AZ_FIazsIlP5I_FPpAQh0lkIXRpBwGVfKVG3nwzxWA'
};