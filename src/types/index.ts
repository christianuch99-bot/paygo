export interface User {
  name: string;
  email: string;
  phone?: string;
  balance: number;
  referralBalance: number;
  totalReferrals: number;
  accountLevel?: string;
  avatarUrl?: string;
  referralCode?: string;
  payIdVerified?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  authMethod?: 'email' | 'phone';
  passwordHash?: string;
}

export interface Transaction {
  id: string;
  type:
    | 'Welcome Bonus'
    | 'Transfer'
    | 'Gift Card Purchase'
    | 'Referral Withdrawal'
    | 'PAY ID Purchase'
    | 'Account Upgrade'
    | 'Card Deposit'
    | 'Gift Card Verification'
    | 'Bill Payment';
  amount: number;
  date: string;
  recipientName?: string;
  bankName?: string;
  accountNumber?: string;
  cryptoExchange?: string;
  walletAddress?: string;
  cardName?: string;
  tierName?: string;
  ref?: string;
  giftCardName?: string;
  giftCardCode?: string;
  billProvider?: string;
  billAccount?: string;
}

export interface GiftCardSubmission {
  id: string;
  type: string;
  cardBrand: string;
  cardCode: string;
  cardPin?: string;
  amount: number;
  cardFormat?: 'physical' | 'ecode';
  image?: string;
  codeHash?: string;
  statusId?: string;
  rejectionReason?: string;
  userEmail: string;
  userName: string;
  date: string;
  status: 'pending' | 'verified' | 'redeemed' | 'rejected';
}

export type ViewState =
  | 'dashboard'
  | 'buy-pay-id'
  | 'transfer'
  | 'gift-cards'
  | 'support'
  | 'bills'
  | 'earn-more'
  | 'profile'
  | 'profile-info'
  | 'about'
  | 'transaction-history'
  | 'refer-earn'
  | 'upgrade'
  | 'join-communities'
  | 'deposit'
  | 'admin';
