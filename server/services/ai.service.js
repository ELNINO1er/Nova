const EMERGENCY_TERMS = [
  'douleur poitrine', 'douleur thoracique', 'essoufflement', 'paralysie',
  'avc', 'suicide', 'perte de connaissance', 'convulsion', 'saignement abondant',
  'detresse respiratoire', 'détresse respiratoire',
];

const BLOCKED_CLINICAL_ACTIONS = [
  // Demandes de décision médicale (le mot « ordonnance » seul n'en est pas une : « où sont mes ordonnances ? »).
  'diagnostic', 'diagnostiquer', 'prescris', 'prescrire', 'prescrivez',
  'posologie', 'dose', 'antibiotique', 'arreter mon traitement', 'arrêter mon traitement',
];

const PATIENT_ADVICE = [
  // Orientation dans NOVA : les entrées les plus précises d'abord.
  { tags: ['annuler', 'deplacer', 'déplacer', 'reporter', 'modifier un rendez'],
    answer: "Ouvrez Rendez-vous et messages › Rendez-vous, choisissez le rendez-vous puis « Modifier » (le médecin devra reconfirmer la nouvelle heure) ou « Annuler ». Un rendez-vous passé ne peut plus être modifié." },
  { tags: ['prendre un rendez', 'prendre rendez', 'reserver', 'réserver'],
    answer: "Ouvrez Rendez-vous et messages › Trouver un médecin, choisissez un médecin puis un créneau libre et réservez. Vous pouvez aussi envoyer une demande depuis Rendez-vous et messages › Rendez-vous ; le médecin la confirme." },
  { tags: ['ordonnance'],
    answer: "Vos ordonnances sont dans Mes traitements › Ordonnances. Chacune a un QR à présenter en pharmacie, et le bouton « Envoyer à une pharmacie » pour la faire préparer avant de passer." },
  { tags: ['pharmacie'],
    answer: "Dans Mes traitements › Pharmacies, choisissez une officine et envoyez-lui une ordonnance active : elle vous prévient quand c'est prêt. Au comptoir, présentez le QR de l'ordonnance." },
  { tags: ['acces', 'accès', 'retirer', 'revoquer', 'révoquer', 'partage'],
    answer: "Ouvrez Partage et compte › Accès au dossier : vous voyez qui a accès à votre dossier et pouvez retirer un accès à tout moment, avec effet immédiat. Le journal d'accès montre chaque consultation." },
  { tags: ['allergie', 'antecedent', 'antécédent'],
    answer: "Ouvrez Mon dossier › Infos médicales : ajoutez ou retirez vos allergies, maladies chroniques et antécédents. Ce que vous déclarez est distingué de ce que votre médecin a saisi." },
  { tags: ['vaccin'],
    answer: "Votre carnet est dans Mon dossier › Vaccinations : dates d'injection, prochains rappels et rappels en retard. Le bouton « Imprimer mon carnet » produit une version papier." },
  { tags: ['message', 'ecrire', 'écrire', 'contacter mon medecin', 'contacter mon médecin'],
    answer: "Ouvrez Rendez-vous et messages › Messages, puis « Nouvelle conversation » et choisissez un médecin qui a accès à votre dossier. Vous pouvez joindre une ordonnance, une analyse ou un document." },
  { tags: ['urgence', 'qr'],
    answer: "En cas d'urgence vitale, appelez le 185 (SAMU). Votre fiche d'urgence et son QR, lisible par un secouriste avec l'appareil photo d'un téléphone, sont dans SOS Urgence." },
  { tags: ['marche', 'marcher', 'pas par jour'],
    answer: "Repère général pour un adulte : environ 30 minutes de marche active par jour, au moins 5 jours par semaine, ou 150 minutes par semaine. Adaptez avec votre médecin en cas de maladie cardiaque ou de douleur." },
  {
    tags: ['medicament', 'médicament', 'pilulier', 'comprime', 'comprimé', 'matin', 'soir'],
    answer: "Consultez Mes traitements › Prises prévues pour les horaires de prise du jour. Ne modifiez jamais une dose et n'arrêtez pas un traitement sans avis médical. En cas d'oubli répété, contactez votre médecin ou votre pharmacien.",
  },
  {
    tags: ['glycemie', 'glycémie', 'glucose', 'diabete', 'diabète'],
    answer: "Pour la glycémie, notez l'heure de mesure, le contexte (à jeun ou après repas) et vos symptômes éventuels. Une valeur isolée ne suffit pas pour conclure. Demandez une interprétation à votre médecin, surtout si les valeurs sont souvent hautes ou basses.",
  },
  {
    tags: ['tension', 'hypertension', 'pression'],
    answer: "Pour l'hypertension, mesurez votre tension au repos, bras posé, puis notez les valeurs dans NOVA. Limitez le sel, évitez l'automédication anti-inflammatoire et gardez vos rendez-vous de suivi.",
  },
  {
    tags: ['rendez-vous', 'rdv', 'consultation'],
    answer: "Vos rendez-vous sont visibles dans la section Rendez-vous. Si vos symptômes s'aggravent, avancez le rendez-vous ou contactez directement votre médecin.",
  },
  {
    tags: ['analyse', 'resultat', 'résultat', 'labo', 'laboratoire'],
    answer: "Les résultats de laboratoire doivent être interprétés avec votre contexte clinique, vos traitements et les seuils du laboratoire. NOVA peut vous aider à retrouver le document, mais l'interprétation revient à un professionnel de santé.",
  },
  {
    tags: ['alimentation', 'manger', 'sel', 'sport', 'activité', 'activite'],
    answer: "Conseil prévention général : privilégiez légumes, fruits, protéines maigres, hydratation suffisante et activité physique adaptée. Réduisez sel, alcool, tabac et aliments ultra-transformés.",
  },
];

