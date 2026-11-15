import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PromoItem {
  title: string;
  subtitle: string;
  description?: string;
  image: string;
}

const PROMOS: PromoItem[] = [
  {
    title: "Transact & Win",
    subtitle: "Great prizes await",
    description: "All customers who pay with PayGo in store will stand a chance to win great prizes",
    image: "/lovable-uploads/3ce9f1fb-b753-4102-8a22-a51a0cf90c72.png",
  },
  {
    title: "Mobile Money",
    subtitle: "SPECIAL PROMO",
    description: "Special promotion for mobile money transactions",
    image: "/lovable-uploads/c33112b4-8b2b-4d2d-97d5-5db6d30d2254.png",
  },
  {
    title: "Winners",
    subtitle: "Daily Rewards",
    description: "Recent winners of airtime and cash prizes on PayGo",
    image: "/lovable-uploads/df8c5190-45dd-42bb-a63b-2d0ac0fe8e40.png",
  },
];

export const PromotionsCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % PROMOS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? PROMOS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % PROMOS.length);
  };

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-base font-bold text-gray-900">Current Promotions</h3>
        <div className="flex space-x-1.5">
          {PROMOS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentIndex ? 'w-6 bg-purple-600' : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden shadow-md group h-[220px] sm:h-[250px] bg-gray-900">
        {PROMOS.map((item, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
            }`}
          >
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback gradient card if image fails
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5 text-white">
              <span className="text-xs uppercase font-bold tracking-wider text-amber-400 mb-1">
                {item.subtitle}
              </span>
              <h4 className="text-xl font-bold">{item.title}</h4>
              {item.description && (
                <p className="text-xs text-gray-200 mt-1 line-clamp-2 max-w-sm">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        ))}

        <button
          onClick={handlePrev}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-xs transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={handleNext}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-xs transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
