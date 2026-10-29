import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, AlertTriangle, ChevronRight, MessageSquareText } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { useSearch, useUrlQuery } from '../../utils/search.js';
import { PageHeader, Card, CardTitle, Chip, IconButton, SearchInput, Highlight, NoResults } from '../../components/patient/ui.jsx';

/* Questions suggérées, classées par thème : cherchables, un clic les envoie à l'assistant. */
const SUGGESTIONS = [
  { q: "Où voir les médicaments à prendre aujourd'hui ?",        topic: 'Traitements',  keywords: 'pilulier prise comprimé rappel' },
  { q: 'Comment prendre un rendez-vous ?',                        topic: 'Rendez-vous',  keywords: 'rdv médecin consultation réserver' },
  { q: 'Comment annuler ou déplacer un rendez-vous ?',            topic: 'Rendez-vous',  keywords: 'rdv modifier reporter' },
  { q: 'Que signifie une glycémie à jeun de 1.10 g/L ?',          topic: 'Résultats',    keywords: 'sucre diabète glucose analyse' },
  { q: "Où trouver mes résultats d'analyse ?",                    topic: 'Résultats',    keywords: 'labo laboratoire bilan sang' },
  { q: "Quels aliments éviter avec l'hypertension ?",             topic: 'Prévention',   keywords: 'tension sel alimentation régime' },
  { q: 'Combien de temps de marche par jour est recommandé ?',     topic: 'Prévention',   keywords: 'activité sport cœur' },
  { q: "Comment retirer l'accès d'un médecin à mon dossier ?",     topic: 'Confidentialité', keywords: 'consentement partage vie privée' },
  { q: 'Où retrouver mes ordonnances ?',                          topic: 'Traitements',  keywords: 'prescription pharmacie' },
  { q: 'Comment mettre à jour mes allergies ?',                   topic: 'Dossier',      keywords: 'adn médical profil antécédents' },
  { q: 'Où voir mon carnet de vaccination ?',                     topic: 'Dossier',      keywords: 'vaccin rappel' },
  { q: 'Comment envoyer un message à mon médecin ?',              topic: 'Messagerie',   keywords: 'contact écrire question' },
];
const SUGGESTION_FIELDS = (s) => [s.q, s.topic, s.keywords];

