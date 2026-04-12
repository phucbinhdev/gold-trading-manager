export interface Bank {
  id: number;
  name: string;
  code: string;
  bin: string;
  isTransfer: number;
  shortName: string;
  logo: string;
  support: number;
}

export interface QrOptions {
  bankId: string;
  accountNo: string;
  template?: string; // default: 'compact'
  amount?: number;
  description?: string;
  accountName?: string;
}

/**
 * Fetch list of banks from VietQR API
 */
export async function getBanks(): Promise<Bank[]> {
  try {
    const response = await fetch("https://api.vietqr.io/v2/banks");
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching banks:", error);
    return [];
  }
}

/**
 * Generate a Quick Link for VietQR
 * Format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<INFO>&accountName=<NAME>
 */
export function generateQuickLink(options: QrOptions): string {
  const {
    bankId,
    accountNo,
    template = "compact",
    amount,
    description,
    accountName,
  } = options;

  let url = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png`;

  const params = new URLSearchParams();
  if (amount) params.append("amount", amount.toString());
  if (description) params.append("addInfo", description);
  if (accountName) params.append("accountName", accountName);

  const queryString = params.toString();
  if (queryString) {
    url += `?${queryString}`;
  }

  return url;
}
