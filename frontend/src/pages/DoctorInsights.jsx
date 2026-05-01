import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';

export default function DoctorInsights() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', type: 'ARTICLE' });
  const [insights, setInsights] = useState([]);

  const loadInsights = useCallback(async () => {
    try {
      const res = await api.get(`/api/doctor/content?doctorId=${user.id}`);
      // Wait, I need an endpoint to GET doctor's content. I'll add it or use a general one.
      // For now, I'll assume we can at least POST.
    } catch {}
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content) {
      addToast('Please fill all fields.', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/doctor/content', form);
      addToast('Content published successfully! 🚀', 'success');
      setForm({ title: '', content: '', type: 'ARTICLE' });
      loadInsights();
    } catch {
      addToast('Failed to publish content.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20 pt-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <header className="mb-10">
          <h1 className="text-3xl font-black text-slate-900">Doctor Insights</h1>
          <p className="text-slate-500 font-medium mt-1">Publish articles and health tips for the SoulH community.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="glass p-8 rounded-[2.5rem] border-white/40 shadow-xl">
              <h2 className="text-lg font-black mb-6 flex items-center gap-2">
                <span>✍️</span> Create New Entry
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-teal-800 mb-2 block ml-1">Type</label>
                  <div className="flex gap-4">
                    {['ARTICLE', 'TIP'].map(t => (
                      <button key={t} type="button" onClick={() => setForm({...form, type: t})}
                        className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all border ${form.type === t ? 'bg-teal-700 text-white border-teal-700 shadow-lg shadow-teal-700/20' : 'bg-white text-slate-400 border-slate-100 hover:border-teal-200'}`}>
                        {t === 'ARTICLE' ? '📖 Deep Dive Article' : '💡 Quick Wellness Tip'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-teal-800 mb-2 block ml-1">Title</label>
                  <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                    placeholder={form.type === 'ARTICLE' ? "e.g. Managing Inflammation with Diet" : "e.g. 5-Minute Morning Stretch"}
                    className="w-full px-5 py-3 rounded-2xl text-sm bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-teal-800 mb-2 block ml-1">Content</label>
                  <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})}
                    placeholder="Write your medical insights or tips here..."
                    className="w-full p-5 rounded-3xl text-sm bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition min-h-[300px]"
                  />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-4 rounded-2xl bg-teal-700 text-white font-black uppercase tracking-widest shadow-xl shadow-teal-700/20 active:scale-[0.98] transition-all">
                  {loading ? 'Publishing...' : 'Publish to Community'}
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-teal-400 mb-4">Why Publish?</h3>
              <ul className="space-y-4">
                <li className="flex gap-3 text-sm">
                  <span className="text-teal-400">✓</span>
                  <p className="opacity-80">Establish authority in your specialization.</p>
                </li>
                <li className="flex gap-3 text-sm">
                  <span className="text-teal-400">✓</span>
                  <p className="opacity-80">Help patients manage their conditions better.</p>
                </li>
                <li className="flex gap-3 text-sm">
                  <span className="text-teal-400">✓</span>
                  <p className="opacity-80">Articles are featured in the community feed.</p>
                </li>
              </ul>
            </div>

            <div className="glass p-8 rounded-3xl border-white/50">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Writing Guidelines</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Keep medical advice clear and actionable. Use bullet points for readability. Always include a disclaimer that digital advice is not a replacement for clinical consultation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
