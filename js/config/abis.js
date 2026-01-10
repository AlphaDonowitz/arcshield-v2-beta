export const ABIS = {
    tokenFactory: [
        "function createToken(string name, string symbol, uint256 initialSupply) external returns (address)",
        "event TokenCreated(address indexed contractAddress, string name, string symbol, string typeStr, address indexed owner, uint256 initialSupply)"
    ],
    nftFactory: [
        "function createNFTCollection(string name, string symbol, uint256 maxSupply, uint256 mintPrice) external returns (address)",
        "event CollectionCreated(address indexed contractAddress, string name, string symbol, string typeStr, address indexed owner, uint256 maxSupply, uint256 cost)"
    ],
    multi: [
        "function multisendToken(address token, address[] recipients, uint256[] amounts) external payable"
    ],
    lock: [
        "function lockTokens(address _token, uint256 _amount, uint256 _unlockTime) external",
        "function withdraw(uint256 _lockId) external",
        "function lockIdCounter() view returns (uint256)",
        "function getLocksByOwner(address _owner) view returns (tuple(uint256 id, address owner, address token, uint256 amount, uint256 unlockTime, bool withdrawn)[])",
        "function getLockDetails(uint256 _lockId) view returns (address owner, address token, uint256 amount, uint256 unlockTime, bool withdrawn)"
    ],
    vest: [
        "function createVestingSchedule(address, address, uint256, uint256, uint256, uint256, bool) external",
        "function release(uint256) external",
        "function getUserScheduleCount(address) view returns (uint256)"
    ],
    erc20: [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
    ],
    nftStandard: [
        "function totalSupply() view returns (uint256)",
        "function currentPhase() view returns (uint8)",
        "function setPhase(uint8) external",
        "function withdraw() external",
        "function setMerkleRoot(bytes32) external",
        "function mintPublic(uint256) external payable",
        "function mintPrice() view returns (uint256)"
    ]
};
js/config/tokenData.js
Contém o Bytecode e a ABI para o deploy direto de tokens ERC20 estáveis.
export const ERC20_ABI = [
    "constructor(string memory name, string memory symbol, uint256 initialSupply)",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function transfer(address to, uint256 value) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 value) returns (bool)",
    "function transferFrom(address from, address to, uint256 value) returns (bool)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

