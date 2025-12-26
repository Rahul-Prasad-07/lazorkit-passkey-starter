import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '../page';

// Mock the useWallet hook
jest.mock('@lazorkit/wallet', () => ({
  useWallet: jest.fn(),
}));
const { useWallet: mockUseWallet } = require('@lazorkit/wallet');

// Mock environment variables
process.env.NEXT_PUBLIC_SOLANA_RPC_URL = 'https://api.devnet.solana.com';
process.env.NEXT_PUBLIC_LAZORKIT_PORTAL_URL = 'https://portal.lazor.sh';
process.env.NEXT_PUBLIC_LAZORKIT_PAYMASTER_URL = 'https://kora.devnet.lazorkit.com';
process.env.NEXT_PUBLIC_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const { Keypair } = require('@solana/web3.js');
// Mock spl-token module globally to avoid invoking native PDA logic in tests
jest.mock('@solana/spl-token', () => ({
  getAssociatedTokenAddress: jest.fn(),
  createTransferInstruction: jest.fn(),
  createAssociatedTokenAccountInstruction: jest.fn(),
  getAccount: jest.fn(),
}));
const splToken = require('@solana/spl-token');

describe('Home Component', () => {
  beforeEach(() => {
    mockUseWallet.mockReturnValue({
      connect: jest.fn(),
      disconnect: jest.fn(),
      signAndSendTransaction: jest.fn(),
      isConnected: false,
      smartWalletPubkey: null,
    });
    const web3 = require('@solana/web3.js');
    // Default: no token accounts (keeps console quiet during tests)
    jest.spyOn(web3.Connection.prototype, 'getParsedTokenAccountsByOwner').mockResolvedValue({ value: [] } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders connect button when not connected', () => {
    render(<Home />);

    expect(screen.getByText('Create Passkey Wallet')).toBeInTheDocument();
    expect(screen.getByText('Create a passkey-based smart wallet on Solana. No seed phrases, gasless transactions.')).toBeInTheDocument();
  });

  it('calls connect when button is clicked', async () => {
    const mockConnect = jest.fn().mockResolvedValue(undefined);
    mockUseWallet.mockReturnValue({
      connect: mockConnect,
      disconnect: jest.fn(),
      signAndSendTransaction: jest.fn(),
      isConnected: false,
      smartWalletPubkey: null,
    });

    render(<Home />);

    const button = screen.getByText('Create Passkey Wallet');
    await userEvent.click(button);

    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('shows wallet interface when connected', () => {
    const mockPublicKey = Keypair.generate().publicKey;
    mockUseWallet.mockReturnValue({
      connect: jest.fn(),
      disconnect: jest.fn(),
      signAndSendTransaction: jest.fn(),
      isConnected: true,
      smartWalletPubkey: mockPublicKey,
    });

    render(<Home />);

    expect(screen.getByText('Wallet Address:')).toBeInTheDocument();
    expect(screen.getByText(mockPublicKey.toBase58())).toBeInTheDocument();
    expect(screen.getByText('Send Gasless USDC')).toBeInTheDocument();
  });

  it('handles transfer form submission', async () => {
    // Delay signAndSend to allow creation UI to render
    const mockSignAndSend = jest.fn(() => new Promise((res) => setTimeout(() => res('test-signature'), 20)));
    const mockPublicKey = Keypair.generate().publicKey;
    mockUseWallet.mockReturnValue({
      connect: jest.fn(),
      disconnect: jest.fn(),
      signAndSendTransaction: mockSignAndSend,
      isConnected: true,
      smartWalletPubkey: mockPublicKey,
    });

    // Mock Solana functions
    const web3 = require('@solana/web3.js');
    jest.spyOn(web3.Connection.prototype, 'getAccountInfo').mockResolvedValue({ data: Buffer.from([0]) });
    jest.spyOn(web3.Connection.prototype, 'getParsedTokenAccountsByOwner').mockResolvedValue({ value: [{ account: { data: { parsed: { info: { tokenAmount: { amount: '5000000' } } } } } }] } as any);

    // Simulate missing recipient ATA so creation instruction will be prepended
    jest.spyOn(web3.Connection.prototype, 'getAccountInfo').mockImplementation(async (addr: any) => {
      // return null for recipient/sender ATAs to force creation flow
      return null;
    });

    splToken.getAssociatedTokenAddress.mockResolvedValue('mock-ata');
    splToken.createAssociatedTokenAccountInstruction.mockReturnValue('create-ata-ix');
    splToken.createTransferInstruction.mockReturnValue('mock-instruction');

    render(<Home />);

    // Fill form
    const recipientInput = screen.getByPlaceholderText('Enter Solana address');
    const amountInput = screen.getByPlaceholderText('0.00');
    const submitButton = screen.getByText('Send Gasless USDC');

    const recipientKey = Keypair.generate().publicKey.toBase58();
    await userEvent.type(recipientInput, recipientKey);
    await userEvent.type(amountInput, '1.5');

    await userEvent.click(submitButton);

    // While the transfer is pending, the ATA creation message should appear
    await waitFor(() => expect(screen.getByText(/Creating token account/)).toBeInTheDocument());

    // After transaction resolves, verify signAndSend called and success toast present
    await waitFor(() => {
      const call = mockSignAndSend.mock.calls[0][0];
      expect(call.transactionOptions).toEqual({ feeToken: 'USDC' });
      expect(call.instructions[call.instructions.length - 1]).toBe('mock-instruction');
    });

    await waitFor(() => expect(screen.getByText(/Transaction sent successfully/)).toBeInTheDocument());
  });

  it('aggregates USDC balance from parsed token accounts', async () => {
    const parsedResult = {
      value: [
        {
          account: {
            data: {
              parsed: {
                info: { tokenAmount: { amount: '1000000' } },
              },
            },
          },
        },
        {
          account: {
            data: {
              parsed: {
                info: { tokenAmount: { amount: '2000000' } },
              },
            },
          },
        },
      ],
    };

    // Spy on Connection.getParsedTokenAccountsByOwner
    const web3 = require('@solana/web3.js');
    jest.spyOn(web3.Connection.prototype, 'getParsedTokenAccountsByOwner').mockResolvedValue(parsedResult as any);

    const { Keypair } = require('@solana/web3.js');
    const mockPublicKey = Keypair.generate().publicKey;
    mockUseWallet.mockReturnValue({
      connect: jest.fn(),
      disconnect: jest.fn(),
      signAndSendTransaction: jest.fn(),
      isConnected: true,
      smartWalletPubkey: mockPublicKey,
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('3.00 USDC')).toBeInTheDocument();
    });
  });

  it('refreshes balance after transfer', async () => {
    // Start with 2 USDC
    const web3 = require('@solana/web3.js');
    web3.Connection.prototype.getParsedTokenAccountsByOwner.mockResolvedValueOnce({ value: [{ account: { data: { parsed: { info: { tokenAmount: { amount: '2000000' } } } } } }] } as any);

    const mockSignAndSend = jest.fn().mockResolvedValue('test-signature');
    const { Keypair } = require('@solana/web3.js');
    const mockPublicKey = Keypair.generate().publicKey;
    mockUseWallet.mockReturnValue({
      connect: jest.fn(),
      disconnect: jest.fn(),
      signAndSendTransaction: mockSignAndSend,
      isConnected: true,
      smartWalletPubkey: mockPublicKey,
    });

    // After transfer, increase balance to 4 USDC
    web3.Connection.prototype.getParsedTokenAccountsByOwner.mockResolvedValueOnce({ value: [{ account: { data: { parsed: { info: { tokenAmount: { amount: '4000000' } } } } } }] } as any);

    const splToken = require('@solana/spl-token');
    splToken.getAssociatedTokenAddress.mockResolvedValue('mock-ata');
    splToken.createAssociatedTokenAccountInstruction.mockReturnValue('create-ata-ix');
    splToken.createTransferInstruction.mockReturnValue('mock-instruction');

    render(<Home />);

    await waitFor(() => expect(screen.getByText('2.00 USDC')).toBeInTheDocument());

    // Fill and submit transfer
    await userEvent.type(screen.getByPlaceholderText('Enter Solana address'), Keypair.generate().publicKey.toBase58());
    await userEvent.type(screen.getByPlaceholderText('0.00'), '1.5');
    await userEvent.click(screen.getByText('Send Gasless USDC'));

    // Wait for success and new balance to appear
    await waitFor(() => expect(screen.getByText('Transaction successful!')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('4.00 USDC')).toBeInTheDocument());
  });
});