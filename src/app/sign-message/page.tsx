"use client";

import { useWallet } from '@lazorkit/wallet';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignMessageExample() {
  const { isConnected, smartWalletPubkey, signMessage, connect } = useWallet();
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const router = useRouter();

  const handleSignMessage = async () => {
    if (!message.trim()) {
      alert('Please enter a message to sign');
      return;
    }

    setLoading(true);
    setSignature('');
    setVerified(null);

    try {
      // Sign the message with passkey (signMessage accepts string)
      const sig = await signMessage(message);
      
      // The signature is returned as an object with signature and signedPayload
      // Convert to a displayable format
      const sigString = typeof sig === 'string' ? sig : JSON.stringify(sig, null, 2);
      setSignature(sigString);
      setVerified(true);
      
      console.log('Message signed successfully:', {
        message,
        signature: sig,
        publicKey: smartWalletPubkey?.toBase58(),
      });
    } catch (error) {
      console.error('Failed to sign message:', error);
      setVerified(false);
      alert('Failed to sign message. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Connect error:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-center mb-4">Sign Message Example</h1>
          <p className="text-gray-600 mb-6 text-center">
            Connect your passkey wallet to sign messages for authentication.
          </p>
          <button
            onClick={handleConnect}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Connect Passkey Wallet
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full mt-3 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Sign Message with Passkey</h1>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            ← Back to Home
          </button>
        </div>

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Use Case:</strong> Sign messages for authentication, login verification, 
            or proving wallet ownership without sending transactions.
          </p>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-1">Connected Wallet:</p>
          <p className="font-mono text-sm break-all bg-gray-50 p-2 rounded">
            {smartWalletPubkey?.toBase58()}
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message to Sign
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter any message (e.g., 'Sign in to MyApp at 2025-01-15 10:30:00')"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Common use cases: Login challenges, ownership proofs, authentication tokens
          </p>
        </div>

        <button
          onClick={handleSignMessage}
          disabled={loading || !message.trim()}
          className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors mb-4"
        >
          {loading ? 'Signing with Passkey...' : '🔐 Sign Message'}
        </button>

        {signature && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center mb-2">
                <span className="text-green-600 text-xl mr-2">✓</span>
                <p className="text-sm font-semibold text-green-800">
                  Message Signed Successfully
                </p>
              </div>
              <p className="text-xs text-green-700">
                Signed with passkey authentication (biometric verification)
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Signature:</p>
              <div className="bg-gray-50 p-3 rounded border border-gray-200 max-h-40 overflow-auto">
                <pre className="font-mono text-xs break-all whitespace-pre-wrap">{signature}</pre>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(signature);
                  alert('Signature copied to clipboard!');
                }}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                📋 Copy Signature
              </button>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">How to Verify:</p>
              <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                <li>Use the public key: <code className="bg-white px-1 rounded">{smartWalletPubkey?.toBase58()}</code></li>
                <li>Verify the signature against the original message</li>
                <li>Use Solana's <code className="bg-white px-1 rounded">nacl.sign.detached.verify()</code> or similar</li>
              </ol>
            </div>
          </div>
        )}

        {verified === false && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              ❌ Failed to sign message. Check console for error details.
            </p>
          </div>
        )}

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-medium text-yellow-800 mb-2">💡 Real-World Use Cases:</p>
          <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
            <li><strong>Authentication:</strong> Sign login challenges to prove wallet ownership</li>
            <li><strong>Session Tokens:</strong> Generate signed tokens for API authentication</li>
            <li><strong>Proof of Ownership:</strong> Verify you control a wallet without transactions</li>
            <li><strong>Off-Chain Actions:</strong> Sign messages for Discord roles, airdrops, etc.</li>
            <li><strong>Multi-Factor Auth:</strong> Use passkey signatures as 2FA</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
