# Tutorial 1: Creating a Passkey-Based Smart Wallet

This tutorial walks through implementing passkey wallet creation with Lazorkit, demonstrating how to replace traditional seed-phrase wallets with hardware-backed biometrics.

## Overview

Passkeys use WebAuthn to create cryptographic credentials stored in secure hardware (TPM, Secure Enclave). Unlike seed phrases, passkeys are:
- Non-exportable
- Phishing-resistant
- Domain-bound
- Hardware-backed

Lazorkit creates a smart wallet (PDA) controlled by these passkeys, enabling programmable account logic.

## Step-by-Step Implementation

### 1. Set Up Lazorkit Provider

The `LazorkitProvider` initializes the SDK with necessary configuration:

```tsx
// src/app/layout.tsx
'use client';

import { LazorkitProvider } from '@lazorkit/wallet';

export default function RootLayout({ children }) {
  return (
    <LazorkitProvider
      rpcUrl={process.env.NEXT_PUBLIC_SOLANA_RPC_URL}
      portalUrl={process.env.NEXT_PUBLIC_LAZORKIT_PORTAL_URL}
      paymasterConfig={{
        paymasterUrl: process.env.NEXT_PUBLIC_LAZORKIT_PAYMASTER_URL
      }}
    >
      {children}
    </LazorkitProvider>
  );
}
```

**Why this matters:**
- `rpcUrl`: Connects to Solana network
- `portalUrl`: Handles passkey UI in secure popup/iframe
- `paymasterConfig`: Enables gasless transactions

### 2. Use Wallet Hook

The `useWallet` hook provides wallet state and methods:

```tsx
// src/app/page.tsx
'use client';

import { useWallet } from '@lazorkit/wallet';

export default function WalletApp() {
  const {
    connect,
    disconnect,
    isConnected,
    publicKey
  } = useWallet();

  // Component logic here
}
```

**Key methods:**
- `connect()`: Initiates passkey creation and wallet setup
- `disconnect()`: Clears session
- `isConnected`: Boolean connection state
- `publicKey`: Smart wallet PDA address

### 3. Implement Connect Flow

Handle the connection with proper error handling:

```tsx
const handleConnect = async () => {
  try {
    await connect();
    // Wallet is now connected and persisted
  } catch (error) {
    console.error('Wallet connection failed:', error);
    // Handle errors (user cancelled, WebAuthn not supported, etc.)
  }
};
```

**What happens during connect():**
1. Opens Lazorkit portal in popup/iframe
2. User creates passkey via WebAuthn
3. Smart wallet PDA is derived and created on-chain
4. Session is persisted in localStorage

### 4. Display Wallet State

Show connection status and wallet address:

```tsx
return (
  <div>
    {!isConnected ? (
      <button onClick={handleConnect}>
        Create Passkey Wallet
      </button>
    ) : (
      <div>
        <p>Wallet Connected: {publicKey?.toBase58()}</p>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    )}
  </div>
);
```

## Security Considerations

- **HTTPS Required**: WebAuthn only works on secure origins
- **Portal Trust**: Only use official Lazorkit portal URLs
- **Session Management**: Lazorkit handles auto-reconnection securely

## Testing

1. Run the app: `npm run dev`
2. Click "Create Passkey Wallet"
3. Complete biometric prompt
4. Verify wallet address appears
5. Refresh page - wallet should reconnect automatically

## Next Steps

Once connected, proceed to [Tutorial 2: Gasless Transactions](./tutorial-2-gasless-transactions.md) to learn how to send tokens without SOL fees.