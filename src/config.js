// =====================================================================
//  App configuration — edit these values to match your business.
// =====================================================================

export const APP_NAME = 'Invest Edge Pro';
export const APP_TAGLINE = 'Premium Membership & Wallet';

export const MIN_DEPOSIT = 500;
export const MIN_WITHDRAWAL = 500;
export const MAX_PROOF_SIZE_MB = 5;

/**
 * Admin receiving accounts shown on the Deposit page.
 * `id` must match the method values allowed in the database: jazzcash | easypaisa | bank
 */
export const PAYMENT_METHODS = [
  {
    id: 'jazzcash',
    name: 'JazzCash',
    short: 'JC',
    accent: 'from-red-500 to-red-700',
    accountTitle: 'Invest Edge Pro',
    accountNumber: '03001234567',
    instructions: 'Send money to this JazzCash mobile account, then enter the TID from your SMS.',
  },
  {
    id: 'easypaisa',
    name: 'EasyPaisa',
    short: 'EP',
    accent: 'from-emerald-500 to-emerald-700',
    accountTitle: 'Invest Edge Pro',
    accountNumber: '03451234567',
    instructions: 'Send money to this EasyPaisa account, then enter the Transaction ID from the receipt.',
  },
  {
    id: 'bank',
    name: 'Bank',
    short: 'BK',
    accent: 'from-sky-600 to-indigo-800',
    bankName: 'Meezan Bank',
    accountTitle: 'Invest Edge Pro',
    accountNumber: '01234567890123',
    iban: 'PK36MEZN0001234567890123',
    instructions: 'Make an IBFT / bank transfer, then enter the transaction reference number.',
  },
];

/** WhatsApp support shown on the Dashboard. Numbers in international format without "+". */
export const SUPPORT = {
  hours: 'Daily, 10:00 AM – 10:00 PM',
  links: [
    {
      label: 'Customer Support',
      description: 'Deposits, withdrawals & account help',
      url: 'https://wa.me/923001234567?text=' + encodeURIComponent('Hello Invest Edge Pro support, I need help with my account.'),
    },
    {
      label: 'Official Channel',
      description: 'Announcements & updates',
      url: 'https://whatsapp.com/channel/your-channel-id',
    },
  ],
};
