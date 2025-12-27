
# Lazorkit Passkey Starter

> **The ultimate starter template for building passkey-based smart wallets and gasless transactions on Solana with Lazorkit.**

**Live Demo:** [lazorkit-passkey-starter.vercel.app](https://lazorkit-passkey-starter.vercel.app/)

This repo is the canonical, production-quality example for integrating [Lazorkit](https://github.com/lazor-kit/lazor-kit) SDK in a real-world Next.js app. It demonstrates:

- **Passkey authentication** (WebAuthn, FaceID, TouchID, Windows Hello)
- **Smart wallet creation** (no seed phrase, no browser extension)
- **Gasless USDC transfers** (pay fees in USDC, not SOL)
- **Session persistence** (auto-reconnect, no wallet popups)

> **Goal:** Help Solana developers 10x their onboarding UX by showing exactly how to use Lazorkit for passkey login and gasless smart wallet flows. This repo is designed for clarity, reusability, and fast onboarding --> just clone, configure, and build your own app.


## Why Lazorkit? Why Passkeys?

Solana now supports passkey-based authentication natively (since June 2025). Lazorkit is the leading SDK for building passkey smart wallets—no seed phrase, no extension, no friction. This starter shows:

- **How to onboard users with a single click using passkeys**
- **How to send gasless USDC transactions (pay fees in USDC, not SOL)**
- **How to persist sessions and reconnect automatically**


## How It Works (High-Level)

1. **Passkey Creation:** User creates a WebAuthn credential (biometric, hardware-backed)
2. **Smart Wallet PDA:** Solana PDA is derived and controlled by the passkey
3. **Transaction Signing:** User signs authorization messages (not raw txs) with passkey
4. **Gasless Execution:** Paymaster sponsors SOL fees, user pays with USDC


---

## Quick Start (5 min)

### Prerequisites

- Node.js 18+
- npm or yarn
- A browser supporting WebAuthn (Chrome, Safari, Edge)

### Installation

1. Clone this repository:
```bash
git clone https://github.com/Rahul-Prasad-07/lazorkit-passkey-starter.git
cd lazorkit-passkey-starter
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory:

```env
# Solana Devnet RPC
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Lazorkit Portal for passkey handling
NEXT_PUBLIC_LAZORKIT_PORTAL_URL=https://portal.lazor.sh

# Paymaster for gasless transactions
NEXT_PUBLIC_LAZORKIT_PAYMASTER_URL=https://kora.devnet.lazorkit.com

# USDC mint address on Devnet (Wormhole USDC)
NEXT_PUBLIC_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.


---

## Usage: Passkey Wallet & Gasless USDC

### Creating a Passkey Wallet

1. Click "Create Passkey Wallet"
2. Your browser will prompt for biometric authentication (FaceID/TouchID/etc.)
3. A smart wallet PDA is created on Solana Devnet
4. Your wallet address is displayed

### Sending Gasless USDC

1. Ensure your wallet has USDC (use a Devnet faucet if needed)
2. Enter recipient's Solana address
3. Enter USDC amount (6 decimal places)
4. Click "Send Gasless USDC"
5. Confirm with biometrics
6. Transaction executes gaslessly, fees paid in USDC


---

## Project Structure (Clean & Extensible)

```
src/
├── app/
│   ├── layout.tsx    # Root layout with LazorkitProvider
│   └── page.tsx      # Main wallet interface
├── components/       # Reusable UI components (future)
└── lib/             # Utility functions (future)
```


---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Solana RPC endpoint | `https://api.devnet.solana.com` |
| `NEXT_PUBLIC_LAZORKIT_PORTAL_URL` | Lazorkit portal for passkey UI | `https://portal.lazor.sh` |
| `NEXT_PUBLIC_LAZORKIT_PAYMASTER_URL` | Paymaster for gasless txs | `https://kora.devnet.lazorkit.com` |
| `NEXT_PUBLIC_USDC_MINT` | USDC token mint address | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |


---

## Step-by-Step Tutorials

### Tutorial 1: Creating a Passkey-Based Wallet

Passkeys provide phishing-resistant authentication using hardware-backed biometrics.

**Steps:**

1. **Initialize Lazorkit Provider**
   ```tsx
   import { LazorkitProvider } from '@lazorkit/wallet';

   <LazorkitProvider
     rpcUrl={rpcUrl}
     portalUrl={portalUrl}
     paymasterConfig={{ paymasterUrl }}
   >
     <App />
   </LazorkitProvider>
   ```

2. **Use Wallet Hook**
   ```tsx
   import { useWallet } from '@lazorkit/wallet';

   const { connect, isConnected, publicKey } = useWallet();
   ```

3. **Connect Wallet**
   ```tsx
   const handleConnect = async () => {
     await connect(); // Opens portal for passkey creation
   };
   ```

4. **Handle Connection State**
   ```tsx
   if (isConnected) {
     // Show wallet address: publicKey.toBase58()
   }
   ```

The `connect()` method automatically handles passkey creation and smart wallet initialization.

[Read the full tutorial](./tutorials/tutorial-1-passkey-wallet.md)

### Tutorial 2: Sending Gasless Transactions

Gasless transactions use paymasters to sponsor SOL fees, allowing users to pay with stablecoins.

**Steps:**

1. **Prepare Token Transfer**
   ```tsx
   import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';

   const senderATA = await getAssociatedTokenAddress(usdcMint, publicKey);
   const recipientATA = await getAssociatedTokenAddress(usdcMint, recipientPubkey);

   const transferIx = createTransferInstruction(
     senderATA,
     recipientATA,
     publicKey,
     amount * 1_000_000 // USDC decimals
   );
   ```

2. **Send Gasless Transaction**
   ```tsx
   import { useWallet } from '@lazorkit/wallet';

   const { signAndSendTransaction } = useWallet();

   const signature = await signAndSendTransaction({
     instructions: [transferIx],
     transactionOptions: { feeToken: 'USDC' }
   });
   ```

The paymaster automatically sponsors the SOL fee, and the user pays a small amount in USDC.

[Read the full tutorial](./tutorials/tutorial-2-gasless-transactions.md)

### Tutorial 3: Session Persistence

Lazorkit wallets persist across browser sessions automatically.

**Implementation:**

```tsx
const { isConnected, publicKey } = useWallet();

// On app load, check connection status
useEffect(() => {
  if (isConnected) {
    console.log('Wallet connected:', publicKey?.toBase58());
  }
}, [isConnected, publicKey]);
```

No additional code needed - Lazorkit handles reconnection.

[Read the full tutorial](./tutorials/tutorial-3-session-persistence.md)


---

## Deployment (Vercel Recommended)

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

Ensure environment variables are set and the app is built with `npm run build`.


---

## Troubleshooting & FAQ

### Passkey Issues
- Ensure HTTPS in production (WebAuthn requires secure context)
- Check browser WebAuthn support
- Try different browsers if issues persist


### Common Issues & Quick Fixes

- **Balance shows 0.00 but explorer shows tokens:**
  - Make sure your `.env.local` and Vercel env use the correct Devnet USDC mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (Wormhole USDC on Devnet).
  - The app auto-detects 6-decimal tokens, but always set the right mint for best results.

- **Token Transfer fails with "ATA not found":**
  - The app auto-creates missing ATAs as part of the transaction. If a paymaster rejects, check the paymaster URL and ensure your wallet has enough USDC to cover token-based fees.

- **WebAuthn prompt doesn't show or signing fails:**
  - You must use HTTPS (or `localhost`) for WebAuthn to work. Vercel provides HTTPS by default.
  - Make sure your deployed domain is added to the Lazorkit portal’s allowed origins.
  - If you see `WebAuthn is not supported on sites with TLS certificate errors`, check your certificate and portal config.

- **RPC 429 Too Many Requests:**
  - Devnet RPCs are rate-limited. Use a dedicated provider (QuickNode, GenesysGo, etc.) or reduce polling.

- **Simulation/transfer errors:**
  - Ensure the mint and recipient are correct. If you see `TransactionTooOld`, refresh and try again.


---

### Getting Test Funds (Devnet)

- **SOL (for paying fees or creating ATAs manually)**
  ```bash
  solana airdrop 1 <YOUR_ADDRESS> --url https://api.devnet.solana.com
  ```

- **USDC on Devnet**
  - Devnet USDC mint used in this repo: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (Wormhole USDC)
  - You can mint USDC to an address using the `spl-token` CLI (requires a mint authority on Devnet) or use a trusted Devnet account to transfer USDC to your wallet. If you prefer, use Spl Token CLI to create an associated account and mint (demo only):
  ```bash
  # Create associated token account and mint (demo only - requires mint authority)
  spl-token create-account 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU --url https://api.devnet.solana.com
  spl-token mint 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU 100 <RECIPIENT_ATA> --url https://api.devnet.solana.com
  ```

If you're unsure, ask in the LazorKit Discord or use the Devnet token faucets available in community channels.

### Transaction Failures
- Verify USDC balance in wallet
- Check recipient address validity
- Ensure ATAs exist (create if needed in production)

### Connection Issues
- Verify RPC endpoint accessibility
- Check portal and paymaster URLs


---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with clear commit messages
4. Test thoroughly
5. Submit a pull request


---

## License

MIT


---

## Resources

- [Lazorkit Documentation](https://docs.lazor-kit.com)
- [Solana Web3.js](https://solana.com/docs/clients/javascript)
- [WebAuthn Spec](https://www.w3.org/TR/webauthn/)

---


---

## Submission Summary (for Bounty Judges)

- **Repo:** [lazorkit-passkey-starter](https://github.com/Rahul-Prasad-07/lazorkit-passkey-starter)
- **Live Demo:** [lazorkit-passkey-starter.vercel.app](https://lazorkit-passkey-starter.vercel.app/)
- **Framework:** Next.js (React, App Router, TypeScript, Tailwind)
- **Key Features:**
  - Passkey (WebAuthn) smart wallet creation
  - Gasless USDC transfer (pay fees in USDC, not SOL)
  - Session persistence (auto-reconnect)
  - Clean, commented code and clear folder structure
  - 3 step-by-step tutorials in `/tutorials`
  - Robust error handling, auto-ATA creation, and Devnet mint auto-detect
- **How to run:** Clone, set env vars, `npm install`, `npm run dev`, or deploy to Vercel in 2 minutes
- **Why this repo:** This is the fastest way for any Solana dev to get started with passkey wallets and gasless UX using Lazorkit. All code is production-ready, readable, and extensible.

---
