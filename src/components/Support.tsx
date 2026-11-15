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

  const openTelegram = () => {
    window.open('https://t.me/Wfujw', '_blank');
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInputMsg('');

    setTimeout(() => {
      let reply = 'Thank you for your message. An agent is reviewing your inquiry.';
      if (userText.toLowerCase().includes('pay id') || userText.toLowerCase().includes('code')) {
        reply = 'To get your PAY ID, tap "Buy PAY ID" on the dashboard. Verify $25 via Gift Card or ATM Card to generate your unique verified code.';
      } else if (userText.toLowerCase().includes('withdraw') || userText.toLowerCase().includes('transfer')) {
        reply = 'Withdrawals are processed directly to your crypto wallet or trading exchange (Binance, Bybit, TrustWallet, OKX) once verified with your PAY ID.';
      } else if (userText.toLowerCase().includes('bonus')) {
        reply = 'Your $13,000 welcome bonus is already credited in your balance and unlocked via PAY ID!';
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
            <button
              onClick={openTelegram}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all"
            >
              <span>Telegram Chat</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
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
