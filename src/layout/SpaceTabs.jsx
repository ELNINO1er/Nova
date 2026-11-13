import React from 'react';
import { SIDEBAR_SUBMENU_ROLES, spaceOf } from '../navigation.js';

/* Onglets de l'espace courant : chaque onglet est une page existante (URL /role/page). */
export default function SpaceTabs({ role, page, setPage, badges = {}, darkMode }) {
  const space = spaceOf(role, page);
  if (!space || space.pages.length < 2 || SIDEBAR_SUBMENU_ROLES.includes(role)) return null;
  const idle = darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-red-50';
  const selected = darkMode ? 'bg-red-950 text-red-200' : 'bg-red-100 text-red-800';
  return (
    <nav aria-label={space.label} className={`mb-5 rounded-xl border p-1 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-red-100'}`}>
      <div className="flex gap-1 overflow-x-auto p-1">
        {space.pages.map((pg) => {
          const active = pg.id === page;
          const count = pg.b ? Number(badges[pg.b]) || 0 : 0;
          return (
            <button key={pg.id} type="button" onClick={() => setPage(pg.id)} aria-current={active ? 'page' : undefined}
              className={`shrink-0 flex min-h-11 items-center gap-2 px-3 text-sm font-semibold rounded-lg ${active ? selected : idle}`}>
              <pg.Icon className="w-4 h-4" />
              {pg.label}
              {count > 0 && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">{count}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
