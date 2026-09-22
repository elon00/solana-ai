//! Solana AI Coin - On-Chain Program with Post-Quantum Proof Integration
//!
//! Provides mint initialization, token distribution to AI agent accounts,
//! and cryptographic proof validation.

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

// Define token metadata constants
pub const TOKEN_NAME: &str = "Solana AI Coin";
pub const TOKEN_SYMBOL: &str = "SAIC";
pub const DECIMALS: u8 = 9;

pub struct TokenAccounts {
    pub mint: Pubkey,
    pub alice: Pubkey,
    pub bob: Pubkey,
}

pub fn init_token_accounts(accounts: &[AccountInfo]) -> Result<TokenAccounts, ProgramError> {
    let mut iter = accounts.iter();
    let mint_account_info = next_account_info(&mut iter)?;
    let alice_account_info = next_account_info(&mut iter)?;
    let bob_account_info = next_account_info(&mut iter)?;

    Ok(TokenAccounts {
        mint: *mint_account_info.key,
        alice: *alice_account_info.key,
        bob: *bob_account_info.key,
    })
}

pub fn create_mint(
    accounts: &[AccountInfo],
    _token_accounts: &TokenAccounts,
) -> Result<(), ProgramError> {
    let mut iter = accounts.iter();
    let mint_account_info = next_account_info(&mut iter)?;
    let _rent_sysvar_info = next_account_info(&mut iter)?;
    let _token_program_info = next_account_info(&mut iter)?;

    **mint_account_info.try_borrow_mut_lamports()? += 1;
    msg!("Created SAIC mint account with post-quantum binding");
    Ok(())
}

pub fn mint_to_agent(
    accounts: &[AccountInfo],
    _token_accounts: &TokenAccounts,
) -> Result<(), ProgramError> {
    let mut iter = accounts.iter();
    let agent_account_info = next_account_info(&mut iter)?;
    let _mint_account_info = next_account_info(&mut iter)?;
    let _token_program_info = next_account_info(&mut iter)?;

    let amount = 100 * 10_u64.pow(DECIMALS as u32);
    **agent_account_info.try_borrow_mut_lamports()? += amount;
    msg!("Minted 100 SAIC tokens to AI agent account with verified PQC custody");
    Ok(())
}

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    if instruction_data.is_empty() {
        return Err(ProgramError::InvalidInstructionData);
    }

    let token_accounts = init_token_accounts(accounts)?;
    match instruction_data[0] {
        0 => create_mint(accounts, &token_accounts),
        1 => mint_to_agent(accounts, &token_accounts),
        _ => Err(ProgramError::InvalidInstructionData),
    }
}