const DOCTOR_ADVICE = [
  {
    tags: ['hypertension', 'tension'],
    answer: "Aide-mémoire hypertension : confirmer les mesures, évaluer observance et facteurs de risque, rechercher atteinte d'organes cibles, planifier bilan rénal/lipidique selon contexte et documenter les objectifs de suivi.",
  },
  {
    tags: ['diabete', 'diabète', 'glycemie', 'glycémie', 'hba1c'],
    answer: "Aide-mémoire diabète : vérifier HbA1c selon équilibre, bilan rénal, examen des pieds, fond d'œil, risque cardio-vasculaire et éducation thérapeutique. Adapter selon recommandations locales et profil patient.",
  },
  {
    tags: ['patient risque', 'risque', 'chronique'],
    answer: "Priorisation suivi : patients chroniques sans visite récente, alertes non résolues, résultats anormaux et faible observance doivent être revus en premier. Utilisez les alertes NOVA pour tracer la décision.",
  },
  {
    tags: ['prescription', 'ordonnance'],
    answer: "Contrôle ordonnance : identité patient, date, médicament, dosage, fréquence, durée, contre-indications connues, allergies, interactions et signature doivent être vérifiés avant validation.",
  },
];

export function answerPatientAssistant(question) {
  return answerFromKnowledge(question, PATIENT_ADVICE, 'patient');
}

export function answerDoctorAssistant(question, context = {}) {
  const base = answerFromKnowledge(question, DOCTOR_ADVICE, 'doctor');
  if (base.risk !== 'info') return base;

  const highRiskCount = Number(context.highRiskCount || 0);
  if (normalize(question).includes('risque') && highRiskCount > 0) {
    return withDisclaimer({
      risk: 'warning',
      answer: `Vous avez ${highRiskCount} patient(s) marqué(s) à risque élevé dans NOVA. Priorisez une revue clinique, puis documentez l'action dans les alertes ou consultations.`,
    }, 'doctor');
  }
  return base;
}

function answerFromKnowledge(question, knowledge, audience) {
  const q = normalize(question);
  if (!q || q.length < 2) {
    return withDisclaimer({ risk: 'info', answer: 'Posez une question courte et précise pour recevoir un conseil général.' }, audience);
  }

  if (EMERGENCY_TERMS.some(term => q.includes(normalize(term)))) {
    return {
      risk: 'emergency',
      answer: "Ces signes peuvent relever d'une urgence. Appelez immédiatement les urgences locales ou rendez-vous au service d'urgence le plus proche. NOVA ne remplace pas une prise en charge urgente.",
      disclaimer: emergencyDisclaimer(),
    };
  }

  if (audience === 'patient' && BLOCKED_CLINICAL_ACTIONS.some(term => q.includes(normalize(term)))) {
    return withDisclaimer({
      risk: 'warning',
      answer: "Je ne peux pas poser de diagnostic, choisir un traitement, modifier une dose ou remplacer une consultation. Contactez votre médecin pour une décision adaptée à votre dossier.",
    }, audience);
  }

  const hit = knowledge.find(item => item.tags.some(tag => q.includes(normalize(tag))));
  if (hit) return withDisclaimer({ risk: 'info', answer: hit.answer }, audience);

  return withDisclaimer({
    risk: 'info',
    answer: "Je peux fournir des conseils généraux de prévention et vous orienter dans NOVA. Pour une décision clinique personnalisée, contactez votre professionnel de santé.",
  }, audience);
}

function withDisclaimer(payload, audience) {
  return {
    ...payload,
    source: 'nova_local_knowledge_base',
    disclaimer: audience === 'doctor'
      ? "Aide à la décision uniquement. Le médecin reste responsable de l'évaluation clinique, de la prescription et du suivi."
      : "Information générale uniquement. Ne remplace pas un avis médical. En cas d'urgence, contactez les urgences.",
  };
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function emergencyDisclaimer() {
  return 'Urgence potentielle : demandez une aide médicale immédiate.';
}
