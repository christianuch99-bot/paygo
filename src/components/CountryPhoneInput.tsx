import React, { useState, useRef, useEffect } from 'react';
import { COUNTRY_DIAL_CODES, CountryDialCode } from '../data/countryCodes';
import { ChevronDown, Search, Check } from 'lucide-react';

interface CountryPhoneInputProps {
  dialCode: string;
  onDialCodeChange: (code: string) => void;
  phoneDigits: string;
  onPhoneDigitsChange: (digits: string) => void;
  required?: boolean;
  ariaLabel?: string;
}

const CountryFlagLogo: React.FC<{ country: CountryDialCode }> = ({ country }) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [country.iso]);

  if (imgFailed) {
    return (
      <span
        className="inline-flex items-center justify-center w-6 h-4 rounded-[3px] bg-gray-100 border border-gray-200 text-xs leading-none shrink-0"
        title={country.name}
      >
        {country.flag}
      </span>
    );
  }

  const lowerIso = country.iso.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/w40/${lowerIso}.png`}
      srcSet={`https://flagcdn.com/w80/${lowerIso}.png 2x`}
      alt={`${country.name} flag`}
      width={24}
      height={16}
      loading="lazy"
      onError={() => setImgFailed(true)}
      className="w-6 h-4 object-cover rounded-[3px] border border-gray-200 shrink-0 shadow-2xs"
    />
  );
};

export const CountryPhoneInput: React.FC<CountryPhoneInputProps> = ({
  dialCode,
  onDialCodeChange,
  phoneDigits,
  onPhoneDigitsChange,
  required = false,
  ariaLabel = 'Phone number',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCountry =
    COUNTRY_DIAL_CODES.find((c) => c.code === dialCode) || COUNTRY_DIAL_CODES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 40);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleDigitsInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, '');
    if (dialCode === '+1' && digits.startsWith('1') && digits.length > 10) {
      digits = digits.slice(1);
    }
    onPhoneDigitsChange(digits.slice(0, 14));
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredCountries = q
    ? COUNTRY_DIAL_CODES.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.iso.toLowerCase().includes(q)
      )
    : COUNTRY_DIAL_CODES;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-purple-600 focus-within:border-purple-600 bg-white">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Select country code and flag"
          aria-expanded={isOpen}
          className="flex items-center space-x-2 bg-gray-50 hover:bg-gray-100 border-r border-gray-200 px-3 py-2.5 rounded-l-xl shrink-0 transition-colors cursor-pointer"
        >
          <CountryFlagLogo country={selectedCountry} />
          <span className="text-xs font-bold text-gray-800">{selectedCountry.code}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <input
          type="tel"
          value={phoneDigits}
          onChange={handleDigitsInput}
          placeholder={dialCode === '+1' ? '(555) 234-5678' : 'Enter phone number'}
          aria-label={ariaLabel}
          className="w-full px-3 py-2.5 outline-none text-gray-900 text-sm font-mono rounded-r-xl bg-transparent"
          required={required}
        />
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100 bg-gray-50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country or dial code (e.g. +1, Nigeria, UK)..."
                className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
            {filteredCountries.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500">
                No matching country found.
              </div>
            ) : (
              filteredCountries.map((country) => {
                const isSelected = country.code === selectedCountry.code && country.iso === selectedCountry.iso;
                return (
                  <button
                    key={`${country.iso}-${country.code}`}
                    type="button"
                    onClick={() => {
                      onDialCodeChange(country.code);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-purple-50 transition-colors cursor-pointer ${
                      isSelected ? 'bg-purple-50/80' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <CountryFlagLogo country={country} />
                      <span className="text-xs font-medium text-gray-800 truncate">{country.name}</span>
                      <span className="text-[10px] font-semibold text-gray-400 uppercase">{country.iso}</span>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0 ml-2">
                      <span className="text-xs font-bold text-purple-700 font-mono">{country.code}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-purple-600" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
