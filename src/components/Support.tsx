import React, { useState } from 'react';
import {
  ArrowLeft,
  MessageSquare,
  MessageCircle,
  Send,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SupportProps {
  onBack: () => void;
}

export const Support: React.FC<SupportProps> = ({ onBack }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'support', text: 'Hello! Welcome to PayGo Support. How can we help you today?' },
    { sender: 'support', text: 'If you need help with your PAY ID or crypto trading withdrawals, feel free to ask or connect directly with our WhatsApp community.' },
  ]);
  const [inputMsg, setInputMsg] = useState('');

  const openWhatsApp = () => {
    window.open('https://chat.whatsapp.com/EqmzDkOJOdkK86Rw13GQ1P', '_blank');
  };

  const TELEGRAM_URL = 'https://t.me/Mike_Aper_PayGo';

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg.trim().toLowerCase();
    setMessages((prev) => [...prev, { sender: 'user', text: inputMsg.trim() }]);
    setInputMsg('');

    setTimeout(() => {
      let reply = 'Welcome to PayGo! Here is how our platform works:\n\n1. Buy PAY ID: Submit a $25 gift card or ATM card to get your PAY ID verified by the admin.\n2. Weekly Rewards: Once your PAY ID is approved, you unlock $25 weekly rewards (which increase when you upgrade your tiers up to Black Tier).\n3. Tier Upgrades: Upgrade from Silver ($50) to Ruby ($200) to unlock withdrawal eligibility.\n4. Account Verification (ID & SSI): Once you reach Stage 5 — Ruby Tier, verify your account using your Driver\'s License and SSI details.\n5. Withdrawals: After admin approves your PAY ID, Ruby tier, and ID & SSI verification, enter your crypto exchange username, network, and wallet address to withdraw.';

      if (userText.includes('pay id') || userText.includes('code') || userText.includes('verify') || userText.includes('license') || userText.includes('ssi')) {
        reply = 'Account & ID Verification Steps:\n1. First get your PAY ID verified under "Buy PAY ID" ($25).\n2. Upgrade your account step-by-step up to Stage 5 — Ruby Tier.\n3. Once you reach Ruby Tier, submit your Driver\'s License photos and SSI details under Account Verification.\n4. After admin approves your ID & SSI verification, your withdrawals unlock immediately!';
      } else if (userText.includes('withdraw') || userText.includes('transfer') || userText.includes('crypto')) {
        reply = 'To make a crypto/trading withdrawal:\n1. Ensure your PAY ID is verified and approved by the admin.\n2. Minimum withdrawal is $5,000, which requires upgrading to Stage 5 — Ruby Tier or higher.\n3. Complete Account Verification with your Driver\'s License and SSI details after reaching Ruby Tier.\n4. Enter your exchange username (Binance, Bybit, TrustWallet, CoinStats, etc.), address, and approved PAY ID code to complete your transfer.';
      } else if (userText.includes('upgrade') || userText.includes('tier') || userText.includes('ruby')) {
        reply = 'Account Tier Upgrades:\n- We offer tiers from Stage 1 (Silver - $50) up to Stage 5 (Ruby - $200) and Black Tier ($500).\n- Reaching Ruby tier unlocks Account Verification (Driver\'s License & SSI details) required for withdrawals of $5,000 or more.\n- Upgrades are reviewed and approved by the admin.';
      } else if (userText.includes('bonus') || userText.includes('reward') || userText.includes('weekly')) {
        reply = 'Weekly Rewards:\n- Once your PAY ID is approved by the admin, your weekly reward unlocks at $25.00.\n- Upgrading your account tier increases your weekly reward (Silver: $50, Gold: $75, Platinum: $100, Emerald: $150, Ruby: $200, Diamond: $250, Black: $500).';
      } else if (userText.includes('deposit') || userText.includes('atm') || userText.includes('card')) {
        reply = 'ATM Deposits & Cards:\n- You can deposit funds into your wallet using any global ATM debit card from any country in the world.\n- Card submissions are securely reviewed by the admin.';
      } else if (userText.includes('admin') || userText.includes('approval') || userText.includes('pending')) {
        reply = 'Admin Approvals:\n- For your security, all PAY ID purchases, gift card verifications, tier upgrades, and ATM submissions require explicit approval from the admin.\n- Once approved in the admin portal, your account features automatically unlock.';
      }

      setMessages((prev) => [...prev, { sender: 'support', text: reply }]);
    }, 800);
  };

  const FAQS = [
    {
      q: 'What is a PayGo ID (PAY ID)?',
      a: 'A PAY ID is your unique cryptographic authorization key needed to process withdrawals and activate high-tier wallet features.',
    },
    {
      q: 'How long does crypto withdrawal take?',
      a: 'Crypto and trading wallet withdrawals are initiated instantly and typically arrive within minutes up to 24 hours depending on network confirmation.',
    },
    {
      q: 'Can I withdraw my $13,000 welcome bonus?',
      a: 'Yes, your welcome bonus is deposited into your wallet balance and available for withdrawal and services once verified.',
    },
    {
      q: 'How does Refer & Earn work?',
      a: 'You receive $25 instantly for each friend who signs up with your referral link and activates their wallet.',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white p-4 border-b sticky top-0 z-30 shadow-xs">
        <div className="max-w-xl mx-auto flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 text-black hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Support</h1>
            <p className="text-xs text-gray-500">24/7 PayGo Customer Care</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">How can we help you?</h2>
          <p className="text-xs text-gray-500 mt-1">
            Choose your preferred support channel or browse frequently asked questions
          </p>
        </div>

        {/* Live Chat Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Live Chat</h3>
              <p className="text-xs text-emerald-600 font-semibold flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Agents Online Now</span>
              </p>
            </div>
          </div>
          <p className="text-gray-600 text-xs mb-5">
            Chat with our support team directly in the app or via Telegram support.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{chatOpen ? 'Close Chat' : 'In-App Chat'}</span>
            </button>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all"
            >
              <span>Telegram Chat</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Collapsible In-App Chat */}
          {chatOpen && (
            <div className="mt-5 border-t border-gray-100 pt-4">
              <div className="bg-gray-50 rounded-2xl p-4 h-64 overflow-y-auto space-y-3 mb-3 border border-gray-200 text-xs">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-3 ${
                        m.sender === 'user'
                          ? 'bg-purple-600 text-white rounded-br-none'
                          : 'bg-white text-gray-800 shadow-xs border border-gray-200 rounded-bl-none'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendChat} className="flex space-x-2">
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder="Type your question..."
                  className="flex-1 p-2.5 border border-gray-300 rounded-xl text-xs outline-none focus:border-purple-600"
                />
                <button
                  type="submit"
                  className="bg-purple-600 text-white px-3.5 rounded-xl hover:bg-purple-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* WhatsApp Support Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">WhatsApp Support</h3>
              <p className="text-xs text-gray-500">Official PayGo Group & Representative</p>
            </div>
          </div>
          <p className="text-gray-600 text-xs mb-5">
            Chat with our support team on WhatsApp for quick assistance, payment confirmations, and community updates.
          </p>
          <button
            onClick={openWhatsApp}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Join WhatsApp Support</span>
          </button>
        </div>

        {/* FAQs */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-purple-600" />
            <span>Frequently Asked Questions</span>
          </h3>
          <div className="space-y-2.5">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full p-3.5 text-left font-semibold text-xs text-gray-800 flex items-center justify-between hover:bg-gray-50"
                >
                  <span>{faq.q}</span>
                  {activeFaq === i ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {activeFaq === i && (
                  <div className="p-3.5 bg-gray-50 text-xs text-gray-600 border-t border-gray-100 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-gray-400 pt-4 space-y-1">
          <p className="font-semibold text-gray-600">Financial Services</p>
          <p>PayGo © 2026. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};