export const ERC20_BYTECODE = "0x608060405234801561001057600080fd5b50604051610c5e380380610c5e8339810160405261003391610058565b610b8a565b600080fd5b600080fd5b61006d8161005b565b811461007857600080fd5b50565b60008135905061008a81610064565b92915050565b6000819050919050565b6100a381610090565b81146100ae57600080fd5b50565b6000813590506100c081610099565b92915050565b600080fd5b600080fd5b6100d88161005b565b81146100e357600080fd5b50565b6000813590506100f5816100cf565b92915050565b600080fd5b6000819050919050565b61011381610090565b811461011e57600080fd5b50565b60008135905061013081610109565b92915050565b600080fd5b6000819050919050565b61014981610090565b811461015457600080fd5b50565b6000813590506101668161013f565b92915050565b600080fd5b600080fd5b61017e8161005b565b811461018957600080fd5b50565b60008135905061019b81610175565b92915050565b600080fd5b6000819050919050565b6101b481610090565b81146101bf57600080fd5b50565b6000813590506101d1816101aa565b92915050565b600080fd5b600080fd5b6101e98161005b565b81146101f457600080fd5b50565b600081359050610206816101e0565b92915050565b600080fd5b600080fd5b61021e8161005b565b811461022957600080fd5b50565b60008135905061023b81610215565b92915050565b600080fd5b6000819050919050565b61025481610090565b811461025f57600080fd5b50565b6000813590506102718161024a565b92915050565b600080fd5b6000819050919050565b61028a81610090565b811461029557600080fd5b50565b6000813590506102a781610280565b92915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061030357607f821691505b6020821081141561031c5761031b6102bd565b5b50919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b6000610357826102d9565b9150610362836102d9565b925082820190508181101561037657610375610322565b5b9392505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601260045260246000fd5b60006103b4826102d9565b91506103bf836102d9565b92508282039050818111156103d4576103d361037f565b5b9392505050565b60006103e682610090565b9050919050565b60006103f8826103db565b9050919050565b61040881610090565b82525050565b600060208201905061042360008301846103ff565b92915050565b600080604083850312156104405761043f61005b565b5b600061044e858286016103ec565b925050602061045f858286016103ec565b9150509250929050565b600081519050919050565b600082825260208201905092915050565b60005b8381101561049b578082015181840152602081019050610480565b60008484015250505050565b6000601f19601f8301169050919050565b60006104c3826104a0565b6104cd81856104ab565b93506104dd81856020860161047b565b6104e681610408565b840191505092915050565b6000602082019050919050565b6000602082019050919050565b600080fd5b6000819050919050565b6000819050919050565b600061053782610090565b9050919050565b6000610549826103db565b9050919050565b600061055b826103db565b9050919050565b600061056c82610522565b9050919050565b600061057e8261052d565b9050919050565b60006020820190506105996000830184610408565b92915050565b60006040820190506105b46000830185610408565b6105c16020830184610408565b9392505050565b600080600080608085870312156105df576105de61005b565b5b60006105ed878288016103ec565b94505060206105fe878288016103ec565b935050604061060f87828801610550565b925050606061062087828801610562565b915050925092509250929050565b600080604083850312156106435761064261005b565b5b6000610651858286016103ec565b925050602061066285828601610550565b9150509250929050565b6000806000606084860312156106825761068161005b565b5b600061069086828701610550565b93505060206106a186828701610562565b92505060406106b2868287016103ec565b915050925092509250929050565b600080604083850312156106ce576106cd61005b565b5b60006106dd85828601610550565b92505060206106ee85828601610550565b915050925092905056608060405260405161001090610077565b604051809103906000f08015801561002c573d6000803e3d6000fd5b505061003981610086565b5050565b604080518082019091526000815260208101825281516001600160a01b03841660601b815260809091018352606490911b1660a082015260c00190565b60405180910390a456fea2646970667358221220a2e584a24c0423b426026a793c12140409c991e1d03c6211f385c57503730e7164736f6c63430008130033";
js/config.js
Configurações de rede, Supabase e endereços de contratos unificados.
import { ABIS as CORE_ABIS } from './config/abis.js';

export const SUPABASE_CONFIG = {
    url: 'https://jfgiiuzqyqjbfaubdhja.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZ2lpdXpxeXFqYmZhdWJkaGphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTk2NzIsImV4cCI6MjA4MTQ3NTY3Mn0.4AZ_FIazsIlP5I_FPpAQh0lkIXRpBwGVfKVG3nwzxWA'
};

export const NETWORKS = {
    ARC: {
        chainId: '0x4cef52', // 5042002 Decimal
        rpc: 'https://rpc.testnet.arc.network',
        explorer: 'https://testnet.arcscan.app',
        name: 'Arc Testnet',
        currency: { name: 'USDC', symbol: 'USDC', decimals: 18 }
    }
};

export const CONTRACTS = {
    tokenFactory: "0x0A16cfAd6f186fc97d8534eF403f1aB9FB94a5BE",
    nftFactory: "0x5139fd59Bd7c023785af99F02b55D2FFEFE8A51A",
    multi: "0x59BcE4bE3e31B14a0528c9249a0580eEc2E59032",
    locker: "0xB56f81bdDd3E53067ed75fCEE9326383c6d0719f",
    vesting: "0xcC8a723917b0258280Ea1647eCDe13Ffa2E1D30b"
};

export const ABIS = {
    ERC20: CORE_ABIS.erc20,
    LOCKER: CORE_ABIS.lock,
    MULTI: CORE_ABIS.multi,
    VESTING: CORE_ABIS.vest,
    NFT_FACTORY: CORE_ABIS.nftFactory,
    TOKEN_FACTORY: CORE_ABIS.tokenFactory
};
