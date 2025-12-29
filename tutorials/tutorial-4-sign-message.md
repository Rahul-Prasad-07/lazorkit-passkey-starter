# Tutorial 4: Message Signing for Authentication

## Overview

Message signing is a fundamental Web3 pattern for authentication and verification. Unlike transactions, signing messages doesn't cost gas or modify blockchain state—it simply proves you control a wallet.

This tutorial shows how to use Lazorkit's passkey-based message signing for:
- **Login authentication** (prove wallet ownership)
- **Session tokens** (generate signed credentials)
- **Off-chain verification** (Discord roles, airdrops, etc.)
- **Multi-factor authentication** (passkey as 2FA)

---

## Why Sign Messages?

### Traditional Web3 Flow (Problems)
1. User connects wallet extension
2. Signs a transaction to prove ownership
3. Pays gas fees just to authenticate
4. Complex UX with multiple popups

### Lazorkit Passkey Flow (Solution)
1. User authenticates with biometric (FaceID/TouchID)
2. Signs message with passkey (no gas, no blockchain state change)
3. Server verifies signature off-chain
4. Instant, gasless authentication

---

## Implementation

### Step 1: Set Up the Sign Message Page

Create a new page at `src/app/sign-message/page.tsx`:

```tsx
"use client";

import { useWallet } from '@lazorkit/wallet';
import { useState } from 'react';

export default function SignMessageExample() {
  const { isConnected, smartWalletPubkey, signMessage, connect } = useWallet();
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignMessage = async () => {
    if (!message.trim()) {
      alert('Please enter a message to sign');
      return;
    }

    setLoading(true);
    try {
      // Sign the message with passkey
      const sig = await signMessage(message);
      
      // Convert signature to displayable format
      const sigString = typeof sig === 'string' ? sig : JSON.stringify(sig, null, 2);
      setSignature(sigString);
      
      console.log('Message signed:', {
        message,
        signature: sig,
        publicKey: smartWalletPubkey?.toBase58(),
      });
    } catch (error) {
      console.error('Failed to sign message:', error);
      alert('Failed to sign message');
    } finally {
      setLoading(false);
    }
  };

  // ... rest of component
}
```

### Step 2: Understanding the `signMessage` API

The `signMessage` function from Lazorkit:

```tsx
const { signMessage } = useWallet();

// Sign a message (string)
const signature = await signMessage("Hello, Solana!");

// Returns signature object with:
// - signature: The cryptographic signature
// - signedPayload: The original message
```

**Key Points:**
- Accepts a **string** message (not bytes)
- Returns a signature object
- Triggers passkey authentication (biometric prompt)
- No gas fees, no blockchain transaction
- Works offline (no RPC needed)

---

## Real-World Use Cases

### 1. Login Authentication

**Scenario:** User logs into your app by proving wallet ownership.

```tsx
// Frontend: Generate challenge
const challenge = `Sign in to MyApp\nTimestamp: ${Date.now()}\nNonce: ${randomNonce}`;
const signature = await signMessage(challenge);

// Backend: Verify signature
const isValid = verifySignature(signature, publicKey, challenge);
if (isValid) {
  // Create session token
  const token = jwt.sign({ publicKey }, SECRET);
  return { token };
}
```

**Benefits:**
- No gas fees for login
- Phishing-resistant (hardware-backed passkey)
- Works across devices

---

### 2. API Authentication

**Scenario:** Generate signed tokens for API requests.

```tsx
// Sign a token with expiry
const token = `API_TOKEN:${userId}:${expiryTimestamp}`;
const signature = await signMessage(token);

// Include in API headers
fetch('/api/protected', {
  headers: {
    'X-Wallet-Address': publicKey,
    'X-Signature': signature,
    'X-Message': token,
  }
});
```

**Backend verification:**
```typescript
// Verify signature matches public key
const isValid = nacl.sign.detached.verify(
  Buffer.from(message),
  Buffer.from(signature),
  publicKey.toBuffer()
);
```

---

### 3. Discord Role Verification

**Scenario:** Prove wallet ownership to claim Discord roles.

```tsx
// User signs message with Discord ID
const message = `Verify Discord: ${discordId}\nWallet: ${publicKey}`;
const signature = await signMessage(message);

// Submit to Discord bot
await fetch('/discord/verify', {
  method: 'POST',
  body: JSON.stringify({ discordId, publicKey, signature, message })
});
```

---

### 4. Airdrop Eligibility

