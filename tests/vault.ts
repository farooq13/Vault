// import * as anchor from "@coral-xyz/anchor";
// import { Program } from "@coral-xyz/anchor";
// import { Vault } from "../target/types/vault";
// import { expect } from "chai";
// import {
//   SystemProgram,
//   PublicKey,
//   LAMPORTS_PER_SOL,
//   Keypair,
// } from "@solana/web3.js";

// describe("Vault Program", () => {
//   const provider = anchor.AnchorProvider.env();
//   anchor.setProvider(provider);

//   const program = anchor.workspace.Vault as Program<Vault>;
//   const connection = provider.connection;

//   // Test accounts
//   let user: Keypair;
//   let vaultPda: PublicKey;
//   let vaultStatePda: PublicKey;
//   let vaultBump: number;
//   let stateBump: number;

//   // Test constants
//   const DEPOSIT_AMOUNT = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL
//   const WITHDRAW_AMOUNT = 0.05 * LAMPORTS_PER_SOL; // 0.05 SOL

//   beforeEach(async () => {
//     // Create a new user for each test
//     user = Keypair.generate();

//     // Airdrop SOL to user
//     const airdropTx = await connection.requestAirdrop(
//       user.publicKey,
//       2 * LAMPORTS_PER_SOL
//     );
//     await connection.confirmTransaction(airdropTx);

//     // Derive PDAs
//     [vaultStatePda, stateBump] = PublicKey.findProgramAddressSync(
//       [Buffer.from("state"), user.publicKey.toBuffer()],
//       program.programId
//     );

//     [vaultPda, vaultBump] = PublicKey.findProgramAddressSync(
//       [Buffer.from("vault"), vaultStatePda.toBuffer()],
//       program.programId
//     );
//   });

//   describe("Initialize", () => {
//     it("Should initialize vault successfully", async () => {
//       await program.methods
//         .initialize()
//         .accounts({
//           signer: user.publicKey,
//           vault: vaultPda,
//           vaultState: vaultStatePda,
//           systemProgram: SystemProgram.programId,
//         })
//         .signers([user])
//         .rpc();

//       // Check vault state account was created
//       const vaultStateAccount = await program.account.vaultState.fetch(
//         vaultStatePda
//       );
//       expect(vaultStateAccount.stateBump).to.equal(stateBump);
//       expect(vaultStateAccount.vaultBump).to.equal(vaultBump);

//       // Check vault PDA exists
//       const vaultAccount = await connection.getAccountInfo(vaultPda);
//       expect(vaultAccount).to.not.be.null;
//     });

//     it("Should fail to initialize vault twice", async () => {
//       // First initialization
//       await program.methods
//         .initialize()
//         .accounts({
//           signer: user.publicKey,
//           vault: vaultPda,
//           vaultState: vaultStatePda,
//           systemProgram: SystemProgram.programId,
//         })
//         .signers([user])
//         .rpc();

//       // Second initialization should fail
//       try {
//         await program.methods
//           .initialize()
//           .accounts({
//             signer: user.publicKey,
//             vault: vaultPda,
//             vaultState: vaultStatePda,
//             systemProgram: SystemProgram.programId,
//           })
//           .signers([user])
//           .rpc();
//         expect.fail("Should have thrown error");
//       } catch (error) {
//         expect(error.message).to.include("already in use");
//       }
//     });
//   });

//   describe("Deposit", () => {
//     beforeEach(async () => {
//       // Initialize vault before each deposit test
//       await program.methods
//         .initialize()
//         .accounts({
//           signer: user.publicKey,
//           vault: vaultPda,
//           vaultState: vaultStatePda,
//           systemProgram: SystemProgram.programId,
//         })
//         .signers([user])
//         .rpc();
//     });

//     it("Should deposit SOL successfully", async () => {
//       const userBalanceBefore = await connection.getBalance(user.publicKey);
//       const vaultBalanceBefore = await connection.getBalance(vaultPda);

//       await program.methods
//         .deposit(new anchor.BN(DEPOSIT_AMOUNT))
//         .accounts({
//           signer: user.publicKey,
//           vault: vaultPda,
//           vaultState: vaultStatePda,
//           systemProgram: SystemProgram.programId,
//         })
//         .signers([user])
//         .rpc();

