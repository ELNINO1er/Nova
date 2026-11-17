import { Bell, Calendar, FileText, MessageCircle, Microscope, Pill, Share2, ShieldAlert, ShieldCheck, Stethoscope, Syringe } from 'lucide-react';

/* Type de notification → icône, libellé lisible et famille de filtre. */
export const NOTIFICATION_TYPES = {
  appointment:  { Icon: Calendar,      label: 'Rendez-vous',   group: 'appointment' },
  consultation: { Icon: Stethoscope,   label: 'Consultation',  group: 'appointment' },
  referral:     { Icon: Share2,        label: 'Orientation',   group: 'appointment' },
  prescription: { Icon: FileText,      label: 'Ordonnance',    group: 'medication' },
  medication:   { Icon: Pill,          label: 'Médicament',    group: 'medication' },
  pharmacy:     { Icon: Pill,          label: 'Pharmacie',     group: 'medication' },
  dispense:     { Icon: Pill,          label: 'Délivrance',    group: 'medication' },
  lab_result:   { Icon: Microscope,    label: 'Résultat',      group: 'result' },
  result:       { Icon: Microscope,    label: 'Résultat',      group: 'result' },
  vaccine:      { Icon: Syringe,       label: 'Vaccination',   group: 'other' },
  message:      { Icon: MessageCircle, label: 'Message',       group: 'message' },
  consent:      { Icon: ShieldCheck,   label: 'Accès dossier', group: 'other' },
  emergency:    { Icon: ShieldAlert,   label: 'Fiche d’urgence', group: 'other' },
  system:       { Icon: Bell,          label: 'Information',   group: 'other' },
};
export const notificationType = (n) => NOTIFICATION_TYPES[n?.type] || NOTIFICATION_TYPES.system;
