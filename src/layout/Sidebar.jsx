import React from 'react';
import { ROLE_SPACES } from '../navigation.js';
import { Plus, Sparkles, UserPlus } from 'lucide-react';

/* ============== SIDEBAR ============== */
// Contact support configurable (VITE_SUPPORT_WHATSAPP prioritaire, sinon VITE_SUPPORT_EMAIL) ; carte masquée sinon.
const SUPPORT_WHATSAPP = String(import.meta.env.VITE_SUPPORT_WHATSAPP || '').replace(/\D/g, '');
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || '';
const SUPPORT_HREF = SUPPORT_WHATSAPP ? `https://wa.me/${SUPPORT_WHATSAPP}` : SUPPORT_EMAIL ? `mailto:${SUPPORT_EMAIL}` : '';
const SUPPORT_HOURS = import.meta.env.VITE_SUPPORT_HOURS || '';

export default function Sidebar({ role, page, setPage, sbOpen, onCP, badges = {}, darkMode, sub, border }) {
  // Un espace = une entrée ; son compteur additionne ceux de ses onglets.
  const spaces = (ROLE_SPACES[role] || []).map((sp) => ({
    ...sp,
    b: sp.pages.reduce((sum, pg) => sum + (pg.b ? Number(badges[pg.b]) || 0 : 0), 0),
    active: sp.pages.some((pg) => pg.id === page),
  }));
  const actions = { createPatient: { l: 'Nouveau patient', I: UserPlus, on: onCP } };

  const sbBg = darkMode ? 'bg-slate-950' : 'bg-white';
  const act = 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md shadow-red-600/20';
  const ina = darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100';

  return (
    <aside className={`${sbBg} border-r ${border} fixed lg:sticky lg:top-[57px] top-0 left-0 z-50 lg:z-30 w-64 h-screen lg:h-[calc(100vh-57px)] transition-transform duration-300 ${sbOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col`}>
      <nav className="flex-1 p-3 overflow-y-auto" aria-label="Espaces">
        <div className="space-y-1">
          {spaces.map((sp) => {
            const action = sp.action && actions[sp.action];
            return (
              <div key={sp.id}>
                <button aria-current={sp.active ? 'page' : undefined} onClick={() => setPage(sp.pages[0].id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${sp.active ? act : ina}`}>
                  <sp.Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left truncate">{sp.label}</span>
                  {sp.b > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${sp.active ? 'bg-white text-red-600' : 'bg-red-600 text-white'}`}>{sp.b}</span>}
                </button>
                {action && (
                  <button onClick={action.on} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold border-2 border-dashed mt-1 ${darkMode ? 'border-slate-700 text-slate-400 hover:border-red-600' : 'border-slate-300 text-slate-600 hover:border-red-600 hover:text-red-600'}`}>
                    <action.I className="w-4 h-4" />
                    <span className="flex-1 text-left">{action.l}</span>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </nav>
      {SUPPORT_HREF && (
        <div className={`p-3 border-t ${border}`}>
          <div className="p-3 rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-400/30 rounded-full -translate-y-10 translate-x-10 blur-2xl"></div>
            <div className="relative">
              <Sparkles className="w-4 h-4 mb-1" />
              <p className="text-xs font-bold">Aide & Support</p>
              {SUPPORT_HOURS && <p className="text-[10px] text-red-100 mt-1">{SUPPORT_HOURS}</p>}
              <a href={SUPPORT_HREF} target="_blank" rel="noreferrer" className="mt-2 block w-full text-center bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold py-1.5 rounded-lg">Contacter</a>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
