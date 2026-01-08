// js/config/tokenData.js

export const tokenAbi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function approve(address, uint256) returns (bool)",
    "function allowance(address, address) view returns (uint256)",
    "function transfer(address to, uint256 value) returns (bool)",
    "function transferFrom(address from, address to, uint256 value) returns (bool)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// O Bytecode abaixo deve ser a string HEX completa (sem '...').
// Certifique-se de que copiou o código inteiro da outra aba.
export const tokenBytecode = "0x608060405234801561001057600080fd5b50604051610c5e380380610c5e8339810160405261003391610058565b610b8a565b600080fd5b600080fd5b61006d8161005b565b811461007857600080fd5...";
