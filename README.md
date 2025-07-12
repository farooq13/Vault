# Solana Vault Program

A secure, personal SOL vault program built with Anchor framework that allows users to deposit, withdraw, and manage their SOL in a Program Derived Address (PDA) based vault system.

##  Features

- **Personal Vaults**: Each user gets their own unique vault
- **Secure Deposits**: Deposit SOL into your personal vault
- **Safe Withdrawals**: Withdraw SOL with rent-exemption protection
- **Vault Closure**: Close vault and recover all funds
- **Access Control**: Only vault owners can access their funds
- **Rent Protection**: Automatic rent-exemption balance maintenance

##  Table of Contents

- [Architecture](#architecture)
- [Installation](#installation)
- [Usage](#usage)
- [Testing](#testing)
- [Security Features](#security-features)
- [Error Handling](#error-handling)
- [Contributing](#contributing)

##  Architecture

The vault program uses a dual-PDA architecture:

1. **Vault PDA**: Stores the actual SOL deposits
2. **Vault State PDA**: Stores metadata and bump seeds

### Account Structure

```
User
├── Vault State PDA (stores metadata)
│   ├── vault_bump: u8
│   └── state_bump: u8
└── Vault PDA (stores SOL)
    └── lamports: u64
```


##  Installation

### Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (solana-cli 2.1.22)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) (v0.31.1)
- [yarn](https://nodejs.org/) (v1.22.22)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd solana-vault
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Build the program**
   ```bash
   anchor build
   ```

4. **Update program ID**
   ```bash
   # Get the program ID
   solana address -k target/deploy/vault-keypair.json
   
   # Update lib.rs and Anchor.toml with the new program ID
   ```

5. **Deploy to devnet**
   ```bash
   anchor deploy --provider.cluster devnet
   ```

##  Usage

### CLI Usage

```bash
# Initialize vault
anchor run initialize

# Deposit 1 SOL
anchor run deposit -- --amount 1000000000

# Withdraw 0.5 SOL
anchor run withdraw -- --amount 500000000

# Close vault
anchor run close-vault
```


### Instructions

#### `initialize()`
Creates a new vault for the user.

**Accounts:**
- `signer`: User's keypair (mut, signer)
- `vault`: Vault PDA (mut)
- `vault_state`: Vault state PDA (mut, init)
- `system_program`: System program

**Errors:**
- Account already exists if vault already initialized

#### `deposit(amount: u64)`
Deposits SOL into the user's vault.

**Parameters:**
- `amount`: Amount of lamports to deposit

**Accounts:**
- `signer`: User's keypair (mut, signer)
- `vault`: Vault PDA (mut)
- `vault_state`: Vault state PDA
- `system_program`: System program

**Errors:**
- `InsufficientFunds`: User doesn't have enough SOL

#### `withdraw(amount: u64)`
Withdraws SOL from the user's vault.

**Parameters:**
- `amount`: Amount of lamports to withdraw

**Accounts:**
- `signer`: User's keypair (mut, signer)
- `vault`: Vault PDA (mut)
- `vault_state`: Vault state PDA
- `system_program`: System program

**Errors:**
- `InsufficientFunds`: Vault doesn't have enough SOL
- `InsufficientRentExemptBalance`: Withdrawal would leave vault below rent-exempt minimum

#### `close_vault()`
Closes the vault and returns all funds to the user.

**Accounts:**
- `signer`: User's keypair (mut, signer)
- `vault`: Vault PDA (mut)
- `vault_state`: Vault state PDA (mut, close)
- `system_program`: System program

### Data Structures

#### `VaultState`
```rust
pub struct VaultState {
    pub vault_bump: u8,    // Vault PDA bump seed
    pub state_bump: u8,    // State PDA bump seed
}
```



##  Testing

### Running Tests

```bash
# Run all tests
anchor test

# Run tests with logs
anchor test -- --features=debug

# Run specific test file
anchor test -- --grep "Initialize"
```

### Test Coverage

The test suite covers:

- ✅ **Initialization**: Vault creation and duplicate prevention
- ✅ **Deposits**: Successful deposits and insufficient funds
- ✅ **Withdrawals**: Successful withdrawals and rent protection
- ✅ **Vault Closure**: Complete vault closure and fund recovery
- ✅ **Access Control**: User isolation and permission validation
- ✅ **Edge Cases**: Zero amounts, large amounts, and boundary conditions

### Test Environment

```bash
# Start local validator
solana-test-validator

# Run tests against local cluster
anchor test --skip-local-validator
```

##  Security Features

### Access Control
- **PDA-based isolation**: Each user has unique vault PDAs
- **Seed validation**: Accounts validated using PDA seeds
- **Signer verification**: All operations require user signature

### Rent Protection
- **Minimum balance check**: Prevents account deletion
- **Rent-exempt validation**: Ensures vault remains rent-exempt
- **Automatic calculation**: Dynamic rent-exempt minimum calculation

### Fund Safety
- **Balance verification**: Checks available funds before operations
- **Atomic operations**: All transfers are atomic
- **Error handling**: Comprehensive error messages and rollback

### Best Practices
- **No arbitrary code execution**: Limited to defined instructions
- **Explicit account validation**: All accounts explicitly validated
- **Bump seed storage**: Prevents PDA grinding attacks

##  Error Handling

### Common Errors

1. **Insufficient Funds (6000)**
   ```
   Error: Insufficient funds for the operation
   ```
   - **Cause**: User/vault doesn't have enough SOL
   - **Solution**: Check balance before operation

2. **Insufficient Rent Exempt Balance (6001)**
   ```
   Error: Withdrawal would leave vault below rent-exempt minimum
   ```
   - **Cause**: Withdrawal would make vault rent-exempt
   - **Solution**: Reduce withdrawal amount or close vault

3. **Account Already Exists**
   ```
   Error: already in use
   ```
   - **Cause**: Trying to initialize existing vault
   - **Solution**: Use existing vault or different user

4. **Seeds Constraint Violation**
   ```
   Error: seeds constraint was violated
   ```
   - **Cause**: Wrong user trying to access vault
   - **Solution**: Use correct user keypair

##  Security Considerations

### Audit Status
-  **Not audited**: This is a demonstration program
-  **Code review**: Thoroughly reviewed for common vulnerabilities
-  **Comprehensive testing**: Extensive test coverage

### Production Deployment
Before deploying to mainnet:
1. **Professional audit**: Get code audited by security experts
2. **Extensive testing**: Test on devnet/testnet thoroughly
3. **Gradual rollout**: Start with limited exposure
4. **Monitoring**: Implement proper logging and monitoring

### Known Limitations
- **Single-token support**: Only handles SOL (not SPL tokens)
- **No time locks**: No withdrawal delays or restrictions
- **No multi-sig**: Single-signature operations only



## Contributing

### Development Setup

1. **Fork the repository**
2. **Create feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make changes and test**
   ```bash
   anchor test
   ```
4. **Commit and push**
   ```bash
   git commit -m "Add amazing feature"
   git push origin feature/amazing-feature
   ```
5. **Create Pull Request**


### Testing Guidelines
- Write tests for new features
- Ensure all tests pass
- Test edge cases and error conditions
- Maintain >90% code coverage



##  Acknowledgments

- [Anchor Framework](https://anchor-lang.com/) for the development framework
- [Solana Labs](https://solana.com/) for the blockchain platform
- [Solana Cookbook](https://solanacookbook.com/) for best practices

## Support

- **Documentation**: [Anchor Docs](https://anchor-lang.com/docs)
- **Community**: [Solana Stack Exchange](https://solana.stackexchange.com/)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)

---

**Disclaimer**: This is a demonstration program and has not been audited. Use at your own risk and do not deploy to mainnet without proper security