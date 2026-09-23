//! Solana AI Coin on-chain launch state.
//!
//! This program maintains an authority-controlled, uncapped SAIC supply ledger.
//! It does not pretend to be an SPL Token mint: token-program integration is a
//! separate capability and must be evidenced independently.

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

pub const TOKEN_NAME: &str = "Solana AI Coin";
pub const TOKEN_SYMBOL: &str = "SAIC";
pub const DECIMALS: u8 = 9;
pub const STATE_LEN: usize = 42;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct LaunchState {
    pub initialized: bool,
    pub authority: Pubkey,
    pub minted_supply: u64,
    pub paused: bool,
}

impl LaunchState {
    pub fn unpack(data: &[u8]) -> Result<Self, ProgramError> {
        if data.len() < STATE_LEN {
            return Err(ProgramError::AccountDataTooSmall);
        }

        let initialized = match data[0] {
            0 => false,
            1 => true,
            _ => return Err(ProgramError::InvalidAccountData),
        };

        let mut authority_bytes = [0u8; 32];
        authority_bytes.copy_from_slice(&data[1..33]);

        let mut supply_bytes = [0u8; 8];
        supply_bytes.copy_from_slice(&data[33..41]);

        let paused = match data[41] {
            0 => false,
            1 => true,
            _ => return Err(ProgramError::InvalidAccountData),
        };

        Ok(Self {
            initialized,
            authority: Pubkey::new_from_array(authority_bytes),
            minted_supply: u64::from_le_bytes(supply_bytes),
            paused,
        })
    }

    pub fn pack(&self, data: &mut [u8]) -> Result<(), ProgramError> {
        if data.len() < STATE_LEN {
            return Err(ProgramError::AccountDataTooSmall);
        }

        data[0] = u8::from(self.initialized);
        data[1..33].copy_from_slice(self.authority.as_ref());
        data[33..41].copy_from_slice(&self.minted_supply.to_le_bytes());
        data[41] = u8::from(self.paused);
        Ok(())
    }

    pub fn mint(&mut self, amount: u64) -> Result<(), ProgramError> {
        if self.paused || amount == 0 {
            return Err(ProgramError::InvalidInstructionData);
        }
        self.minted_supply = self
            .minted_supply
            .checked_add(amount)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        Ok(())
    }
}

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
        0 => initialize(program_id, accounts),
        1 => {
            if payload.len() != 8 {
                return Err(ProgramError::InvalidInstructionData);
            }
            let mut amount_bytes = [0u8; 8];
            amount_bytes.copy_from_slice(payload);
            mint_supply(program_id, accounts, u64::from_le_bytes(amount_bytes))
        }
        2 => {
            if payload.len() != 1 {
                return Err(ProgramError::InvalidInstructionData);
            }
            set_paused(program_id, accounts, payload[0] != 0)
        }
        _ => Err(ProgramError::InvalidInstructionData),
    }
}

fn checked_accounts<'a>(
    program_id: &Pubkey,
    accounts: &'a [AccountInfo],
) -> Result<(&'a AccountInfo<'a>, &'a AccountInfo<'a>), ProgramError> {
    let mut iter = accounts.iter();
    let state = next_account_info(&mut iter)?;
    let authority = next_account_info(&mut iter)?;

    if state.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }
    if !state.is_writable {
        return Err(ProgramError::InvalidAccountData);
    }
    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    Ok((state, authority))
}

fn initialize(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let (state_account, authority_account) = checked_accounts(program_id, accounts)?;
    let mut data = state_account.try_borrow_mut_data()?;
    let existing = LaunchState::unpack(&data)?;

    if existing.initialized {
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    LaunchState {
        initialized: true,
        authority: *authority_account.key,
        minted_supply: 0,
        paused: false,
    }
    .pack(&mut data)?;

    msg!("Initialized SAIC uncapped supply ledger");
    Ok(())
}

fn mint_supply(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let (state_account, authority_account) = checked_accounts(program_id, accounts)?;
    let mut data = state_account.try_borrow_mut_data()?;
    let mut state = LaunchState::unpack(&data)?;

    if !state.initialized || state.authority != *authority_account.key {
        return Err(ProgramError::InvalidAccountData);
    }

    state.mint(amount)?;
    state.pack(&mut data)?;
    msg!("Recorded SAIC supply issuance in uncapped ledger");
    Ok(())
}

fn set_paused(program_id: &Pubkey, accounts: &[AccountInfo], paused: bool) -> ProgramResult {
    let (state_account, authority_account) = checked_accounts(program_id, accounts)?;
    let mut data = state_account.try_borrow_mut_data()?;
    let mut state = LaunchState::unpack(&data)?;

    if !state.initialized || state.authority != *authority_account.key {
        return Err(ProgramError::InvalidAccountData);
    }

    state.paused = paused;
    state.pack(&mut data)?;
    msg!("Updated SAIC launch pause state");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn state_round_trip_and_uncapped_minting() {
        let authority = Pubkey::new_unique();
        let mut bytes = [0u8; STATE_LEN];
        let mut state = LaunchState {
            initialized: true,
            authority,
            minted_supply: 0,
            paused: false,
        };

        state.mint(1_000_000_000).unwrap();
        state.mint(9_000_000_000).unwrap();
        state.pack(&mut bytes).unwrap();

        let decoded = LaunchState::unpack(&bytes).unwrap();
        assert_eq!(decoded.authority, authority);
        assert_eq!(decoded.minted_supply, 10_000_000_000);
        assert!(!decoded.paused);
    }

    #[test]
    fn paused_and_overflow_mints_fail_closed() {
        let mut state = LaunchState {
            initialized: true,
            authority: Pubkey::new_unique(),
            minted_supply: 0,
            paused: true,
        };
        assert_eq!(state.mint(1), Err(ProgramError::InvalidInstructionData));

        state.paused = false;
        state.minted_supply = u64::MAX;
        assert_eq!(state.mint(1), Err(ProgramError::ArithmeticOverflow));
    }
}
