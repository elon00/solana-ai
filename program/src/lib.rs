//! Solana AI on-chain proof registry.
//!
//! Token issuance is intentionally handled by the audited SPL Token / Token-2022
//! programs. This custom program stores authority-bound 32-byte commitments for
//! agent/PQC execution evidence.

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

pub const REGISTRY_VERSION: u8 = 1;
pub const REGISTRY_DATA_LEN: usize = 65;

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let (&opcode, payload) = instruction_data
        .split_first()
        .ok_or(ProgramError::InvalidInstructionData)?;

    match opcode {
        0 => initialize_registry(program_id, accounts),
        1 => record_commitment(program_id, accounts, payload),
        _ => Err(ProgramError::InvalidInstructionData),
    }
}

fn initialize_registry(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let mut iter = accounts.iter();
    let registry = next_account_info(&mut iter)?;
    let authority = next_account_info(&mut iter)?;

    require_registry_account(program_id, registry)?;
    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut data = registry.try_borrow_mut_data()?;
    if data.len() < REGISTRY_DATA_LEN {
        return Err(ProgramError::AccountDataTooSmall);
    }
    if data[..REGISTRY_DATA_LEN].iter().any(|byte| *byte != 0) {
        return Err(ProgramError::InvalidAccountData);
    }

    data[..REGISTRY_DATA_LEN].fill(0);
    data[0] = REGISTRY_VERSION;
    data[1..33].copy_from_slice(authority.key.as_ref());

    msg!("Initialized Solana AI proof registry");
    Ok(())
}

fn record_commitment(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    commitment: &[u8],
) -> ProgramResult {
    if commitment.len() != 32 {
        return Err(ProgramError::InvalidInstructionData);
    }

    let mut iter = accounts.iter();
    let registry = next_account_info(&mut iter)?;
    let authority = next_account_info(&mut iter)?;

    require_registry_account(program_id, registry)?;
    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut data = registry.try_borrow_mut_data()?;
    if data.len() < REGISTRY_DATA_LEN || data[0] != REGISTRY_VERSION {
        return Err(ProgramError::UninitializedAccount);
    }
    if data[1..33] != authority.key.as_ref()[..] {
        return Err(ProgramError::IllegalOwner);
    }

    data[33..65].copy_from_slice(commitment);
    msg!("Recorded authority-approved 32-byte agent/PQC commitment");
    Ok(())
}

fn require_registry_account(program_id: &Pubkey, registry: &AccountInfo) -> ProgramResult {
    if registry.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }
    if !registry.is_writable {
        return Err(ProgramError::InvalidAccountData);
    }
    Ok(())
}
