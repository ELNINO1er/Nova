import React from 'react';
import { SIDEBAR_SUBMENU_ROLES, spaceOf } from '../navigation.js';

/* Onglets de l'espace courant : chaque onglet est une page existante (URL /role/page). */
export default function SpaceTabs({ role, page, setPage, badges = {}, darkMode }) {
  const space = spaceOf(role, page);
  if (!space || space.pages.length < 2 || SIDEBAR_SUBMENU_ROLES.includes(role)) return null;
  const idle = darkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100';
  return (
    <nav aria-label={space.label} className={`-mx-4 sm:mx-0 mb-5 px-4 sm:px-0 border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
      <div className="flex gap-1 overflow-x-auto">
        {space.pages.map((pg) => {
          const active = pg.id === page;
          const count = pg.b ? Number(badges[pg.b]) || 0 : 0;
          return (
            <button key={pg.id} type="button" onClick={() => setPage(pg.id)} aria-current={active ? 'page' : undefined}
              className={`shrink-0 flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px ${active ? 'border-red-600 text-red-700' : `border-transparent ${idle}`}`}>
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
