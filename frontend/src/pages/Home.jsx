import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Animated count-up hook using IntersectionObserver
function useCountUp(target, duration = 1800) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setStarted(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started || target === 0) return;
    let frame;
    const startTime = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) frame = requestAnimationFrame(animate);
      else setCount(target);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [started, target, duration]);

  return [count, ref];
}

function AnimatedStat({ icon, num, label, target, suffix }) {
  const [count, ref] = useCountUp(target || 0);
  return (
    <div ref={ref} className="text-center">
      <p className="text-3xl mb-2">{icon}</p>
      <p className="text-2xl font-black" style={{ color: '#0d6b5e' }}>
        {target ? count.toLocaleString() : num}{suffix || ''}
      </p>
      <p className="text-xs font-semibold uppercase tracking-widest mt-1" style={{ color: '#8aada5' }}>{label}</p>
    </div>
  );
}

const CONDITIONS = [
  { name: 'Diabetes',           icon: '🩸', peers: '2.1k peers' },
  { name: 'Anxiety',            icon: '🧠', peers: '3.4k peers' },
  { name: 'Depression',         icon: '💙', peers: '4.2k peers' },
  { name: 'PCOS',               icon: '🌸', peers: '1.8k peers' },
  { name: 'Lupus',              icon: '🦋', peers: '890 peers'  },
  { name: 'Fibromyalgia',       icon: '⚡', peers: '1.2k peers' },
  { name: 'Rheumatoid Arthritis', icon: '🦴', peers: '2.5k peers' },
  { name: "Crohn's Disease",    icon: '🏥', peers: '760 peers'  },
  { name: 'Multiple Sclerosis', icon: '🧬', peers: '650 peers'  },
  { name: 'Thyroid Disorders',  icon: '🔬', peers: '1.4k peers' },
  { name: 'Chronic Pain',       icon: '💊', peers: '3.1k peers' },
  { name: 'Heart Disease',      icon: '❤️', peers: '970 peers'  },
];

const HOW_IT_WORKS = [
  {
    num: '01', icon: '📝',
    title: 'Create Your Profile',
    desc: 'Sign up for free, share your condition, and set your privacy preferences. You\'re always in full control of your data.',
    color: 'rgba(13,107,94,0.08)', border: 'rgba(13,107,94,0.18)',
  },
  {
    num: '02', icon: '🔍',
    title: 'Find Your People',
    desc: 'Search by your specific illness — diabetes, lupus, anxiety, and 12+ more. Filter through thousands of real peers.',
    color: 'rgba(232,119,106,0.08)', border: 'rgba(232,119,106,0.22)',
  },
  {
    num: '03', icon: '💬',
    title: 'Connect & Heal Together',
    desc: 'Send a connection request and chat privately. Use voice messaging when typing feels too hard on tough days.',
    color: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)',
  },
];

const FEATURES = [
  { icon: '🤝', title: 'Real Peer Support',       desc: 'Connect with people living your exact experience — not just advice, but true understanding.' },
  { icon: '🔒', title: 'Full Privacy Control',    desc: 'Your health data, your rules. Public or private — flip a switch anytime.' },
  { icon: '🎤', title: 'Voice Messaging',          desc: 'Too exhausted to type? Speak instead. Built specifically for chronic illness fatigue.' },
  { icon: '👨‍⚕️', title: 'Doctor Verified',    desc: 'Certified doctors can earn a verified badge, giving extra credibility to their support.' },
  { icon: '🧭', title: 'Condition-Based Search',  desc: 'Not a generic social network. Search specifically by medical condition and truly find your people.' },
  { icon: '🛡️', title: 'Safe & Moderated',       desc: 'A judgment-free zone monitored for safety so you can share openly without fear.' },
];

const QUOTES = [
  { text: "Finding someone with the same condition changed everything. I finally felt less alone.", author: "Priya, living with Lupus" },
  { text: "I didn't know anyone else with fibromyalgia until SoulH. Now I have 4 people who truly get my pain.", author: "Rahul, Fibromyalgia" },
  { text: "On bad flare days I use voice messages. It's the only app that thought about that.", author: "Sara, Rheumatoid Arthritis" },
];

