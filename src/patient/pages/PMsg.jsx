import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, ChevronLeft, ChevronUp, ChevronDown, CheckCheck, Plus } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { formatRelativeDate } from '../../utils/format.js';
import { searchableDate, scoreFields, tokenize, useSearch, useUrlQuery } from '../../utils/search.js';
import { Avatar, Button, Card, Chip, EmptyState, Highlight, IconButton, PageHeader, SearchInput, inputClass } from '../../components/patient/ui.jsx';

/* Champs cherchables d'une conversation, du plus au moins important. */
const convName = (c) => c?.doctorName || c?.patientName || 'Conversation';
const CONV_FIELDS = (c) => [convName(c), c.doctorSpecialty, c.lastMessage, searchableDate(c.updatedAt)];

// viewerRole : qui lit la conversation (patient par défaut ; « doctor » depuis l'espace médecin) — ses messages sont à droite.
export default function PMsg({ data, onConversationsChange, card, sub, border, darkMode, setShowVid, api: apiOverride, viewerRole = 'patient' }) {
  const api = apiOverride || patientApi;
  const [recipients,setRecipients]=useState(null),[recipient,setRecipient]=useState('');
  const newConversation=async()=>{try{const rows=apiOverride?await api.patients():(await patientApi.careTeam()).filter(r=>r.hasAccess).map(r=>({id:r.doctorId,firstName:r.doctorName,lastName:''}));setRecipients(Array.isArray(rows)?rows:rows.data||[]);}catch(e){setConvError(e.message);}};
  const start=async()=>{if(sending||!recipient)return;setSending(true);try{const result=await api.startConversation({[apiOverride?'patientId':'doctorId']:recipient});const list=await api.conversations();setConvList(list);onConversationsChange?.(list);setRecipients(null);openConversation(result.id);}catch(e){setConvError(e.message);}finally{setSending(false);}};

  const [convList, setConvList]     = useState(data || []);
  const [selId, setSelId]           = useState(null);
  const [convData, setConvData]     = useState(null);
  const [convLoading, setConvLoading] = useState(false);
  const [msgText, setMsgText]       = useState('');
  const [sending, setSending]       = useState(false);
  const [showList, setShowList]     = useState(true); // mobile toggle
  const [convError, setConvError]   = useState('');
  const [query, setQuery]           = useUrlQuery();   // ?q= (aussi rempli par la recherche globale de l'en-tête)
  const [matchIdx, setMatchIdx]     = useState(-1);    // message correspondant actuellement ciblé
  const msgRefs  = useRef(new Map());
  const messageOperation=useRef(null);
  const endRef   = useRef(null);
  const inputRef = useRef(null);
  const convListRef = useRef(convList);   // dernière liste connue, hors des updaters de state
  const openRequestRef = useRef(0);       // ignore les réponses d'une conversation quittée entre-temps

  useEffect(() => { if (data) setConvList(data); }, [data]);
  useEffect(() => { convListRef.current = convList; }, [convList]);

  // Met à jour la liste puis prévient le parent, en dehors du rendu (évite le warning
  // React « Cannot update a component while rendering a different component »).
  const updateConvList = (transform) => {
    const next = transform(convListRef.current);
    convListRef.current = next;
    setConvList(next);
    onConversationsChange?.(next);
  };

  // auto-scroll when messages change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convData?.messages?.length]);

  const results = useSearch(convList, query, CONV_FIELDS);

  // Ouverture automatique : la meilleure correspondance de ?q= (lien profond), sinon la plus récente.
  useEffect(() => {
    if (convList.length > 0 && !selId) openConversation((query && results[0]?.id) || convList[0].id);
  }, [convList]);

  // Requête modifiée : si la conversation ouverte ne correspond plus, ouvrir la meilleure (la liste reste visible sur mobile).
  useEffect(() => {
    if (!query || !results.length || !selId || results.some(c => c.id === selId)) return undefined;
    const t = setTimeout(() => openConversation(results[0].id, { keepList: true }), 350);
    return () => clearTimeout(t);
  }, [query, results]);

  const openConversation = async (id, { keepList = false } = {}) => {
    if (id === selId && convData) { if (!keepList) setShowList(false); return; }
    const requestId = ++openRequestRef.current;
    setSelId(id);
    setConvData(null);
    setConvError('');
    setConvLoading(true);
    if (!keepList) setShowList(false);
    try {
      const full = await api.conversation(id);
      if (requestId !== openRequestRef.current) return;
      setConvData(full);
      await api.markConversationRead(id);
      updateConvList(list => list.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
    } catch (err) {
      if (requestId === openRequestRef.current) setConvError(err.message || 'Conversation indisponible.');
    } finally {
      if (requestId === openRequestRef.current) setConvLoading(false);
    }
  };

  const sendMessage = async () => {
    const body = msgText.trim();
    if (!body || !selId || sending) return;
    setSending(true);
    setMsgText('');
    try {
      const fingerprint=selId+'|'+body;
      if(messageOperation.current?.fingerprint!==fingerprint)messageOperation.current={fingerprint,key:crypto.randomUUID()};
      const msg = await api.sendMessage(selId, { body,requestKey:messageOperation.current.key });
      messageOperation.current=null;
      setConvData(prev => prev ? { ...prev, messages: [...(prev.messages || []).filter(m=>m.id!==msg.id), msg] } : prev);
      updateConvList(list => list.map(c =>
        c.id === selId ? { ...c, lastMessage: body, updatedAt: msg.createdAt } : c
      ));
    } catch(e) {setMsgText(body);setConvError(e.message);}
    finally { setSending(false); }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  /* Messages de la conversation ouverte qui correspondent à la requête (ordre chronologique). */
  const messageMatches = (() => {
    const tokens = tokenize(query);
    if (!tokens.length || !convData?.messages?.length) return [];
    return convData.messages.filter(m => scoreFields(tokens, [m.body, searchableDate(m.createdAt)]) > 0).map(m => m.id);
  })();
  const matchKey = messageMatches.join('|');
  const scrollToMatch = (i) => {
    const id = messageMatches[i];
    if (id == null) return;
    setMatchIdx(i);
    msgRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const stepMatch = (dir) => {
    if (!messageMatches.length) return;
    scrollToMatch((Math.max(matchIdx, 0) + dir + messageMatches.length) % messageMatches.length);
  };
  // Nouvelle requête ou autre conversation : cibler la correspondance la plus récente.
  useEffect(() => {
    if (!messageMatches.length) { setMatchIdx(-1); return undefined; }
    const t = setTimeout(() => scrollToMatch(messageMatches.length - 1), 80);
    return () => clearTimeout(t);
  }, [matchKey, selId]);
  const activeMatchId = messageMatches[matchIdx];

  const formatMsgTime = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const formatMsgDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const line = darkMode ? 'border-slate-800' : 'border-slate-100';

  if (!data) return (
    <div className="space-y-5">
      <PageHeader title="Messages" sub={sub} />
      <Card darkMode={darkMode}>
        <div className={`animate-pulse h-96 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`}></div>
      </Card>
    </div>
  );

  const activeConv = convList.find(c => c.id === selId);
  const unreadTotal = convList.reduce((s, c) => s + c.unreadCount, 0);

  /* ── group messages by day ── */
  const groupedMessages = (() => {
    if (!convData?.messages?.length) return [];
    const groups = [];
    let lastDate = null;
    for (const msg of convData.messages) {
      const day = new Date(msg.createdAt).toDateString();
      if (day !== lastDate) { groups.push({ type: 'date', label: formatMsgDate(msg.createdAt) }); lastDate = day; }
      groups.push({ type: 'msg', msg });
    }
    return groups;
  })();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Messages"
        subtitle="Échanges sécurisés avec votre équipe soignante"
        sub={sub}
        actions={(
          <>
            <Chip tone={unreadTotal > 0 ? 'alert' : 'neutral'}>{unreadTotal} non lu{unreadTotal > 1 ? 's' : ''}</Chip>
            <Button Icon={Plus} darkMode={darkMode} onClick={newConversation}>Nouvelle conversation</Button>
          </>
        )}
      />

      {recipients && (
        <Card darkMode={darkMode}>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <label className="flex-1 min-w-0 block text-xs font-medium text-slate-500">
              Destinataire autorisé
              <select value={recipient} onChange={e => setRecipient(e.target.value)} className={`mt-1 ${inputClass(darkMode)}`}>
                <option value="">Choisir…</option>
                {recipients.map(r => <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>)}
              </select>
            </label>
            <Button darkMode={darkMode} disabled={sending || !recipient} onClick={start}>Ouvrir la conversation</Button>
          </div>
          <p className={`text-xs mt-3 ${sub}`}>Un accès au dossier en cours de validité est requis.</p>
        </Card>
      )}
      {convError && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-2.5">{convError}</p>}

      {convList.length === 0 ? (
        <EmptyState Icon={MessageCircle} title="Aucune conversation" darkMode={darkMode}>
          Vos échanges avec les médecins apparaîtront ici.
        </EmptyState>
      ) : (
        <Card darkMode={darkMode} className="!p-0 overflow-hidden flex" style={{ height: '72vh', minHeight: 500 }}>

          {/* ── Liste conversations ── */}
          <div className={`${showList ? 'flex' : 'hidden md:flex'} flex-col w-full md:w-80 shrink-0 md:border-r ${line}`}>
            <div className={`px-3 sm:px-4 py-3 border-b ${line} space-y-2.5`}>
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="font-semibold text-sm">Conversations</span>
                <span className={`text-xs ${sub}`}>{query ? `${results.length} sur ${convList.length}` : convList.length}</span>
              </div>
              <SearchInput value={query} onChange={setQuery} count={results.length} darkMode={darkMode}
                placeholder="Médecin, spécialité, message…" label="Rechercher dans les messages" />
            </div>
            {results.length === 0 ? (
              <div className="flex-1 overflow-y-auto p-5 text-center">
                <p className="font-semibold text-sm mt-6 break-words">Aucun résultat pour « {query} »</p>
                <p className={`text-xs mt-1 ${sub}`}>Essayez le nom du médecin, une spécialité ou un mot du message.</p>
                <button type="button" onClick={() => setQuery('')} className={`mt-4 h-9 px-4 rounded-full border text-xs font-semibold ${darkMode ? 'border-red-900 text-red-300 hover:bg-red-950/40' : 'border-red-200 text-red-700 hover:bg-red-50'}`}>Effacer la recherche</button>
              </div>
            ) : (
            <ul className="flex-1 overflow-y-auto p-2 space-y-1">
              {results.map(c => {
                const unread = c.unreadCount > 0;
                const active = c.id === selId;
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => openConversation(c.id)} aria-current={active ? 'true' : undefined}
                      className={`w-full p-3 rounded-2xl flex items-start gap-3 text-left transition-colors
                        ${active ? (darkMode ? 'bg-red-950/40' : 'bg-red-50')
                                 : (darkMode ? 'hover:bg-slate-800/60' : 'hover:bg-red-50/50')}`}>
                      <div className="relative shrink-0">
                        <Avatar name={convName(c)} />
                        {unread && <span className={`absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center border-2 ${darkMode ? 'border-slate-900' : 'border-white'}`}>{c.unreadCount}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm truncate ${unread ? 'font-bold' : 'font-semibold'}`}><Highlight text={convName(c)} query={query} /></p>
                          <p className={`text-[11px] shrink-0 ${sub}`}>{formatRelativeDate(c.updatedAt)}</p>
                        </div>
                        {c.doctorSpecialty && <p className="text-[11px] text-red-700/80 mt-0.5 truncate"><Highlight text={c.doctorSpecialty} query={query} /></p>}
                        <p className={`text-xs truncate mt-0.5 ${unread ? (darkMode ? 'text-slate-200 font-medium' : 'text-slate-800 font-medium') : sub}`}><Highlight text={c.lastMessage} query={query} /></p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            )}
          </div>

          {/* ── Panneau chat ── */}
          <div className={`${showList ? 'hidden md:flex' : 'flex'} flex-col flex-1 min-w-0`}>
            {activeConv ? (
              <>
                {/* Header */}
                <div className={`px-4 sm:px-5 py-3 border-b ${line} flex items-center gap-3`}>
                  <span className="md:hidden">
                    <IconButton Icon={ChevronLeft} label="Retour aux conversations" darkMode={darkMode} onClick={() => setShowList(true)} />
                  </span>
                  <Avatar name={convName(activeConv)} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate"><Highlight text={convName(activeConv)} query={query} /></p>
                    {activeConv.doctorSpecialty && <p className={`text-xs truncate ${sub}`}>{activeConv.doctorSpecialty}</p>}
                  </div>
                </div>
                {query && convData && (
                  <div className={`px-4 sm:px-5 py-2 border-b ${line} flex items-center justify-between gap-2`}>
                    <p className="text-xs min-w-0 truncate" aria-live="polite">
                      {messageMatches.length
                        ? <><span className="font-semibold text-red-700">{Math.max(matchIdx, 0) + 1}/{messageMatches.length}</span> <span className={sub}>message{messageMatches.length > 1 ? 's' : ''} contenant « {query} »</span></>
                        : <span className={sub}>Aucun message ne contient « {query} »</span>}
                    </p>
                    {messageMatches.length > 0 && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <IconButton Icon={ChevronUp} label="Correspondance précédente" darkMode={darkMode} onClick={() => stepMatch(-1)} />
                        <IconButton Icon={ChevronDown} label="Correspondance suivante" darkMode={darkMode} onClick={() => stepMatch(1)} />
                      </div>
                    )}
                  </div>
                )}

                {/* Messages */}
                <div className={`flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-1 ${darkMode ? 'bg-slate-950/40' : 'bg-white'}`}>
                  {convLoading ? (
                    <div className="flex items-center justify-center h-full" role="status" aria-label="Chargement">
                      <div className="animate-spin w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full" />
                    </div>
                  ) : convError ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                      <p className={`text-sm ${sub}`}>{convError}</p>
                      <Button darkMode={darkMode} onClick={() => openConversation(selId)}>Réessayer</Button>
                    </div>
                  ) : groupedMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                      <span className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center"><MessageCircle className="w-5 h-5" /></span>
                      <p className={`text-sm ${sub}`}>Démarrez la conversation</p>
                    </div>
                  ) : (
                    groupedMessages.map((item, idx) => {
                      if (item.type === 'date') return (
                        <div key={`date-${idx}`} className="flex items-center gap-3 py-3">
                          <div className={`flex-1 h-px ${darkMode ? 'bg-slate-800' : 'bg-red-100'}`} />
                          <span className={`text-[11px] font-medium capitalize ${sub}`}>{item.label}</span>
                          <div className={`flex-1 h-px ${darkMode ? 'bg-slate-800' : 'bg-red-100'}`} />
                        </div>
                      );
                      const { msg } = item;
                      const isMine = msg.senderRole === viewerRole;
                      const isMatch = messageMatches.includes(msg.id);
                      const isCurrent = msg.id === activeMatchId;
                      return (
                        <div key={msg.id} ref={(el) => { if (el) msgRefs.current.set(msg.id, el); else msgRefs.current.delete(msg.id); }}
                          className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
                          {!isMine && <span className="mb-5"><Avatar name={convName(activeConv)} size="sm" /></span>}
                          <div className="max-w-[78%] sm:max-w-[70%] min-w-0">
                            <div className={`px-4 py-2.5 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap break-words
                              ${isMine
                                ? 'bg-red-600 text-white rounded-br-md'
                                : (darkMode ? 'bg-slate-900 text-slate-100 border border-slate-700 rounded-bl-md' : 'bg-white text-slate-800 border border-red-100 rounded-bl-md')
                              } ${isCurrent ? `ring-2 ring-red-400 ring-offset-2 ${darkMode ? 'ring-offset-slate-950' : 'ring-offset-white'}` : ''}`}>
                              <Highlight text={msg.body} query={isMatch ? query : ''} />
                            </div>
                            <p className={`text-[11px] mt-1 px-1 flex items-center gap-1 ${sub} ${isMine ? 'justify-end' : 'justify-start'}`}>
                              {formatMsgTime(msg.createdAt)}
                              {isMine && msg.isRead && <CheckCheck className="w-3.5 h-3.5 text-red-600" aria-label="Lu" />}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={endRef} />
                </div>

                {/* Input */}
                <div className={`p-3 sm:p-4 border-t ${line}`}>
                  <div className={`flex items-end gap-2 rounded-3xl border pl-4 pr-1.5 py-1.5 focus-within:ring-2 focus-within:ring-red-500/40 focus-within:border-red-400 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <textarea
                      ref={inputRef}
                      value={msgText}
                      onChange={(e) => setMsgText(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder="Écrire un message… (Entrée pour envoyer)"
                      aria-label="Votre message"
                      rows={1}
                      className={`flex-1 min-w-0 resize-none bg-transparent text-sm outline-none max-h-28 leading-relaxed py-2 ${darkMode ? 'text-slate-100 placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'}`}
                      style={{ fieldSizing: 'content' }}
                    />
                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={!msgText.trim() || sending}
                      aria-label="Envoyer le message"
                      title="Envoyer"
                      className="shrink-0 w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      {sending
                        ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className={`text-[11px] ${sub} text-center mt-2`}>Messagerie médicale sécurisée · Nova</p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <span className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center"><MessageCircle className="w-5 h-5" /></span>
                <p className={`text-sm ${sub}`}>Sélectionnez une conversation</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
