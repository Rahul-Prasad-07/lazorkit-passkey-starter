"use client";

import { useWallet } from '@lazorkit/wallet';
import { PublicKey, SystemProgram, Connection } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { useState, useEffect } from 'react';
import Toast from '@/components/Toast';

export default function Home() {
  const realWallet = useWallet();
  // Test hooks override (used by E2E tests)
  const testWallet = typeof window !== 'undefined' ? (window as any).__TEST_WALLET : null;

  const connectFn = testWallet?.connect ?? realWallet.connect;
  const disconnectFn = testWallet?.disconnect ?? realWallet.disconnect;
  const signAndSendTransactionFn = testWallet?.signAndSendTransaction ?? realWallet.signAndSendTransaction;
  const isConnectedVal = testWallet?.isConnected ?? realWallet.isConnected;
  const smartWalletPubkeyVal = testWallet?.smartWalletPubkey ?? realWallet.smartWalletPubkey;
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [txSig, setTxSig] = useState('');
  const [creatingAta, setCreatingAta] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

  // Simple toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };
  const [balance, setBalance] = useState('0.00');

  const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!);

  // Fetch USDC balance when wallet is connected
  useEffect(() => {
    if (isConnectedVal && smartWalletPubkeyVal) {
      fetchBalance();
    }
  }, [isConnectedVal, smartWalletPubkeyVal]);

  const fetchBalance = async () => {
    const owner = smartWalletPubkeyVal;
    if (!owner) return;

    try {
      const usdcMint = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT!);

      // Query all token accounts for this owner + mint (robust when ATA not present)
      // Test override for parsed accounts
      const parsed = (typeof window !== 'undefined' && (window as any).__TEST_PARSED_TOKEN_ACCOUNTS)
        || await connection.getParsedTokenAccountsByOwner(owner, {
        mint: usdcMint,
      });

      if (parsed.value.length === 0) {
        setBalance('0.00');
        return;
      }

      // Sum amounts (if multiple token accounts exist)
      let total = BigInt(0);
      for (const { account } of parsed.value) {
        const info: any = account.data.parsed;
        const amt = BigInt(info.info.tokenAmount.amount as string);
        total += amt;
      }

      // USDC has 6 decimals
      const balanceValue = Number(total) / 1_000_000;
      setBalance(balanceValue.toFixed(2));
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setBalance('0.00');
    }
  };

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Connect error:', error);
    }
  };

  const handleTransfer = async () => {
    if (!smartWalletPubkeyVal || !recipient || !amount) return;

    // Validate recipient address
    try {
      new PublicKey(recipient);
    } catch {
      alert('Invalid recipient address');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Invalid amount');
      return;
    }

    if (balance && amountNum > parseFloat(balance)) {
      alert('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      const recipientPubkey = new PublicKey(recipient);
      const usdcMint = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT!);

      // Get ATAs
      const senderATA = await getAssociatedTokenAddress(usdcMint, smartWalletPubkeyVal, true);
      const recipientATA = await getAssociatedTokenAddress(usdcMint, recipientPubkey);

      const instructions = [] as any[];

      // Ensure sender ATA exists; if not, create (the paymaster should sponsor fees)
      const senderInfo = await connection.getAccountInfo(senderATA);
      if (!senderInfo) {
        setCreatingAta(true);
        showToast('Creating associated token account(s)...', 'info');
        instructions.push(
          createAssociatedTokenAccountInstruction(
            smartWalletPubkeyVal, // payer (smart wallet)
            senderATA,
            smartWalletPubkeyVal,
            usdcMint
          )
        );
      }

      // Ensure recipient ATA exists; create if missing
      const recipientInfo = await connection.getAccountInfo(recipientATA);
      if (!recipientInfo) {
        setCreatingAta(true);
        showToast('Creating associated token account(s)...', 'info');
        instructions.push(
          createAssociatedTokenAccountInstruction(
            smartWalletPubkeyVal,
            recipientATA,
            recipientPubkey,
            usdcMint
          )
        );
      }

      // Transfer instruction
      const transferIx = createTransferInstruction(
        senderATA,
        recipientATA,
        smartWalletPubkeyVal!
          ,
        BigInt(Math.floor(amountNum * 1_000_000)) // USDC has 6 decimals
      );

      instructions.push(transferIx);

      // Send gasless transaction with USDC fee
      const sig = await signAndSendTransactionFn({
        instructions,
        transactionOptions: { feeToken: 'USDC' },
      });

      setTxSig(sig);
      showToast('Transaction sent successfully!', 'success');
      // Refresh balance after transfer
      await fetchBalance();
      setCreatingAta(false);
    } catch (error) {
      console.error('Transfer error:', error);
      showToast('Transaction failed. Check console for details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Lazorkit Passkey Wallet</h1>

        {!isConnectedVal ? (
          <div className="text-center">
            <p className="mb-4 text-gray-600">
              Create a passkey-based smart wallet on Solana. No seed phrases, gasless transactions.
            </p>
            <button
              onClick={async () => {
                await connectFn();
              }}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Passkey Wallet
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Wallet Address:</p>
              <p className="font-mono text-sm break-all">{smartWalletPubkeyVal?.toBase58()}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">USDC Balance:</p>
              <p className="font-mono text-lg">{balance ? `${balance} USDC` : 'Loading...'}</p>
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

            <div className="mb-2">
              {creatingAta && (
                <p className="text-sm text-yellow-600">Creating token account(s) — this may take a few seconds...</p>
              )}
            </div>

            <button
              onClick={handleTransfer}
              disabled={loading || !recipient || !amount || creatingAta}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Sending...' : creatingAta ? 'Preparing Accounts...' : 'Send Gasless USDC'}
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

            {/* Toast */}
            {toast && <Toast message={toast.message} type={toast.type} />}

            <button
              onClick={() => {
                disconnectFn();
                setTxSig('');
                setBalance('0.00');
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
