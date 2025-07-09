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
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        seeds = [b"vault", vault_state.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,
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

// Challenges:
    // check that the withdraw leaves vault with rent-exempt balance
    // check the account has enough funds to withdraw
    // implement a context to close the account
    // Tip: look for a close context
    // Don't forget to manually close the vault accont [how do you do that?]
    // Don't the Deposit and Withdraw have the same accont? can't we just use the same context in different instructions?

#[account]
pub struct VaultState {
    pub vault_bump: u8,
    pub state_bump: u8,
}

impl Space for VaultState {
    const INIT_SPACE: usize = 8 + 1 + 1;
}