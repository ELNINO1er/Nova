import {
  Award, BarChart3, Bell, Brain, Building2, CalendarClock, ClipboardList, FileDown, FileText, FolderHeart, Home,
  HeartPulse, Lock, MessageCircle, Microscope, Pill, ScanLine, ServerCog, Settings, ShieldCheck, Stethoscope,
  Sun, Syringe, TrendingUp, User, Users, Activity, Droplet, StickyNote, Target, ShieldAlert, Edit3, History,
} from 'lucide-react';

export const ROLE_PAGES = {
  patient: ['dashboard','profile','vitals','pilulier','treatments','rdv','vaccinations','dna','labresults','history','notifications','messages','prescriptions','documents','notes','doctors','pharmacy','urgence','assistant','wellness','insurance','family','privacy','settings'],
  doctor: ['dashboard','patients','agenda','consultations','prescriptions','lab-requests','stats','chronic-patients','urgences','assistant-ia','finances','reputation','signature','messages','documents','profile','settings','notifications'],
  pharmacist: ['dashboard','scan','history','settings'],
  admin: ['dashboard','audit','users','system','settings'],
  governor: ['dashboard'],
};

/*
 * Espaces de travail par rôle (logique métier) : 4 à 6 entrées dans la barre latérale,
 * chacune regroupant ses pages en onglets. Les identifiants de pages restent ceux de ROLE_PAGES
 * (URL /role/page inchangées). Pages hors espace : accessibles par le header
 * (SOS « urgence », cloche « notifications », bouton flottant « assistant »).
 * Une page `b` porte le nom du compteur à afficher (badges.messages, badges.notifications).
 */
export const ROLE_SPACES = {
  patient: [
    { id: 'today', label: 'Aujourd’hui', Icon: Sun, pages: [{ id: 'dashboard', label: 'Aujourd’hui', Icon: Home }] },
    { id: 'record', label: 'Mon dossier', Icon: FolderHeart, pages: [
      { id: 'history', label: 'Consultations', Icon: ClipboardList },
      { id: 'dna', label: 'Infos médicales', Icon: Droplet },
      { id: 'vitals', label: 'Constantes', Icon: Activity },
      { id: 'labresults', label: 'Analyses', Icon: Microscope },
      { id: 'vaccinations', label: 'Vaccinations', Icon: Syringe },
      { id: 'documents', label: 'Documents', Icon: FileText },
      { id: 'notes', label: 'Mes notes', Icon: StickyNote },
    ]},
    { id: 'treatments', label: 'Mes traitements', Icon: Pill, pages: [
      { id: 'prescriptions', label: 'Ordonnances', Icon: FileDown },
      { id: 'pilulier', label: 'Prises prévues', Icon: Pill },
      { id: 'treatments', label: 'Suivi', Icon: HeartPulse },
      { id: 'pharmacy', label: 'Pharmacies', Icon: Building2 },
    ]},
    { id: 'care', label: 'Mes rendez-vous', Icon: CalendarClock, pages: [
      { id: 'rdv', label: 'Rendez-vous', Icon: CalendarClock },
      { id: 'doctors', label: 'Trouver un médecin', Icon: Stethoscope },
      { id: 'messages', label: 'Messages', Icon: MessageCircle, b: 'messages' },
    ]},
    { id: 'wellness', label: 'Bien-être', Icon: Target, pages: [{ id: 'wellness', label: 'Bien-être', Icon: Target }] },
    { id: 'account', label: 'Partage et compte', Icon: Lock, pages: [
      { id: 'privacy', label: 'Accès au dossier', Icon: Lock },
      { id: 'profile', label: 'Identité', Icon: User },
      { id: 'family', label: 'Famille', Icon: Users },
      { id: 'insurance', label: 'Assurance', Icon: ShieldCheck },
      { id: 'settings', label: 'Paramètres et export', Icon: Settings },
    ]},
  ],
  doctor: [
    { id: 'today', label: 'Ma journée', Icon: Sun, pages: [
      { id: 'dashboard', label: 'Aujourd’hui', Icon: BarChart3 },
      { id: 'agenda', label: 'Agenda', Icon: CalendarClock },
      { id: 'urgences', label: 'Alertes', Icon: ShieldAlert },
      { id: 'notifications', label: 'Notifications', Icon: Bell },
    ]},
    { id: 'patients', label: 'Mes patients', Icon: Users, action: 'createPatient', pages: [
      { id: 'patients', label: 'Patients', Icon: Users },
      { id: 'chronic-patients', label: 'Suivi chroniques', Icon: HeartPulse },
    ]},
    { id: 'care', label: 'Consultation', Icon: Stethoscope, pages: [
      { id: 'consultations', label: 'Consultations', Icon: ClipboardList },
      { id: 'prescriptions', label: 'Ordonnances', Icon: FileDown },
      { id: 'lab-requests', label: 'Analyses', Icon: Microscope },
      { id: 'assistant-ia', label: 'Aide-mémoire', Icon: Brain },
    ]},
    { id: 'inbox', label: 'Échanges', Icon: MessageCircle, pages: [
      { id: 'messages', label: 'Messages', Icon: MessageCircle, b: 'messages' },
      { id: 'documents', label: 'Documents', Icon: FileText },
    ]},
    { id: 'practice', label: 'Mon cabinet', Icon: Building2, pages: [
      { id: 'profile', label: 'Profil et disponibilités', Icon: User },
      { id: 'stats', label: 'Activité', Icon: TrendingUp },
      { id: 'finances', label: 'Finances', Icon: TrendingUp },
      { id: 'reputation', label: 'Avis', Icon: Award },
      { id: 'signature', label: 'Signature', Icon: Edit3 },
      { id: 'settings', label: 'Paramètres', Icon: Settings },
    ]},
  ],
  pharmacist: [
    { id: 'home', label: 'Accueil', Icon: Home, pages: [{ id: 'dashboard', label: 'Accueil', Icon: Home }] },
    { id: 'scan', label: 'Scanner une ordonnance', Icon: ScanLine, pages: [{ id: 'scan', label: 'Scanner', Icon: ScanLine }] },
    { id: 'history', label: 'Délivrances', Icon: History, pages: [{ id: 'history', label: 'Historique', Icon: History }] },
    { id: 'shop', label: 'Officine', Icon: Building2, pages: [{ id: 'settings', label: 'Paramètres', Icon: Settings }] },
  ],
  admin: [
    { id: 'home', label: 'Tableau de bord', Icon: BarChart3, pages: [{ id: 'dashboard', label: 'Tableau de bord', Icon: BarChart3 }] },
    { id: 'accounts', label: 'Comptes', Icon: Users, pages: [{ id: 'users', label: 'Comptes et établissements', Icon: Users }] },
    { id: 'security', label: 'Sécurité', Icon: Lock, pages: [{ id: 'audit', label: 'Journal d’audit', Icon: Lock }] },
    { id: 'system', label: 'Système', Icon: ServerCog, pages: [
      { id: 'system', label: 'État du service', Icon: ServerCog },
      { id: 'settings', label: 'Paramètres', Icon: Settings },
    ]},
  ],
  governor: [
    { id: 'situation', label: 'Situation sanitaire', Icon: BarChart3, pages: [{ id: 'dashboard', label: 'Indicateurs', Icon: BarChart3 }] },
  ],
};

// Rôles dont les pages d'un espace s'affichent en sous-menu dans la barre latérale (au lieu d'onglets en haut).
export const SIDEBAR_SUBMENU_ROLES = ['patient'];

export function spaceOf(role, page) {
  return ROLE_SPACES[role]?.find((s) => s.pages.some((p) => p.id === page)) || null;
}
