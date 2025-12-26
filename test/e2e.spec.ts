import { test, expect } from '@playwright/test';

test('full passkey + gasless flow (test-mode)', async ({ page }) => {
  // Inject a test wallet before the page loads
  await page.addInitScript(() => {
    (window as any).__TEST_PARSED_TOKEN_ACCOUNTS = { value: [{ account: { data: { parsed: { info: { tokenAmount: { amount: '1000000' } } } } } }] };
    (window as any).__TEST_WALLET = {
      isConnected: false,
      smartWalletPubkey: null,
      connect: async function () {
        this.isConnected = true;
        this.smartWalletPubkey = { toBase58: () => 'TestWallet11111111111111111111111111111' };
        return;
      },
      disconnect: async function () {
        this.isConnected = false;
        this.smartWalletPubkey = null;
      },
      signAndSendTransaction: async function ({ instructions }: any) {
        // emulate some delay and return a fake tx id
        await new Promise((r) => setTimeout(r, 200));
        return 'playwright-tx-123';
      },
    };
  });

  await page.goto('http://localhost:3000/?test=1');

  await page.click('text=Create Passkey Wallet');
  await expect(page.locator('text=Wallet Address:')).toBeVisible();
  // capture a snapshot for debugging and README generation
  await page.screenshot({ path: 'playwright-report/home-after-connect.png', fullPage: true });
  await expect(page.locator('text=1.00 USDC')).toBeVisible();

  await page.fill('input[placeholder="Enter Solana address"]', '6hd5rw4gwpoVgHmZxTzxL3waub1BDwng7yro6BX5jCdN');
  await page.fill('input[placeholder="0.00"]', '0.25');
  await page.click('text=Send Gasless USDC');

  await expect(page.locator('text=Creating token account')).toBeVisible();
  await expect(page.locator('text=Transaction successful!')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('a', { hasText: 'View on Explorer' })).toHaveAttribute('href', /playwright-tx-123/);
});
