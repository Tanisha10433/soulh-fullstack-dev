import React, { useEffect, useState } from 'react';

import { MessageCircleHeart, Stethoscope, HeartPulse, HeartHandshake, Compass } from 'lucide-react';

// --- Premium Icon Illustrations ---

const IllustrationBadge = ({ Icon }) => (
  <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-500">
    <div className="absolute inset-0 bg-teal-50 rounded-[2.5rem] rotate-3 group-hover:rotate-6 transition-transform duration-500" />
    <div className="absolute inset-2 bg-teal-100/50 rounded-full -rotate-6 group-hover:-rotate-12 transition-transform duration-500" />
    <Icon className="relative z-10 w-12 h-12 text-teal-600" strokeWidth={1.5} />
  </div>
);


// --- Component ---

export default function WhyChooseDoctors() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const cards = [
    {
      id: 1,
      title: 'We Listen — For Real',
      desc: <>No <span className="text-slate-400 italic">"it's all in your head"</span> here. Your symptoms are <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-500 font-bold tracking-wide">real</span>, and we take them <span className="text-slate-800 font-semibold">seriously</span>.</>,
      illustration: <IllustrationBadge Icon={MessageCircleHeart} />
    },
    {
      id: 2,
      title: 'Beyond Generic Advice',
      desc: <>Not just <span className="text-slate-400 italic">"drink water"</span> and <span className="text-slate-400 italic">"do yoga"</span>. We focus on understanding your <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-500 font-bold tracking-wide">actual condition</span>.</>,
      illustration: <IllustrationBadge Icon={Stethoscope} />
    },
    {
      id: 3,
      title: 'Chronic Illness Aware',
      desc: <>Our doctors <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-500 font-bold tracking-wide">truly understand</span> long-term conditions like <span className="text-slate-800 font-medium">endometriosis</span> and <span className="text-slate-800 font-medium">fibromyalgia</span>.</>,
      illustration: <IllustrationBadge Icon={HeartPulse} />
    },
    {
      id: 4,
      title: 'Safe & Judgment-Free',
      desc: <><span className="text-slate-400 italic">No dismissals. No awkward reactions.</span> Just <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-500 font-bold tracking-wide">honest, supportive,</span> and <span className="text-slate-800 font-semibold">validating</span> guidance.</>,
      illustration: <IllustrationBadge Icon={HeartHandshake} />
    },
    {
      id: 5,
      title: 'Guidance, Not Pressure',
      desc: <>We <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-500 font-bold tracking-wide">guide you</span>, not overwhelm you. Second opinions that <span className="text-slate-800 font-semibold">actually make sense</span>.</>,
      illustration: <IllustrationBadge Icon={Compass} />
    }
  ];

  return (
    <div className={`py-16 transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="text-center mb-16 px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight mb-3">
          Why Our Guides Are Different
        </h2>
        <p className="text-teal-700 font-medium text-lg mb-6 italic">
          "We know what it feels like to not be heard."
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {/* Top row: 3 cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {cards.slice(0, 3).map((card) => (
            <div key={card.id} 
              className="bg-white rounded-2xl shadow-sm hover:shadow-lg hover:scale-[1.03] transition-all duration-300 p-8 text-center flex flex-col items-center group border border-slate-50"
            >
              {card.illustration}
              <h3 className="font-semibold text-lg text-slate-800 mb-3 tracking-tight">
                {card.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {card.desc}
              </p>
            </div>
          ))}
        </div>
        
        {/* Bottom row: 2 cards centered */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 lg:px-40">
          {cards.slice(3, 5).map((card) => (
            <div key={card.id} 
              className="bg-white rounded-2xl shadow-sm hover:shadow-lg hover:scale-[1.03] transition-all duration-300 p-8 text-center flex flex-col items-center group border border-slate-50"
            >
              {card.illustration}
              <h3 className="font-semibold text-lg text-slate-800 mb-3 tracking-tight">
                {card.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