export default function Home() {
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [quoteVisible, setQuoteVisible] = useState(true);
  const [searchCondition, setSearchCondition] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const t = setInterval(() => {
      setQuoteVisible(false);
      setTimeout(() => {
        setQuoteIdx(i => (i + 1) % QUOTES.length);
        setQuoteVisible(true);
      }, 400);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  const handleConditionSearch = (e) => {
    e.preventDefault();
    if (searchCondition.trim()) navigate('/signup');
  };

  const quote = QUOTES[quoteIdx];

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">

      {/* Soft health-toned orbs */}
      <div className="orb w-[700px] h-[700px] top-[-300px] left-[-200px]" style={{ background: 'rgba(13,107,94,0.12)', animationDelay: '0s' }} />
      <div className="orb w-[500px] h-[500px] top-[-100px] right-[-150px]" style={{ background: 'rgba(232,119,106,0.1)', animationDelay: '3s' }} />
      <div className="orb w-[400px] h-[400px] bottom-[10%] left-[20%]" style={{ background: 'rgba(245,158,11,0.08)', animationDelay: '6s' }} />

      {/* ── HERO ──────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-28 pb-16 page-enter">

        {/* Top badge */}
        <div className="flex items-center gap-2 mb-8 px-5 py-2.5 rounded-full" style={{ background: 'rgba(13,107,94,0.08)', border: '1px solid rgba(13,107,94,0.2)' }}>
          <span className="w-2 h-2 rounded-full animate-pulse inline-block" style={{ background: '#0d6b5e' }} />
          <span className="text-sm font-semibold" style={{ color: '#0d6b5e' }}>Peer-to-Peer Chronic Illness Support</span>
          <span className="text-xs font-semibold ml-1" style={{ color: '#0f8b7a', opacity: 0.7 }}>• 100% Free</span>
        </div>

        {/* Main headline */}
        <h1 className="font-black leading-[1.1] tracking-tight mb-6 max-w-4xl" style={{ fontSize: 'clamp(2.8rem, 8vw, 5.5rem)' }}>
          <span style={{ color: '#1a3530' }}>You Deserve Someone</span>
          <br />
          <span className="gradient-text">Who Truly Gets It</span>
        </h1>

        <p style={{ color: '#4a7060' }} className="text-lg md:text-xl max-w-2xl mb-10 leading-relaxed font-medium">
          SoulH connects people living with <strong style={{ color: '#0d6b5e' }}>chronic illness</strong> to genuine peers who share their exact condition — for real understanding, private chat, and mutual healing.
        </p>

        {/* Condition search bar */}
        <form onSubmit={handleConditionSearch} className="w-full max-w-xl mb-8">
          <div className="flex gap-3 glass p-2 rounded-2xl" style={{ boxShadow: '0 8px 32px rgba(13,107,94,0.12)' }}>
            <input
              type="text"
              value={searchCondition}
              onChange={e => setSearchCondition(e.target.value)}
              placeholder="Search your condition: Diabetes, Lupus, PCOS..."
              className="input-field flex-1 border-0 shadow-none bg-transparent"
              style={{ padding: '12px 16px', boxShadow: 'none', border: 'none', background: 'transparent' }}
            />
            <button type="submit" className="btn-primary flex-shrink-0" style={{ borderRadius: '14px', padding: '12px 24px' }}>
              Find Peers →
            </button>
          </div>
        </form>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Link to="/signup" className="btn-primary text-base px-10 py-4">
            🌱 Join Free — Find Your People
          </Link>
          <Link to="/login" className="btn-ghost text-base px-10 py-4">
            Already a member? Sign In
          </Link>
        </div>

        {/* Trust strip */}
        <div className="flex items-center gap-8 flex-wrap justify-center">
          {[
            { icon: '🔒', label: 'Privacy First' },
            { icon: '👨‍⚕️', label: 'Doctor Verified' },
            { icon: '🎤', label: 'Voice Ready' },
            { icon: '💯', label: 'No Cost, Ever' },
            { icon: '🛡️', label: 'Safe Community' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-lg">{s.icon}</span>
              <span className="text-sm font-semibold" style={{ color: '#4a7060' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CONDITIONS WE SUPPORT ───────────────────── */}
      <section className="relative z-10 px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="section-label">Conditions We Support</p>
            <h2 className="text-3xl md:text-4xl font-black mb-3" style={{ color: '#1a3530' }}>
              Find Peers With Your <span className="gradient-text">Exact Condition</span>
            </h2>
            <p style={{ color: '#4a7060' }} className="text-base max-w-xl mx-auto">
              Search from 12+ chronic illnesses. Real people, real experiences, zero judgment.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            {CONDITIONS.map(c => (
              <Link to="/signup" key={c.name} className="condition-chip">
                <span className="text-lg">{c.icon}</span>
                <span className="font-semibold" style={{ color: '#1a3530' }}>{c.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(13,107,94,0.1)', color: '#0d6b5e' }}>
                  {c.peers}
                </span>
              </Link>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link to="/signup" style={{ color: '#0d6b5e' }} className="text-sm font-semibold hover:underline">
              + Don't see your condition? Join and add it →
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────── */}
      <section className="relative z-10 px-6 py-16" style={{ background: 'rgba(255,255,255,0.5)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="section-label">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-black" style={{ color: '#1a3530' }}>
              Three Simple Steps to <span className="gradient-text-teal">Your Support Circle</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.num} className="step-card" style={{ borderColor: step.border, background: `${step.color}` }}>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-3xl">{step.icon}</span>
                  <span className="text-sm font-black" style={{ color: '#0d6b5e', opacity: 0.5 }}>Step {step.num}</span>
                </div>
                <h3 className="text-xl font-black mb-3" style={{ color: '#1a3530' }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#4a7060' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS (animated) ─────────────────────────── */}
      <section className="relative z-10 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="glass p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <AnimatedStat icon="🏥" num="12+"  label="Conditions Supported" target={12}  suffix="+" />
              <AnimatedStat icon="👥" num="50k+" label="Community Members"    target={50000} suffix="+" />
              <AnimatedStat icon="💯" num="100%" label="Free Forever"         target={100}  suffix="%" />
              <AnimatedStat icon="👨‍⚕️" num="✓"  label="Doctor Verified"      target={0} />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────── */}
      <section className="relative z-10 px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="section-label">Why SoulH</p>
            <h2 className="text-3xl md:text-4xl font-black" style={{ color: '#1a3530' }}>
              Built <em>For</em> Chronic Illness, <span className="gradient-text">Not Just Adapted</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} className="glass-hover p-6 text-left">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4" style={{ background: 'rgba(13,107,94,0.08)', border: '1px solid rgba(13,107,94,0.12)' }}>
                  {icon}
                </div>
                <h3 className="font-bold mb-2" style={{ color: '#1a3530' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#4a7060' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT / MISSION ──────────────────────────── */}
      <section className="relative z-10 px-6 py-16" style={{ background: 'rgba(255,255,255,0.55)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="section-label">Our Mission</p>
              <h2 className="text-3xl md:text-4xl font-black mb-5 leading-tight" style={{ color: '#1a3530' }}>
                No One Should Manage<br /><span className="gradient-text">Chronic Illness Alone</span>
              </h2>
              <p className="text-base leading-relaxed mb-4" style={{ color: '#4a7060' }}>
                Living with a chronic condition can be deeply isolating — 
                the endless doctor visits, the "results are normal" conversations, 
                the exhaustion that no one around you quite understands.
              </p>
              <p className="text-base leading-relaxed mb-6" style={{ color: '#4a7060' }}>
                <strong style={{ color: '#0d6b5e' }}>SoulH was built to change that.</strong> We believe that peer connection 
                — talking to someone who truly <em>lives</em> your experience — 
                is one of the most powerful forms of healing.
              </p>
              <Link to="/signup" className="btn-primary" style={{ display: 'inline-flex' }}>
                🌱 Join the Community
              </Link>
            </div>
            <div className="space-y-4">
              {[
                { icon: '❤️', title: 'Empathy Over Advice', desc: 'We prioritize real human connection. SoulH is not a Q&A site — it\'s a community.' },
                { icon: '🔬', title: 'Built Around Conditions', desc: 'Not generic wellness. Every feature is designed with chronic illness realities in mind.' },
                { icon: '🛡️', title: 'Safety First', desc: 'No ads, no data selling. Your health information stays private — always.' },
                { icon: '🌍', title: 'Always Free', desc: 'Healthcare is already expensive enough. SoulH will always be 100% free to use.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4 p-4 rounded-2xl"
                  style={{ background: 'rgba(13,107,94,0.05)', border: '1px solid rgba(13,107,94,0.1)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: 'rgba(13,107,94,0.1)' }}>
                    {icon}
                  </div>
                  <div>
                    <p className="font-bold text-sm mb-1" style={{ color: '#1a3530' }}>{title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: '#4a7060' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ──────────────────────────────── */}
      <section className="relative z-10 px-6 py-12" style={{ background: 'rgba(13,107,94,0.04)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-4xl mb-6">💙</p>
          <div
            style={{ opacity: quoteVisible ? 1 : 0, transition: 'opacity 0.4s ease' }}
          >
            <p className="text-xl md:text-2xl font-semibold italic mb-4" style={{ color: '#1a3530', lineHeight: 1.5 }}>
              "{quote.text}"
            </p>
            <p className="font-bold text-sm" style={{ color: '#0d6b5e' }}>— {quote.author}</p>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {QUOTES.map((_, i) => (
              <button key={i} onClick={() => setQuoteIdx(i)}
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{ background: i === quoteIdx ? '#0d6b5e' : 'rgba(13,107,94,0.2)' }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── MEMES SECTION ────────────────────────────── */}
      <section className="relative z-10 px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="section-label">😂 Relatable Moments</p>
            <h2 className="text-3xl md:text-4xl font-black" style={{ color: '#1a3530' }}>
              If You Know, <span className="gradient-text">You Know</span>
            </h2>
            <p className="mt-3 text-base" style={{ color: '#4a7060' }}>
              Because sometimes all you can do is laugh with people who truly get it. 💛
            </p>
          </div>

          {/* Meme grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { src: '/meme1.png', caption: '"Results are normal" 🙂', tag: 'Every. Single. Time.' },
              { src: '/meme2.png', caption: 'Brain Fog Loading...', tag: 'Sorry, what were you saying?' },
              { src: '/meme3.png', caption: 'Spoon Theory IRL', tag: 'Used 2 spoons showering. RIP.' },
              { src: '/meme4.png', caption: 'Explaining to the doctor', tag: '"Drink more water" 💧' },
            ].map((meme, i) => (
              <div
                key={i}
                className="glass-hover overflow-hidden rounded-3xl flex flex-col"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="relative overflow-hidden" style={{ aspectRatio: '1/1' }}>
                  <img
                    src={meme.src}
                    alt={meme.caption}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    style={{ display: 'block' }}
                  />
                </div>
                <div className="p-4">
                  <p className="font-bold text-sm mb-1" style={{ color: '#1a3530' }}>{meme.caption}</p>
                  <p className="text-xs font-medium" style={{ color: '#8aada5' }}>{meme.tag}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Invite to join */}
          <div className="text-center mt-10">
            <p className="text-base font-medium mb-4" style={{ color: '#4a7060' }}>
              The SoulH community shares more moments like this every day. 😄
            </p>
            <a href="/signup" className="btn-primary" style={{ display: 'inline-flex' }}>
              🌱 Join & Connect With People Who Get It
            </a>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────── */}
      <section className="relative z-10 px-6 py-16">
        <div className="max-w-3xl mx-auto text-center glass p-12">
          <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: '#1a3530' }}>
            Ready to Find <span className="gradient-text">Your People?</span>
          </h2>
          <p style={{ color: '#4a7060' }} className="text-base mb-8 max-w-lg mx-auto leading-relaxed">
            Join thousands of people with chronic illness who found real connection, understanding, and hope — completely free.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup" className="btn-primary text-base px-10 py-4">
              🌱 Create Free Account
            </Link>
            <Link to="/login" className="btn-ghost text-base px-10 py-4">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── DISCLAIMER ───────────────────────────────── */}
      <footer className="relative z-10 px-6 pb-12">
        <div className="max-w-3xl mx-auto rounded-2xl p-5 flex items-start gap-4" style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.18)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{ background: 'rgba(220,38,38,0.1)' }}>⚠️</div>
          <div>
            <p className="font-bold text-xs uppercase tracking-widest mb-1" style={{ color: '#dc2626' }}>Medical Disclaimer</p>
            <p className="text-sm leading-relaxed" style={{ color: '#b91c1c' }}>
              SoulH is for <strong>peer-to-peer emotional support only</strong> and does <strong>not</strong> provide medical advice, diagnosis, or treatment. Always consult a licensed medical professional for health decisions.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
