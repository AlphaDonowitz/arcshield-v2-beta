// js/config.js - Configuração Centralizada

import { ABIS as RAW_ABIS } from './config/abis.js';

export const SUPABASE_CONFIG = {
    url: 'https://seucode.supabase.co', // Mantenha sua URL
    key: 'suakey'                       // Mantenha sua Key
};

// Endereços na ARC TESTNET (Chain ID 755)
export const CONTRACTS = {
    // Contrato Locker V2 (Confirmado pelo user)
    locker: "0xB56f81bdDd3E53067ed75fCEE9326383c6d0719f", 
    
    // Deixe como null ou address zero se não tiver deployado ainda
    vesting: "0x0000000000000000000000000000000000000000",
    multi: "0x0000000000000000000000000000000000000000" 
};

// Padronização das ABIs para evitar erros de digitação (UpperCase)
export const ABIS = {
    ERC20: RAW_ABIS.erc20,
    LOCKER: RAW_ABIS.lock,     // Corrige o conflito lock vs LOCKER
    MULTI: RAW_ABIS.multi,
    VESTING: RAW_ABIS.vest,
    NFT_FACTORY: RAW_ABIS.nftFactory,
    TOKEN_FACTORY: RAW_ABIS.tokenFactory
};
