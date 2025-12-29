"use client";

import { useWallet } from '@lazorkit/wallet';
import { PublicKey, SystemProgram, Connection } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
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
  const [detectedMint, setDetectedMint] = useState<string | null>(null);

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

      // Test override for parsed accounts (E2E/test mode)
      const testParsed = (typeof window !== 'undefined' && (window as any).__TEST_PARSED_TOKEN_ACCOUNTS);
      let parsedAccounts: Array<any> = [];
      const ownerPubkey = owner instanceof PublicKey ? owner : new PublicKey(owner);
      if (testParsed) {
        parsedAccounts = testParsed.value || [];
      } else {
        // Use programId filter (safer) and filter by mint locally to avoid RPC "Token mint could not be unpacked" errors
        const resp = await connection.getParsedTokenAccountsByOwner(ownerPubkey, { programId: TOKEN_PROGRAM_ID });
        // Filter by mint locally (compare strings)
        parsedAccounts = resp.value.filter((v) => {
          try {
            const mintInInfo = v.account.data.parsed?.info?.mint;
            // If mint is missing (test mocks or older RPC), include the account; otherwise match exact mint
            if (typeof mintInInfo === 'undefined') return true;
            return mintInInfo === usdcMint.toBase58();
          } catch (e) {
            return false;
          }
        });
      }

      if (parsedAccounts.length === 0) {
        // No token accounts matched the configured mint. Try auto-detecting a USDC-like token
        // (6 decimals and non-zero uiAmount). This helps when the user is on a different network
        // or their token uses a different mint than the configured `NEXT_PUBLIC_USDC_MINT`.
        const allResp = testParsed ? (testParsed.value || []) : (await connection.getParsedTokenAccountsByOwner(ownerPubkey, { programId: TOKEN_PROGRAM_ID })).value;
        const candidates = allResp.filter((v: any) => {
          try {
            const info = v.account.data.parsed.info;
            return info.tokenAmount && info.tokenAmount.decimals === 6 && Number(info.tokenAmount.uiAmount) > 0;
          } catch (e) {
            return false;
          }
        });

        if (candidates.length === 0) {
          setBalance('0.00');
          setDetectedMint(null);
          return;
        }

        // Use candidates as parsedAccounts to sum amounts and show which mint we detected
        parsedAccounts = candidates;
        const detected = (() => {
          try {
            return (candidates[0].account.data.parsed.info.mint as string) || null;
          } catch (e) {
            return null;
          }
        })();
        setDetectedMint(detected);
        console.info('Auto-detected token mint for USDC-like balance:', detected);
      } else {
        setDetectedMint(null);
      }

      // Sum amounts (if multiple token accounts exist)
      let total = BigInt(0);
      for (const { account } of parsedAccounts) {
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
      await connectFn();
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
      showToast('Invalid recipient address', 'error');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('Invalid amount', 'error');
      return;
    }

    if (balance && amountNum > parseFloat(balance)) {
      showToast('Insufficient balance', 'error');
      return;
    }

    setLoading(true);
    try {
        const recipientPubkey = new PublicKey(recipient);
        const usdcMint = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT!);

        // Ensure owner is a PublicKey instance (some wallet SDKs expose objects with toBase58)
        const ownerPubkey = smartWalletPubkeyVal instanceof PublicKey ? smartWalletPubkeyVal : new PublicKey(smartWalletPubkeyVal);

        // Get ATAs using proper PublicKey types to avoid incorrect program id errors
        const senderATA = await getAssociatedTokenAddress(usdcMint, ownerPubkey, true);
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
      let sig;
      try {
        sig = await signAndSendTransactionFn({
          instructions,
          transactionOptions: { feeToken: 'USDC' },
        });
      } catch (err: any) {
        // Detect WebAuthn / TLS errors and show helpful message to the user
        console.error('Failed to sign and send transaction:', err);
        const msg = (err && (err.message || err.toString())) || 'Signing failed';
        if (/webauthn/i.test(msg) || /TLS certificate/i.test(msg) || /NotAllowedError/i.test(msg)) {
          showToast('Signing failed: WebAuthn unavailable (check TLS / certificate). For local dev, use test-mode `?test=1` or ensure a valid HTTPS context.', 'error');
        } else {
          showToast(`Signing failed: ${msg}`, 'error');
        }
        setLoading(false);
        setCreatingAta(false);
        return;
      }

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
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-3">Explore Examples:</p>
              <a
                href="/sign-message"
                className="block w-full bg-purple-100 text-purple-700 py-2 px-4 rounded-lg hover:bg-purple-200 transition-colors text-center text-sm font-medium"
              >
                🔐 Message Signing Demo
              </a>
            </div>
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
              {detectedMint && (
                <p className="text-xs text-gray-500">Detected token mint: <span className="font-mono">{detectedMint}</span></p>
              )}
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

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-3">Explore More:</p>
              <a
                href="/sign-message"
                className="block w-full bg-purple-100 text-purple-700 py-2 px-4 rounded-lg hover:bg-purple-200 transition-colors text-center text-sm font-medium mb-3"
              >
                🔐 Message Signing Demo
              </a>
              <button
                onClick={() => {
                  disconnectFn();
                  setTxSig('');
                  setBalance('0.00');
                }}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
