import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ViewState } from './types';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { WelcomeBonus } from './components/WelcomeBonus';
import { Dashboard } from './components/Dashboard';
import { BuyPayId } from './components/BuyPayId';
import { Transfer } from './components/Transfer';
import { GiftCards } from './components/GiftCards';
import { Support } from './components/Support';
import { EarnMore } from './components/EarnMore';
import { Profile } from './components/Profile';
import { ProfileInfo } from './components/ProfileInfo';
import { About } from './components/About';
import { TransactionHistory } from './components/TransactionHistory';
import { ReferEarn } from './components/ReferEarn';
import { AccountLevels } from './components/AccountLevels';
import { Communities } from './components/Communities';
import { Deposit } from './components/Deposit';
import { AdminPanel } from './components/AdminPanel';
import { OnboardingModal } from './components/OnboardingModal';
import { ReferPopup } from './components/ReferPopup';
import { BillPayment } from './components/BillPayment';
import { VerificationGate } from './components/VerificationGate';

const MainApp: React.FC = () => {
  const {
    user,
    logout,
    isOnboardingComplete,
    completeOnboarding,
    isWelcomeComplete,
    showReferPopup,
    hideReferPopup,
  } = useAuth();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [currentView, setCurrentView] = useState<ViewState>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.has('admin') || window.location.pathname === '/admin') {
        return 'admin';
      }
    }
    return 'dashboard';
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // If a referral link was clicked (?ref=...), directly direct the person to the Register screen!
  const [forceRegisterForRef, setForceRegisterForRef] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return !!params.get('ref');
    }
    return false;
  });

  const handleExitAdmin = () => {
    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, '/');
    }
    setCurrentView('dashboard');
  };

  // If visiting via referral link, show Register screen directly until registration succeeds
  if (forceRegisterForRef) {
    return (
      <Register
        onSuccess={() => setForceRegisterForRef(false)}
        onSwitchToLogin={() => {
          setForceRegisterForRef(false);
          setAuthMode('login');
        }}
        onContinueToDashboard={() => setForceRegisterForRef(false)}
        onOpenSupport={() => window.open('https://chat.whatsapp.com/EqmzDkOJOdkK86Rw13GQ1P', '_blank')}
      />
    );
  }

  // Direct owner admin URL access (?admin or /admin)
  if (currentView === 'admin') {
    return <AdminPanel onBack={handleExitAdmin} />;
  }

  // If not logged in, show auth
  if (!user) {
    return authMode === 'login' ? (
      <Login
        onSwitchToRegister={() => setAuthMode('register')}
        onOpenSupport={() => window.open('https://chat.whatsapp.com/EqmzDkOJOdkK86Rw13GQ1P', '_blank')}
      />
    ) : (
      <Register
        onSwitchToLogin={() => setAuthMode('login')}
        onOpenSupport={() => window.open('https://chat.whatsapp.com/EqmzDkOJOdkK86Rw13GQ1P', '_blank')}
      />
    );
  }

  // Require Email/Gmail and Phone SMS Code verification for all non-admin accounts before entering app
  const isAdminOwnerEmail = user.email.toLowerCase() === 'ibro88977@gmail.com';
  const isAccountVerified =
    isAdminOwnerEmail || (Boolean(user.emailVerified) && Boolean(user.phoneVerified));
  if (!isAccountVerified) {
    return <VerificationGate />;
  }

  // If logged in but hasn't completed welcome bonus celebration screen
  if (!isWelcomeComplete) {
    return <WelcomeBonus />;
  }

  // Handle Logout flow
  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    setAuthMode('login');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'buy-pay-id':
        return (
          <BuyPayId
            onBack={() => setCurrentView('dashboard')}
            onNavigateToTransfer={() => setCurrentView('transfer')}
          />
        );
      case 'transfer':
        return (
          <Transfer
            onBack={() => setCurrentView('dashboard')}
            onNavigateToBuyPayId={() => setCurrentView('buy-pay-id')}
            onNavigateToUpgrade={() => setCurrentView('upgrade')}
          />
        );
      case 'gift-cards':
        return <GiftCards onBack={() => setCurrentView('dashboard')} />;
      case 'support':
        return <Support onBack={() => setCurrentView('dashboard')} />;
      case 'bills':
        return <BillPayment onBack={() => setCurrentView('dashboard')} />;
      case 'earn-more':
        return (
          <EarnMore
            onBack={() => setCurrentView('dashboard')}
            onNavigateToUpgrade={() => setCurrentView('upgrade')}
            onNavigateToRefer={() => setCurrentView('refer-earn')}
          />
        );
      case 'profile':
        return (
          <Profile
            onBack={() => setCurrentView('dashboard')}
            onNavigate={(view) => setCurrentView(view)}
            onRequestLogout={() => setShowLogoutModal(true)}
          />
        );
      case 'profile-info':
        return <ProfileInfo onBack={() => setCurrentView('profile')} />;
      case 'about':
        return <About onBack={() => setCurrentView('profile')} />;
      case 'transaction-history':
        return <TransactionHistory onBack={() => setCurrentView('dashboard')} />;
      case 'refer-earn':
        return (
          <ReferEarn
            onBack={() => setCurrentView('dashboard')}
            onNavigateToBuyPayId={() => setCurrentView('buy-pay-id')}
          />
        );
      case 'upgrade':
        return <AccountLevels onBack={() => setCurrentView('dashboard')} />;
      case 'join-communities':
        return <Communities onBack={() => setCurrentView('dashboard')} />;
      case 'deposit':
        return <Deposit onBack={() => setCurrentView('dashboard')} />;
      case 'dashboard':
      default:
        return (
          <Dashboard
            onNavigate={(view) => setCurrentView(view)}
            onRequestLogout={() => setShowLogoutModal(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased selection:bg-purple-500 selection:text-white">
      {renderCurrentView()}

      {/* Guided Onboarding Walkthrough Modal */}
      {!isOnboardingComplete && (
        <OnboardingModal onComplete={completeOnboarding} />
      )}

      {/* Timed Refer & Earn Popup */}
      {showReferPopup && (
        <ReferPopup onClose={hideReferPopup} />
      )}

      {/* Confirm Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Confirm Logout</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to log out of your PayGo wallet account?
            </p>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl text-xs transition-colors"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