//       const userBalanceAfter = await connection.getBalance(user.publicKey);
//       const vaultBalanceAfter = await connection.getBalance(vaultPda);

//       // Check balances changed correctly (accounting for transaction fees)
//       expect(userBalanceAfter).to.be.lessThan(userBalanceBefore - DEPOSIT_AMOUNT);
//       expect(vaultBalanceAfter).to.equal(vaultBalanceBefore + DEPOSIT_AMOUNT);
//     });

//     it("Should fail deposit with insufficient funds", async () => {
//       const userBalance = await connection.getBalance(user.publicKey);
//       const excessiveAmount = userBalance + LAMPORTS_PER_SOL;

//       try {
//         await program.methods
//           .deposit(new anchor.BN(excessiveAmount))
//           .accounts({
//             signer: user.publicKey,
//             vault: vaultPda,
//             vaultState: vaultStatePda,
//             systemProgram: SystemProgram.programId,
//           })
//           .signers([user])
//           .rpc();
//         expect.fail("Should have thrown error");
//       } catch (error) {
//         expect(error.message).to.include("InsufficientFunds");
//       }
//     });

//     it("Should handle multiple deposits", async () => {
//       // First deposit
//       await program.methods
//         .deposit(new anchor.BN(DEPOSIT_AMOUNT))
//         .accounts({
//           signer: user.publicKey,
//           vault: vaultPda,
//           vaultState: vaultStatePda,
//           systemProgram: SystemProgram.programId,
//         })
//         .signers([user])
//         .rpc();

//       // Second deposit
//       await program.methods
//         .deposit(new anchor.BN(DEPOSIT_AMOUNT))
//         .accounts({
//           signer: user.publicKey,
//           vault: vaultPda,
//           vaultState: vaultStatePda,
//           systemProgram: SystemProgram.programId,
//         })
//         .signers([user])
//         .rpc();

//       const vaultBalance = await connection.getBalance(vaultPda);
//       expect(vaultBalance).to.equal(DEPOSIT_AMOUNT * 2);
//     });
//   });

//   describe("Withdraw", () => {
//     beforeEach(async () => {
//       // Initialize vault and deposit funds before each withdraw test
//       await program.methods
//         .initialize()
//         .accounts({
//           signer: user.publicKey,
//           vault: vaultPda,
//           vaultState: vaultStatePda,
//           systemProgram: SystemProgram.programId,
//         })
//         .signers([user])
//         .rpc();

//       await program.methods
//         .deposit(new anchor.BN(DEPOSIT_AMOUNT))
//         .accounts({
//           signer: user.publicKey,
//           vault: vaultPda,
//           vaultState: vaultStatePda,
//           systemProgram: SystemProgram.programId,
//         })
//         .signers([user])
//         .rpc();
//     });

//     it("Should withdraw SOL successfully", async () => {
//       const userBalanceBefore = await connection.getBalance(user.publicKey);
//       const vaultBalanceBefore = await connection.getBalance(vaultPda);

//       await program.methods
//         .withdraw(new anchor.BN(WITHDRAW_AMOUNT))
//         .accounts({
//           signer: user.publicKey,
//           vault: vaultPda,
//           vaultState: vaultStatePda,
//           systemProgram: SystemProgram.programId,
//         })
//         .signers([user])
//         .rpc();

//       const userBalanceAfter = await connection.getBalance(user.publicKey);
//       const vaultBalanceAfter = await connection.getBalance(vaultPda);

//       // Check balances changed correctly (accounting for transaction fees)
//       expect(userBalanceAfter).to.be.greaterThan(userBalanceBefore);
//       expect(vaultBalanceAfter).to.equal(vaultBalanceBefore - WITHDRAW_AMOUNT);
//     });

//     it("Should fail withdraw with insufficient vault funds", async () => {
//       const excessiveAmount = DEPOSIT_AMOUNT + LAMPORTS_PER_SOL;

//       try {
//         await program.methods
//           .withdraw(new anchor.BN(excessiveAmount))
//           .accounts({
//             signer: user.publicKey,
//             vault: vaultPda,
//             vaultState: vaultStatePda,
//             systemProgram: SystemProgram.programId,
//           })
//           .signers([user])
//           .rpc();
//         expect.fail("Should have thrown error");
//       } catch (error) {
//         expect(error.message).to.include("InsufficientFunds");
//       }
//     });