**Scenario:** Prove wallet ownership for airdrop claims.

```tsx
// Sign eligibility message
const message = `Claim airdrop for wallet: ${publicKey}\nCampaign: SUMMER2025`;
const signature = await signMessage(message);

// Submit claim
await fetch('/airdrop/claim', {
  method: 'POST',
  body: JSON.stringify({ publicKey, signature, message })
});
```

---

## Security Best Practices

### 1. Include Context in Messages

Always include:
- **Timestamp** (prevent replay attacks)
- **Nonce** (ensure uniqueness)
- **Domain** (prevent cross-site attacks)

```tsx
const message = `
Sign in to MyApp.com
Timestamp: ${Date.now()}
Nonce: ${crypto.randomUUID()}
Action: Login
`;
```

### 2. Verify on Backend

**Never trust client-side verification alone.**

```typescript
// Backend verification (Node.js example)
import nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';

function verifySignature(
  message: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = Buffer.from(signature, 'base64');
    const publicKeyBytes = new PublicKey(publicKey).toBuffer();
    
    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );
  } catch {
    return false;
  }
}
```

### 3. Set Expiry Times

```tsx
const expiryTime = Date.now() + (5 * 60 * 1000); // 5 minutes
const message = `Login challenge\nExpires: ${expiryTime}`;

// Backend checks expiry
if (Date.now() > expiryTime) {
  throw new Error('Signature expired');
}
```

---

## Comparison: Message Signing vs Transactions

| Feature | Message Signing | Transaction |
|---------|----------------|-------------|
| **Gas Fees** | ❌ None | ✅ Required |
| **Blockchain State** | ❌ No change | ✅ Modifies state |
| **Speed** | ⚡ Instant | 🐢 ~400ms (Solana) |
| **Use Case** | Authentication, proofs | Transfers, smart contracts |
| **Offline** | ✅ Works offline | ❌ Needs RPC |
| **Verification** | Off-chain | On-chain |

---

## Testing the Example

1. **Navigate to the sign-message page:**
   ```
   http://localhost:3000/sign-message
   ```

2. **Connect your passkey wallet**

3. **Enter a message:**
   ```
   Sign in to MyApp at 2025-01-15 10:30:00
   ```

4. **Click "Sign Message"**
   - Passkey prompt appears (FaceID/TouchID)
   - Signature is generated instantly
   - No gas fees, no blockchain transaction

5. **Copy the signature** and verify it on your backend

---

## Common Patterns

### Login Challenge Flow

```tsx
// 1. Request challenge from backend
const { challenge, nonce } = await fetch('/auth/challenge').then(r => r.json());

// 2. Sign challenge with passkey
const signature = await signMessage(challenge);

// 3. Submit signature to backend
const { token } = await fetch('/auth/verify', {
  method: 'POST',
  body: JSON.stringify({ publicKey, signature, nonce })
}).then(r => r.json());

// 4. Store token for authenticated requests
localStorage.setItem('authToken', token);
```

### Proof of Ownership

```tsx
// Prove you own a wallet without revealing private key
const proofMessage = `I own wallet ${publicKey} at ${Date.now()}`;
const signature = await signMessage(proofMessage);

// Anyone can verify this signature matches the public key
```

---

## Troubleshooting

### Issue: "signMessage is not a function"

**Solution:** Ensure you're using Lazorkit SDK v2.0.1+

```bash
npm install @lazorkit/wallet@latest
```

### Issue: Signature verification fails

**Solution:** Ensure message format matches exactly (including whitespace)

```tsx
// Frontend and backend must use identical message
const message = "Login\nTimestamp: 1234567890"; // Exact match required
```

### Issue: Passkey prompt doesn't appear

**Solution:** Check HTTPS/localhost requirement

- WebAuthn requires secure context (HTTPS or localhost)
- Ensure Lazorkit portal URL is correct

---

## Next Steps

- **Integrate with your backend** for login flows
- **Add session management** with signed tokens
- **Implement role-based access** using signature verification
- **Build multi-factor auth** with passkey + password

---

## Resources

- [WebAuthn Specification](https://www.w3.org/TR/webauthn/)
- [Solana Message Signing](https://docs.solana.com/developing/clients/javascript-api#sign-message)
- [Lazorkit Documentation](https://docs.lazor-kit.com)

---

**Key Takeaway:** Message signing with Lazorkit passkeys enables **gasless, instant authentication** that feels like Web2 but with Web3 security guarantees.
