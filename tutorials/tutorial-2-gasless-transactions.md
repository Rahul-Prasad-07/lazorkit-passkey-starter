# Tutorial 2: Sending Gasless USDC Transfers

This tutorial demonstrates how to send USDC transfers without requiring SOL for gas fees, using Lazorkit's paymaster integration.

## Overview

Traditional Solana transactions require SOL for gas fees. Lazorkit enables "gasless" transactions where:
- Paymaster sponsors the SOL fee
- User pays a small fee in the token being transferred (USDC)
- Web2-like UX: click → done, no wallet funding needed

## Prerequisites

- Completed [Tutorial 1](./tutorial-1-passkey-wallet.md)
- Wallet connected with passkey
- Some USDC in the wallet (use Devnet faucet)

## Step-by-Step Implementation

### 1. Import Required Libraries

```tsx
import { useWallet } from '@lazorkit/wallet';
import { PublicKey } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction
} from '@solana/spl-token';
```

### 2. Prepare Transfer Parameters

Get user input for recipient and amount:

```tsx
const [recipient, setRecipient] = useState('');
const [amount, setAmount] = useState('');

const handleTransfer = async () => {
  if (!recipient || !amount || !publicKey) return;

  // Parse inputs
  const recipientPubkey = new PublicKey(recipient);
  const transferAmount = parseFloat(amount);
};
```

### 3. Get Associated Token Accounts

USDC transfers require Associated Token Accounts (ATAs):

```tsx
const usdcMint = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT);

// Get sender's USDC ATA
const senderATA = await getAssociatedTokenAddress(usdcMint, publicKey);

// Get recipient's USDC ATA
const recipientATA = await getAssociatedTokenAddress(usdcMint, recipientPubkey);
```

**Note:** This assumes ATAs exist. In production, check and create if needed.

### 4. Create Transfer Instruction

Build the SPL token transfer instruction:

```tsx
const transferIx = createTransferInstruction(
  senderATA,           // from
  recipientATA,        // to
  publicKey,           // authority
  BigInt(Math.floor(transferAmount * 1_000_000)) // amount (USDC = 6 decimals)
);
```

### 5. Send Gasless Transaction

Use Lazorkit's `signAndSendTransaction` with USDC fee payment:

```tsx
const { signAndSendTransaction } = useWallet();

const signature = await signAndSendTransaction({
  instructions: [transferIx],
  transactionOptions: {
    feeToken: 'USDC'  // Pay gas fee in USDC instead of SOL
  }
});

console.log('Transaction successful:', signature);
```

## How Gasless Works

1. **Authorization**: User signs with passkey to authorize the transaction
2. **Paymaster**: Lazorkit paymaster sponsors the SOL compute fee
3. **Fee Payment**: Small USDC amount is deducted from sender's balance
4. **Execution**: Transaction executes on Solana with sponsored gas

## Complete Implementation

```tsx
const handleTransfer = async () => {
  if (!publicKey || !recipient || !amount) return;

  setLoading(true);
  try {
    const recipientPubkey = new PublicKey(recipient);
    const usdcMint = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT);

    // Get ATAs
    const senderATA = await getAssociatedTokenAddress(usdcMint, publicKey);
    const recipientATA = await getAssociatedTokenAddress(usdcMint, recipientPubkey);

    // Create transfer instruction
    const transferIx = createTransferInstruction(
      senderATA,
      recipientATA,
      publicKey,
      BigInt(Math.floor(parseFloat(amount) * 1_000_000))
    );

    // Send gasless transaction
    const sig = await signAndSendTransaction({
      instructions: [transferIx],
      transactionOptions: { feeToken: 'USDC' }
    });

    setTxSig(sig);
  } catch (error) {
    console.error('Transfer failed:', error);
  } finally {
    setLoading(false);
  }
};
```

## Error Handling

Common issues and solutions:

- **Insufficient USDC**: Ensure wallet has enough USDC for transfer + fee
- **Invalid Address**: Validate recipient address before sending
- **ATA Not Found**: Create ATAs if they don't exist
- **Paymaster Error**: Check paymaster URL and network connectivity

## Testing

1. Connect wallet (from Tutorial 1)
2. Get USDC from [Devnet Faucet](https://faucet.solana.com/)
3. Enter recipient address and amount
4. Click "Send Gasless USDC"
5. Confirm with biometrics
6. Verify transaction on [Solana Explorer](https://explorer.solana.com/?cluster=devnet)

## Production Considerations

- **ATA Creation**: Always check and create ATAs as needed
- **Fee Estimation**: Show estimated fees before sending
- **Balance Checks**: Verify sufficient balance before attempting transfer
- **Error Recovery**: Handle network failures gracefully

## Next Steps

Explore [Tutorial 3: Session Persistence](./tutorial-3-session-persistence.md) to understand how wallets reconnect automatically.