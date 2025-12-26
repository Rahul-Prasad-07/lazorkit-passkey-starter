# Tutorial 3: Session Persistence and Auto-Reconnection

This tutorial explains how Lazorkit handles wallet persistence across browser sessions, enabling seamless user experiences without repeated authentication.

## Overview

Traditional crypto wallets require users to reconnect on every session. Lazorkit automatically persists passkey wallets, allowing users to return to their wallet without re-authentication.

## How Persistence Works

Lazorkit stores minimal, encrypted session data:
- Passkey credential ID
- Smart wallet PDA address
- Encrypted session token

This data is stored securely in browser localStorage and automatically restored on app load.

## Implementation

### Automatic Reconnection

No additional code needed! Lazorkit handles this automatically:

```tsx
import { useWallet } from '@lazorkit/wallet';

function App() {
  const { isConnected, publicKey } = useWallet();

  // Wallet automatically reconnects on app load
  useEffect(() => {
    if (isConnected) {
      console.log('Wallet restored:', publicKey?.toBase58());
    }
  }, [isConnected, publicKey]);

  return (
    <div>
      {isConnected ? (
        <WalletInterface />
      ) : (
        <ConnectButton />
      )}
    </div>
  );
}
```

### Session Lifecycle

1. **Initial Connection**: `connect()` creates passkey and stores session
2. **App Reload**: Lazorkit checks for existing session on provider mount
3. **Auto-Reconnect**: If valid session exists, wallet reconnects silently
4. **Manual Disconnect**: `disconnect()` clears session data

### Security Considerations

- **Session Validation**: Sessions are validated against on-chain state
- **Expiration**: Sessions can be configured to expire
- **Secure Storage**: Data is encrypted in localStorage
- **Domain Isolation**: Sessions are bound to the app's domain

## Testing Persistence

1. Connect wallet and note the address
2. Refresh the page - wallet should reconnect automatically
3. Open app in new tab - wallet should be available
4. Close browser completely, reopen - wallet persists
5. Click disconnect - session is cleared

## Advanced: Custom Session Management

For custom session handling, access the underlying session:

```tsx
import { useWallet } from '@lazorkit/wallet';

const { connect, disconnect } = useWallet();

// Force fresh connection (ignore existing session)
const forceConnect = async () => {
  await disconnect(); // Clear any existing session
  await connect();    // Create new session
};
```

## Production Best Practices

- **Session Monitoring**: Log reconnection events for analytics
- **Error Handling**: Handle cases where session becomes invalid
- **User Feedback**: Show loading states during reconnection
- **Privacy**: Inform users about session persistence

## Troubleshooting

### Session Not Restoring
- Check browser localStorage permissions
- Verify Lazorkit provider configuration
- Check for domain changes (sessions are domain-bound)

### Invalid Session
- Sessions may become invalid if passkey is deleted
- On-chain state changes can invalidate sessions
- Clear localStorage and reconnect if issues persist

## Complete Example

```tsx
'use client';

import { useWallet } from '@lazorkit/wallet';
import { useEffect, useState } from 'react';

export default function PersistentWallet() {
  const { connect, disconnect, isConnected, publicKey } = useWallet();
  const [isReconnecting, setIsReconnecting] = useState(true);

  useEffect(() => {
    // Simulate reconnection check
    const timer = setTimeout(() => {
      setIsReconnecting(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isReconnecting) {
    return <div>Reconnecting wallet...</div>;
  }

  return (
    <div>
      {!isConnected ? (
        <button onClick={connect}>Connect Wallet</button>
      ) : (
        <div>
          <p>Connected: {publicKey?.toBase58()}</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      )}
    </div>
  );
}
```

This ensures users have a smooth, Web2-like experience with their passkey wallets.