//     it("Should maintain rent-exempt balance", async () => {
//       // Get rent exemption minimum
//       const rentExemptMinimum = await connection.getMinimumBalanceForRentExemption(0);
      
//       // Try to withdraw amount that would leave vault below rent-exempt minimum
//       const almostAllFunds = DEPOSIT_AMOUNT - rentExemptMinimum + 1;

//       try {
//         await program.methods
//           .withdraw(new anchor.BN(almostAllFunds))
//           .accounts({
//             signer: user.publicKey,
//             vault: vaultPda,
//             vaultState: vaultStatePda,
//             systemProgram: SystemProgram.programId,
//           })
//           .signers([user])
//           .rpc();
//         expect.fail("Should have thrown error");
//       } catch (error) {
//         expect(error.message).to.include("InsufficientRentExemptBalance");
//       }
//     });

//     it("Should allow withdrawal up to rent-exempt limit", async () => {
//       const rentExemptMinimum = await connection.getMinimumBalanceForRentExemption(0);
//       const maxWithdrawAmount = DEPOSIT_AMOUNT - rentExemptMinimum;

//       await program.methods
//         .withdraw(new anchor.BN(maxWithdrawAmount))
//         .accounts({
//           signer: user.publicKey,
//           vault: vaultPda,
//           vaultState: vaultStatePda,
//           systemProgram: SystemProgram.programId,
//         })
//         .signers([user])
//         .rpc();

//       const vaultBalance = await connection.getBalance(vaultPda);
//       expect(vaultBalance).to.equal(rentExemptMinimum);
//     });
//   });

//   describe("Close Vault", () => {
//     beforeEach(async () => {
//       // Initialize vault and deposit funds before each close test
//       await program.methods
//         .initialize()
//         .accounts({
//           signer: user.publicKey,
//           vault: vaultPda,
//           vaultState: vaultStatePda,
//           systemProgram: SystemProgram.programId,
//         })
//         .signers([user])
//         .rpc();

//       await program.methods
//         .deposit(new anchor.BN(DEPOSIT_AMOUNT))
//         .accounts({
//           signer: user.publicKey,
//           vault: vaultPda,
//           vaultState: vaultStatePda,
//           systemProgram: SystemProgram.programId,
//         })
//         .signers([user])
//         .rpc();
//     });

//     it("Should close vault and return all funds", async () => {
//       const userBalanceBefore = await connection.getBalance(user.publicKey);
//       const vaultBalanceBefore = await connection.getBalance(vaultPda);

//       await program.methods
//         .closeVault()
//         .accounts({
//           signer: user.publicKey,
//           vault: vaultPda,
//           vaultState: vaultStatePda,
//           systemProgram: SystemProgram.programId,
//         })
//         .signers([user])
//         .rpc();

//       const userBalanceAfter = await connection.getBalance(user.publicKey);
//       const vaultBalanceAfter = await connection.getBalance(vaultPda);

//       // Check vault is closed (balance = 0)
//       expect(vaultBalanceAfter).to.equal(0);
      
//       // Check user received funds back (accounting for transaction fees)
//       expect(userBalanceAfter).to.be.greaterThan(userBalanceBefore);

//       // Check vault state account is closed
//       try {
//         await program.account.vaultState.fetch(vaultStatePda);
//         expect.fail("Should have thrown error");
//       } catch (error) {
//         expect(error.message).to.include("Account does not exist");
//       }
//     });

//     it("Should close empty vault successfully", async () => {
//       // First withdraw all funds (keeping rent-exempt minimum)
//       const rentExemptMinimum = await connection.getMinimumBalanceForRentExemption(0);
//       const withdrawAmount = DEPOSIT_AMOUNT - rentExemptMinimum;

//       await program.methods
//         .withdraw(new anchor.BN(withdrawAmount))
//         .accounts({
//           signer: user.publicKey,
//           vault: vaultPda,
//           vaultState: vaultStatePda,
//           systemProgram: SystemProgram.programId,
//         })
//         .signers([user])
//         .rpc();

//       // Then close the vault
//       await program.methods
//         .closeVault()
//         .accounts({
//           signer: user.publicKey,
//           vault: vaultPda,
//           vaultState: vaultStatePda,
//           systemProgram: SystemProgram.programId,
//         })
//         .signers([user])
//         .rpc();

