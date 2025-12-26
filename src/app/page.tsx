'use client';

import { useWallet } from '@lazorkit/wallet';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';
import { useState } from 'react';

export default function Home() {
  const { connect, disconnect, signAndSendTransaction } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [txSig, setTxSig] = useState('');
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);

  const handleConnect = async () => {
    try {
      const wallet = await connect() as any;
      setPublicKey(new PublicKey(wallet.publicKey));
    } catch (error) {
      console.error('Connect error:', error);
    }
  };

  const handleTransfer = async () => {
    if (!publicKey || !recipient || !amount) return;

    setLoading(true);
    try {
      const recipientPubkey = new PublicKey(recipient);
      const usdcMint = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT!);

      // Get ATAs
      const senderATA = await getAssociatedTokenAddress(usdcMint, publicKey);
      const recipientATA = await getAssociatedTokenAddress(usdcMint, recipientPubkey);

      // Transfer instruction (assumes ATAs exist)
      const transferIx = createTransferInstruction(
        senderATA,
        recipientATA,
        publicKey,
        BigInt(Math.floor(parseFloat(amount) * 1_000_000)) // USDC has 6 decimals
      );

      // Send gasless transaction with USDC fee
      const sig = await signAndSendTransaction({
        instructions: [transferIx],
        transactionOptions: { feeToken: 'USDC' }
      });

      setTxSig(sig);
    } catch (error) {
      console.error('Transfer error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Lazorkit Passkey Wallet</h1>

        {!publicKey ? (
          <div className="text-center">
            <p className="mb-4 text-gray-600">
              Create a passkey-based smart wallet on Solana. No seed phrases, gasless transactions.
            </p>
            <button
              onClick={handleConnect}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Passkey Wallet
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Wallet Address:</p>
              <p className="font-mono text-sm break-all">{publicKey.toBase58()}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient Address
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Enter Solana address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                USDC Amount
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleTransfer}
              disabled={loading || !recipient || !amount}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Sending...' : 'Send Gasless USDC'}
            </button>

            {txSig && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">Transaction successful!</p>
                <a
                  href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View on Explorer
                </a>
              </div>
            )}

            <button
              onClick={() => {
                disconnect();
                setPublicKey(null);
                setTxSig('');
              }}
              className="w-full mt-4 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
