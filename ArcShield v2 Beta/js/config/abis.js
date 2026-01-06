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
        "function locks(uint256) view returns (address owner, address token, uint256 amount, uint256 unlockTime, bool withdrawn)"
    ],
    vest: [
        "function createVestingSchedule(address, address, uint256, uint256, uint256, uint256, bool) external",
        "function release(uint256) external",
        "function getUserScheduleCount(address) view returns (uint256)"
    ],
    erc20: [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function balanceOf(address) view returns (uint256)"
    ],
    // Adicionei esta função genérica para o Studio e Managers
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