//       // Check vault is closed
//       const vaultBalance = await connection.getBalance(vaultPda);
//       expect(vaultBalance).to.equal(0);
//     });
//   });

//   describe("Access Control", () => {
//     let otherUser: Keypair;

//     beforeEach(async () => {
//       // Create another user
//       otherUser = Keypair.generate();
//       const airdropTx = await connection.requestAirdrop(
//         otherUser.publicKey,
//         LAMPORTS_PER_SOL
//       );
//       await connection.confirmTransaction(airdropTx);

//       // Initialize vault with original user
//       await program.methods
//         .initialize()
//         .accounts({
//           signer: user.publicKey,
//           vault: vaultPda,
//           vaultState: vaultStatePda,
//           systemProgram: SystemProgram.programId,
//         })
//         .signers([user])
//         .rpc();
//     });

//     it("Should prevent other users from accessing vault", async () => {
//       // Try to deposit with other user
//       try {
//         await program.methods
//           .deposit(new anchor.BN(DEPOSIT_AMOUNT))
//           .accounts({
//             signer: otherUser.publicKey,
//             vault: vaultPda,
//             vaultState: vaultStatePda,
//             systemProgram: SystemProgram.programId,
//           })
//           .signers([otherUser])
//           .rpc();
//         expect.fail("Should have thrown error");
//       } catch (error) {
//         expect(error.message).to.include("seeds constraint");
//       }
//     });

//     it("Should prevent other users from withdrawing", async () => {
//       // First deposit with original user
//       await program.methods
//         .deposit(new anchor.BN(DEPOSIT_AMOUNT))
//         .accounts({
//           signer: user.publicKey,
//           vault: vaultPda,
//           vaultState: vaultStatePda,
//           systemProgram: SystemProgram.programId,
//         })
//         .signers([user])
//         .rpc();

//       // Try to withdraw with other user
//       try {
//         await program.methods
//           .withdraw(new anchor.BN(WITHDRAW_AMOUNT))
//           .accounts({
//             signer: otherUser.publicKey,
//             vault: vaultPda,
//             vaultState: vaultStatePda,
//             systemProgram: SystemProgram.programId,
//           })
//           .signers([otherUser])
//           .rpc();
//         expect.fail("Should have thrown error");
//       } catch (error) {
//         expect(error.message).to.include("seeds constraint");
//       }
//     });
//   });

//   describe("Edge Cases", () => {
//     beforeEach(async () => {
//       await program.methods
//         .initialize()
//         .accounts({
//           signer: user.publicKey,
//           vault: vaultPda,
//           vaultState: vaultStatePda,
//           systemProgram: SystemProgram.programId,
//         })
//         .signers([user])
//         .rpc();
//     });

//     it("Should handle zero deposit", async () => {
//       await program.methods
//         .deposit(new anchor.BN(0))
//         .accounts({
//           signer: user.publicKey,
//           vault: vaultPda,
//           vaultState: vaultStatePda,
//           systemProgram: SystemProgram.programId,
//         })
//         .signers([user])
//         .rpc();

//       const vaultBalance = await connection.getBalance(vaultPda);
//       expect(vaultBalance).to.equal(0);
//     });

//     it("Should handle zero withdrawal", async () => {
//       await program.methods
//         .withdraw(new anchor.BN(0))
//         .accounts({
//           signer: user.publicKey,
//           vault: vaultPda,
//           vaultState: vaultStatePda,
//           systemProgram: SystemProgram.programId,
//         })
//         .signers([user])
//         .rpc();

//       const vaultBalance = await connection.getBalance(vaultPda);
//       expect(vaultBalance).to.equal(0);
//     });

//     it("Should handle large amounts", async () => {
//       const largeAmount = LAMPORTS_PER_SOL; // 1 SOL

//       await program.methods
//         .deposit(new anchor.BN(largeAmount))
//         .accounts({
//           signer: user.publicKey,
//           vault: vaultPda,
//           vaultState: vaultStatePda,
//           systemProgram: SystemProgram.programId,
//         })
//         .signers([user])
//         .rpc();

//       const vaultBalance = await connection.getBalance(vaultPda);
//       expect(vaultBalance).to.equal(largeAmount);
//     });
//   });
// });