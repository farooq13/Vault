#![allow(unexpected_cfgs)]
#[allow(deprecated)]
use anchor_lang::{prelude::*, system_program::{Transfer,transfer}};

declare_id!("A7mCyk8eKwdkkTdFoF38aEs9GRqK7SCwaPGqzA1mzvr2");

#[program]
pub mod vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.initialize(&ctx.bumps)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        ctx.accounts.deposit(amount)?;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        ctx.accounts.withdraw(amount)?;
        Ok(())
    }

    pub fn close_vault(ctx: Context<CloseVault>) -> Result<()> {
        ctx.accounts.close_vault()?;
        Ok(())
    }    
    
}


/// Initailize Context
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// Vault PDA - a system account that stores SOL
    #[account(
        seeds = [b"vault", vault_state.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    /// Vault State PDA - stores metadata (bumps)
    #[account(
        init,
        payer = signer,
        seeds = [b"state", signer.key().as_ref()],
        bump,
        space = 8 + VaultState::INIT_SPACE,
    )]
    pub vault_state: Account<'info, VaultState>,
    pub system_program: Program<'info, System>,
}

impl<'info> Initialize<'info> {
    fn initialize(&mut self, bumps: &InitializeBumps) -> Result<()> {
        self.vault_state.state_bump = bumps.vault_state;
        self.vault_state.vault_bump = bumps.vault;
        Ok(())
    }
}


/// Deposit Logic
#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vault", vault_state.key().as_ref()],
        bump = vault_state.vault_bump,
    )]
    pub vault: SystemAccount<'info>,
    #[account(
        seeds = [b"state", signer.key().as_ref()],
        bump = vault_state.state_bump,
    )]
    pub vault_state: Account<'info, VaultState>,
    pub system_program: Program<'info, System>,
}

impl<'info> Deposit<'info> {
    fn deposit(&mut self, amount: u64) -> Result<()> {
        let cpi_program = self.system_program.to_account_info();
        let cpi_accounts = Transfer{
            from: self.signer.to_account_info(),
            to: self.vault.to_account_info(),
        };

        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        transfer(cpi_context, amount)?;
        
        Ok(())
    }
}


/// Withdraw Logic
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        seeds = [b"vault", vault_state.key().as_ref()],
        bump = vault_state.vault_bump,
    )]
    pub vault: SystemAccount<'info>,
    #[account(
        seeds = [b"state", signer.key().as_ref()],
        bump = vault_state.state_bump,
    )]
    pub vault_state: Account<'info, VaultState>,
    pub system_program: Program<'info, System>,
}

impl<'info> Withdraw<'info> {
    fn withdraw(&mut self, amount: u64) -> Result<()> {

        // Get the rent exemption minimum for the vault account
        let rent_exempt_minimum = Rent::get()?.minimum_balance(0);


        // Check that the vault has enough funds to withdraw
        require!(
            self.vault.lamports() >= amount,
            VaultError::InsufficientFunds
        );

        // Check that after withdrawal, the vault will still have rent-exempt balance
        require!(
            self.vault.lamports() - amount >= rent_exempt_minimum,
            VaultError::InsufficientRentExemptBalance,
        );

        let cpi_program = self.system_program.to_account_info();
        let cpi_accounts = Transfer{
            from: self.vault.to_account_info(),
            to: self.signer.to_account_info(),
        };

        let seeds = &[
            b"vault".as_ref(),
            self.vault_state.to_account_info().key.as_ref(),
            &[self.vault_state.vault_bump],
        ];

        let signer_seeds = &[&seeds[..]];

        let cpi_context = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        transfer(cpi_context, amount)?;
        Ok(())
    }
}


/// Close Vault Context
#[derive(Accounts)]
pub struct CloseVault<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// Vault PDA - will be closed and lamports sent to signer
    #[account(
        mut,
        seeds = [b"vault", vault_state.key().as_ref()],
        bump = vault_state.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    /// Vault State PDA - Will be closed
    #[account(
        mut,
        seeds = [b"state", signer.key().as_ref()],
        bump = vault_state.state_bump,
        close = signer,
    )]
    pub vault_state: Account<'info, VaultState>,

    pub system_program: Program<'info, System>,
}

impl<'info> CloseVault<'info> {
    pub fn close_vault(&mut self) -> Result<()> {
        // Get the current balance of the vault
        let vault_balance = self.vault.lamports();

        // Only proceed if there's a balance to transfer
        if vault_balance > 0 {
            // Transfer all lamports from vault to signer
            let cpi_program = self.system_program.to_account_info();
            let cpi_accounts = Transfer{
                from: self.vault.to_account_info(),
                to: self.signer.to_account_info()
            };

            let seeds = &[
                b"vault".as_ref(),
                self.vault_state.to_account_info().key.as_ref(),
                &[self.vault_state.vault_bump],
            ];

            let signer_seeds = &[&seeds[..]];
            
            let cpi_context = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
            transfer(cpi_context, vault_balance)?;
        }

        // Manually close the vault account by setting its lamports to 0
        // and clearing its data
        **self.vault.to_account_info().try_borrow_mut_lamports()? = 0;

        Ok(())
    }
}



/// Vault State Data
#[account]
pub struct VaultState {
    pub vault_bump: u8,
    pub state_bump: u8,
}

impl Space for VaultState {
    const INIT_SPACE: usize = 8 + 1 + 1;
}


/// Custom Error Messages
#[error_code]
pub enum VaultError {
    #[msg("Insufficient funds for the withdrawal")]
    InsufficientFunds,
    #[msg("Withdrawal would leave vault below rent-exempt balance")]
    InsufficientRentExemptBalance,
}