export default function PAssistant({ patientData, card, sub, border, darkMode }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Bonjour ! Je suis l’aide de NOVA. Je vous oriente dans l’application et je donne des informations de santé générales. Je ne lis pas votre dossier et je ne remplace pas un médecin.`, ts: new Date() }
  ]);
  const [input, setInput]   = useState('');
  const [typing, setTyping] = useState(false);
  const [query, setQuery]   = useUrlQuery();
  const endRef = useRef(null);
  const results = useSearch(SUGGESTIONS, query, SUGGESTION_FIELDS);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages.length]);

  // Réponses locales de secours (non utilisées quand le service répond) — sans émoji, toujours prudentes.
  const simulateResponse = (userMsg) => {
    const msg = userMsg.toLowerCase();
    if (msg.includes('médic') || msg.includes('comprimé') || msg.includes('soir') || msg.includes('matin'))
      return `D'après votre traitement actuel, veillez à prendre vos médicaments aux horaires prescrits. Consultez votre page **Pilulier** pour voir vos prises du jour. Si vous avez un doute, contactez votre médecin.\n\n*Je ne suis pas médecin — consultez toujours un professionnel de santé.*`;
    if (msg.includes('rendez-vous') || msg.includes('rdv'))
      return `Votre prochain rendez-vous est visible dans la section **Rendez-vous** de l'application. Vous pouvez aussi prendre un nouveau RDV via **Trouver un médecin**.\n\n*Pensez à activer les rappels dans vos paramètres.*`;
    if (msg.includes('glycémie') || msg.includes('glucose') || msg.includes('1.10'))
      return `Une glycémie de **1,10 g/L** à jeun est dans la zone haute de la normale (0,70–1,10 g/L). Ce n'est pas alarmant, mais il est conseillé de limiter les sucres rapides et de pratiquer une activité physique régulière.\n\n*Consultez votre diabétologue pour un suivi personnalisé.*`;
    if (msg.includes('hypertension') || msg.includes('tension') || msg.includes('aliment'))
      return `Avec de l'hypertension, il est conseillé de :\n• **Réduire le sel** (max 5g/jour)\n• Éviter les charcuteries et plats transformés\n• Limiter l'alcool et la caféine\n• Favoriser les fruits, légumes et poissons gras\n\n*Le régime DASH est particulièrement recommandé.*`;
    if (msg.includes('score') || msg.includes('améliorer') || msg.includes('santé'))
      return `Votre **score de santé** est calculé en tenant compte de vos constantes vitales, de la prise de vos médicaments, de vos vaccins et de vos RDV.\n\nPour l'améliorer :\n• Prenez vos médicaments régulièrement\n• Maintenez vos rendez-vous médicaux\n• Mettez à jour vos vaccins\n• Pratiquez 30 min d'activité physique par jour`;
    if (msg.includes('résultat') || msg.includes('analyse') || msg.includes('labo'))
      return `Vos résultats d'analyses sont disponibles dans la section **Résultats labo**. Les valeurs signalées en rouge méritent attention.\n\n*Seul votre médecin peut interpréter correctement vos résultats dans leur contexte clinique.*`;
    if (msg.includes('merci') || msg.includes('super') || msg.includes('ok'))
      return `Avec plaisir ! N'hésitez pas à revenir si vous avez d'autres questions. Prenez soin de vous.`;
    return `Je comprends votre question. Pour des informations précises sur **${userMsg.slice(0, 40)}**, je vous recommande de :\n\n1. Consulter les sections dédiées de l'application\n2. Contacter votre médecin via la **Messagerie**\n3. Prendre un RDV via **Trouver un médecin**\n\n*NOVA Assistant fournit des informations générales uniquement — pas un avis médical.*`;
  };

  // text facultatif : une question suggérée envoyée directement (sinon le champ de saisie).
  const sendMessage = async (text) => {
    const txt = (typeof text === 'string' ? text : input).trim();
    if (!txt || typing) return;
    setMessages(m => [...m, { role: 'user', text: txt, ts: new Date() }]);
    setInput('');
    setTyping(true);
    try {
      const reply = await patientApi.assistant(txt);
      const prefix = reply.risk === 'emergency' ? 'Urgence potentielle : ' : reply.risk === 'warning' ? 'Attention : ' : '';
      setMessages(m => [...m, { role: 'assistant', text: `${prefix}${reply.answer}\n\n${reply.disclaimer}`, ts: new Date() }]);
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', text: `Service assistant indisponible. Contactez votre medecin pour toute question medicale.\n\n${err.message || ''}`, ts: new Date() }]);
    } finally {
      setTyping(false);
    }
  };

  const renderText = (txt) => txt.split('\n').map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <span key={i}>
        {parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
        {i < txt.split('\n').length - 1 && <br />}
      </span>
    );
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Aide NOVA" sub={sub}
        subtitle="Aide à la navigation et informations générales · ne consulte pas votre dossier · en cas d’urgence, appelez le 185 (SAMU)"
        actions={
          <Chip tone="neutral">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600" aria-hidden="true" /> En ligne
          </Chip>
        } />

      {/* Disclaimer */}
      <div role="note" className={`flex items-start gap-3 p-4 rounded-3xl border ${darkMode ? 'bg-red-950/30 border-red-900 text-red-100' : 'bg-red-50 border-red-100 text-red-800'}`}>
        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
        <p className="text-sm leading-relaxed">
          <strong>Avertissement médical :</strong> NOVA Assistant fournit des informations générales. Il ne remplace pas un médecin. En cas d'urgence, composez le <strong>185 (SAMU)</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Chat */}
        <Card darkMode={darkMode} className="!p-0 flex flex-col h-[520px] overflow-hidden lg:col-span-2">
          <div className={`flex items-center gap-3 px-5 py-4 border-b ${border}`}>
            <span className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0"><Bot className="w-5 h-5" /></span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Assistant NOVA</p>
              <p className={`text-xs ${sub}`}>Informations générales uniquement</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4" aria-live="polite">
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
                  {!isUser && (
                    <span className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">
                      <Bot className="w-4 h-4" />
                    </span>
                  )}
                  <div className={`max-w-[82%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed break-words ${
                    isUser
                      ? 'bg-red-600 text-white rounded-tr-md'
                      : (darkMode ? 'bg-slate-900 border border-slate-700 text-slate-100 rounded-tl-md' : 'bg-white border border-red-100 text-slate-800 rounded-tl-md')
                  }`}>
                    {renderText(msg.text)}
                    <p className={`text-[11px] mt-1.5 ${isUser ? 'text-red-100 text-right' : sub}`}>
                      {msg.ts.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
            {typing && (
              <div className="flex items-start gap-2" aria-label="L’assistant écrit">
                <span className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0" aria-hidden="true">
                  <Bot className="w-4 h-4" />
                </span>
                <div className={`px-4 py-3.5 rounded-2xl rounded-tl-md border ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-red-100'}`}>
                  <div className="flex gap-1 items-center">
                    {[0,1,2].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-red-300 animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className={`p-3 sm:p-4 border-t ${border}`}>
            <div className={`flex items-center gap-2 rounded-full border pl-4 pr-1.5 py-1.5 focus-within:ring-2 focus-within:ring-red-500/40 focus-within:border-red-400 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Posez une question à Nova…"
                aria-label="Votre question"
                className={`flex-1 min-w-0 text-sm bg-transparent outline-none ${darkMode ? 'placeholder-slate-500' : 'placeholder-slate-400'}`} />
              <IconButton Icon={Send} label="Envoyer" tone="primary" onClick={sendMessage} disabled={!input.trim() || typing} darkMode={darkMode} />
            </div>
          </div>
        </Card>

        {/* Questions fréquentes, cherchables */}
        <Card darkMode={darkMode} aria-labelledby="passistant-topics">
          <CardTitle Icon={MessageSquareText}><span id="passistant-topics">Questions fréquentes</span></CardTitle>
          <SearchInput value={query} onChange={setQuery} count={results.length} darkMode={darkMode}
            placeholder="Chercher un sujet (rdv, glycémie…)" label="Chercher une question fréquente" />
          <div className="mt-3">
            {results.length === 0 ? (
              <NoResults query={query} onClear={() => setQuery('')} darkMode={darkMode} />
            ) : (
              <ul className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'} max-h-[340px] overflow-y-auto -mx-2`}>
                {results.map((s) => (
                  <li key={s.q}>
                    <button type="button" onClick={() => sendMessage(s.q)} disabled={typing}
                      aria-label={`Envoyer la question : ${s.q}`}
                      className={`w-full text-left px-2 py-3 flex items-center gap-3 rounded-xl transition-colors disabled:opacity-60 ${darkMode ? 'hover:bg-slate-800/60' : 'hover:bg-red-50/60'}`}>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium break-words"><Highlight text={s.q} query={query} /></span>
                        <span className={`block text-[11px] mt-0.5 ${sub}`}><Highlight text={s.topic} query={query} /></span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className={`text-[11px] mt-3 ${sub}`}>Un clic envoie la question à l’assistant.</p>
        </Card>
      </div>
    </div>
  );
}
