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
  kycVerified?: boolean;
  kycStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  kycRejectionReason?: string;
  kycStatusId?: string;
  cardRejectionReason?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  authMethod?: 'email' | 'phone';
  passwordHash?: string;
  createdAt?: string;
  lastLoginAt?: string;
  lastActiveAt?: string;
  lastLoginDevice?: string;
  isOnline?: boolean;
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

export interface KycSubmission {
  id: string;
  statusId: string;
  userEmail: string;
  userName: string;
  accountLevel: string;
  fullName: string;
  dateOfBirth: string;
  ssiNumber: string;
  address: string;
  licenseNumber: string;
  licenseState: string;
  licenseExpiry: string;
  licenseFrontImage: string;
  licenseBackImage: string;
  status: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
  date: string;
  timestamp?: string;
}

export interface TrackedGiftCard {
  statusId: string;
  type: string;
  cardBrand: string;
  cardFormat: 'physical' | 'ecode';
  maskedCode: string;
  amount: number;
  status: 'pending' | 'verified' | 'redeemed' | 'rejected';
  rejectionReason?: string;
  submittedAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  kind: 'giftcard_submitted' | 'giftcard_approved' | 'giftcard_rejected' | 'account_update';
  title: string;
  message: string;
  status?: 'pending' | 'verified' | 'redeemed' | 'rejected';
  statusId?: string;
  createdAt: string;
  read: boolean;
  actionView?: ViewState;
  actionLabel?: string;
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
  | 'kyc-verification'
  | 'join-communities'
  | 'deposit'
  | 'admin';
