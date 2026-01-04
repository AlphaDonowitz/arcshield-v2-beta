window.ARC_CHAIN_ID = '0x4c9a62'; 
window.ARC_RPC_URL = 'https://rpc.testnet.arc.network';
window.ARC_EXPLORER = 'https://testnet.arcscan.app';

window.CCTP_CONFIG = {
    sepolia: { chainId: '0xaa36a7', rpc: 'https://rpc.sepolia.org', domainId: 0, usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", tokenMessenger: "0xBd3fa81B58Ba92a82136038B25aDec7066af3155" },
    arc: { chainId: '0x4c9a62', domainId: 26, usdc: "0x3600000000000000000000000000000000000000", tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA", messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275" }
};

window.CONTRACTS = { 
    factory: "0x2B1dD3cABF65EbB89E03E3e89cBEadc361A01487", 
    multi: "0x59BcE4bE3e31B14a0528c9249a0580eEc2E59032", 
    lock: "0x4475a197265Dd9c7CaF24Fe1f8cf63B6e9935452", 
    vest: "0xcC8a723917b0258280Ea1647eCDe13Ffa2E1D30b" 
};

window.ABIS = { 
    factory: [
        "function createToken(string name, string symbol, uint256 initialSupply) external returns (address)", 
        "function createNFTCollection(string name, string symbol) external returns (address)",
        "event TokenCreated(address contractAddress, string name, string symbol, string typeStr, address owner)"
    ], 
    multi: ["function multisendToken(address token, address[] recipients, uint256[] amounts) external payable"], 
    lock: ["function lockTokens(address _token, uint256 _amount, uint256 _unlockTime) external", "function withdraw(uint256 _lockId) external", "function locks(uint256) view returns (address owner, address token, uint256 amount, uint256 unlockTime, bool withdrawn)"], 
    vest: ["function createVestingSchedule(address, address, uint256, uint256, uint256, uint256, bool) external", "function release(uint256) external", "function getUserScheduleCount(address) view returns (uint256)", "function getUserScheduleIdAtIndex(address, uint256) view returns (uint256)", "function schedules(uint256) view returns (uint256 scheduleId, address token, address beneficiary, uint256 amountTotal, uint256 released, uint256 start, uint256 duration)"], 
    erc20: ["function approve(address spender, uint256 amount) external returns (bool)", "function decimals() view returns (uint8)", "function symbol() view returns (string)", "function allowance(address owner, address spender) view returns (uint256)", "function balanceOf(address) view returns (uint256)"],
    tokenMessenger: ["function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64 _nonce)"],
    messageTransmitter: ["function receiveMessage(bytes calldata message, bytes calldata attestation) external returns (bool)"]
};

const SUPABASE_URL = 'https://jfgiiuzqyqjbfaubdhja.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZ2lpdXpxeXFqYmZhdWJkaGphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTk2NzIsImV4cCI6MjA4MTQ3NTY3Mn0.4AZ_FIazsIlP5I_FPpAQh0lkIXRpBwGVfKVG3nwzxWA';
try { if (window.supabase) { window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY); } } catch(e) {}
