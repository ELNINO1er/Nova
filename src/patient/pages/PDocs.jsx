import React, { useState, useRef } from 'react';
import { FileText, Plus, Trash2, Download, Upload, AlertTriangle, CheckCircle2, ClipboardList, FileDown, HardDrive, Microscope, Lock } from 'lucide-react';
import { patientApi } from '../../api/patientApi.js';
import { formatDate, formatBytes, mapDocumentCategory } from '../../utils/format.js';
import { PatientModal } from '../../components/PatientModal.jsx';
import { searchableDate, useSearch, useUrlQuery } from '../../utils/search.js';
import {
  Button, Card, Chip, EmptyState, Highlight, IconBadge, NoResults, PageHeader, Pills, SearchInput, StatTile, inputClass,
} from '../../components/patient/ui.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const CAT_LABEL = { ordonnance: 'Ordonnance', analyse: 'Analyse', consultation: 'Consultation', certificat: 'Certificat' };
const TYPE_LABEL = { PDF: 'PDF', IMG: 'Image', DOC: 'Document' };

// Champs cherchables, du plus au moins important.
const FIELDS = (d) => [d.n, CAT_LABEL[d.cat] || d.cat, `${d.t} ${TYPE_LABEL[d.t] || ''}`, searchableDate(d.at)];

export default function PDocs({ data, onReload, notify, card, sub, border, darkMode, api: apiOverride }) {
  const api = apiOverride || patientApi;
  const [f, setF] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [docForm, setDocForm] = useState({ title: '', category: 'prescription' });
  const [pickedFile, setPickedFile] = useState(null);
  const fileInputRef = useRef(null);

  const rows = Array.isArray(data) ? data : (data?.data || []);
  const apiDocs = rows.length ? rows.map((doc) => ({
    n: doc.title,
    t: doc.mimeType?.includes('pdf') ? 'PDF' : doc.mimeType?.includes('image') ? 'IMG' : 'DOC',
    cat: mapDocumentCategory(doc.category),
    d: formatDate(doc.createdAt),
    s: formatBytes(doc.sizeBytes),
    I: doc.category === 'lab' ? Microscope : doc.category === 'vaccine' ? ClipboardList : FileText,
    id: doc.id,
    filePath: doc.filePath,
    at: doc.createdAt,
    bytes: Number(doc.sizeBytes) || 0,
  })) : [];
  const [query, setQuery] = useUrlQuery();
  const found = useSearch(apiDocs, query, FIELDS);
  // Recherche puis filtre par catégorie : les compteurs des pastilles reflètent la requête.
  const filt = f === 'all' ? found : found.filter(d => d.cat === f);
  const cats = [
    { id: 'all', l: 'Tous' }, { id: 'ordonnance', l: 'Ordonnances' },
    { id: 'analyse', l: 'Analyses' }, { id: 'consultation', l: 'Consultations' },
    { id: 'certificat', l: 'Certificats' }
  ];

  const pickFile = (file) => {
    if (!file) return;
    setPickedFile(file);
    if (!docForm.title) setDocForm(f => ({ ...f, title: file.name.replace(/\.[^.]+$/, '') }));
  };

  const uploadDocument = async () => {
    if (!pickedFile && !docForm.title) { notify?.('Sélectionnez un fichier ou saisissez un titre', 'error'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      if (pickedFile) fd.append('file', pickedFile);
      fd.append('title', docForm.title || pickedFile?.name || 'Document');
      fd.append('category', docForm.category);
      await api.uploadDocument(fd);
      onReload?.(await api.documents());
      notify?.('Document ajouté');
      setShowForm(false);
      setDocForm({ title: '', category: 'prescription' });
      setPickedFile(null);
    } catch (error) {
      notify?.(error.message || 'Erreur upload', 'error');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (id) => {
    if (!id) return;
    try {
      await api.deleteDocument(id);
      onReload?.(await api.documents());
      notify?.('Document supprimé');
      setPendingDelete(null);
    } catch (error) {
      notify?.(error.message || 'Erreur suppression', 'error');
    }
  };

  if (!data) {
    return (
      <div className="space-y-5">
        <PageHeader title="Mes documents" sub={sub} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[0, 1, 2, 3].map(i => <Card key={i} darkMode={darkMode}><div className={`animate-pulse h-32 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`} /></Card>)}
        </div>
      </div>
    );
  }

  const closeForm = () => { setShowForm(false); setPickedFile(null); };
  const withFile = apiDocs.filter(d => d.filePath).length;
  const totalBytes = apiDocs.reduce((n, d) => n + d.bytes, 0);
  const latestDoc = [...apiDocs].filter(d => d.at).sort((a, b) => new Date(b.at) - new Date(a.at))[0];

  return (
    <div className="space-y-5">
      <PageHeader title="Mes documents" sub={sub}
        subtitle={<span className="inline-flex items-center gap-1.5">{apiDocs.length} document{apiDocs.length > 1 ? 's' : ''} <span aria-hidden="true">·</span> <Lock className="w-3.5 h-3.5" /> Stockage chiffré</span>}
        actions={<Button Icon={Plus} onClick={() => setShowForm(true)}>Importer</Button>} />

      {showForm && (
        <PatientModal title="Importer un document" onClose={closeForm} card={card} darkMode={darkMode} maxWidth="max-w-lg">
          <div
            role="button" tabIndex={0} aria-label="Choisir un fichier à importer"
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), fileInputRef.current?.click())}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files[0]); }}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center mb-4 transition-colors ${
              dragOver || pickedFile ? (darkMode ? 'border-red-500 bg-red-950/30' : 'border-red-400 bg-red-50') :
              (darkMode ? 'border-slate-700 hover:border-red-500' : 'border-slate-200 hover:border-red-300')
            }`}
          >
            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={e => pickFile(e.target.files?.[0])} />
            {pickedFile ? (
              <div className="flex items-center justify-center gap-2 text-red-700 min-w-0">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="text-sm font-semibold truncate max-w-[14rem]">{pickedFile.name}</span>
                <span className={`text-xs ${sub} shrink-0`}>({formatBytes(pickedFile.size)})</span>
              </div>
            ) : (
              <>
                <span className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center"><HardDrive className="w-5 h-5" /></span>
                <p className="text-sm font-medium">Glissez-déposez ou cliquez pour choisir</p>
                <p className={`text-xs ${sub} mt-1`}>PDF, JPG, PNG, WEBP · 10 Mo maximum</p>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <label className="sm:col-span-2 block">
              <span className="text-xs font-medium text-slate-500">Titre</span>
              <input value={docForm.title} onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Titre du document" className={`mt-1 ${inputClass(darkMode)}`} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Catégorie</span>
              <select value={docForm.category} onChange={e => setDocForm(f => ({ ...f, category: e.target.value }))}
                className={`mt-1 ${inputClass(darkMode)}`}>
                <option value="prescription">Ordonnance</option>
                <option value="lab">Analyse</option>
                <option value="consultation">Consultation</option>
                <option value="vaccine">Certificat</option>
              </select>
            </label>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" darkMode={darkMode} className="flex-1" onClick={closeForm}>Annuler</Button>
            <Button className="flex-1" onClick={uploadDocument} disabled={uploading || (!pickedFile && !docForm.title)}>
              {uploading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FileDown className="w-4 h-4" />}
              {uploading ? 'Import en cours…' : 'Importer'}
            </Button>
          </div>
        </PatientModal>
      )}

      {pendingDelete && (
        <PatientModal title="Supprimer ce document ?" onClose={() => setPendingDelete(null)} card={card} darkMode={darkMode} maxWidth="max-w-sm">
          <div className="flex items-start gap-3 mb-5">
            <IconBadge Icon={AlertTriangle} solid />
            <div className="min-w-0">
              <p className="font-semibold break-words">{pendingDelete.n}</p>
              <p className={`text-sm ${sub} mt-1`}>Le document sera retiré de votre dossier.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" darkMode={darkMode} className="flex-1" onClick={() => setPendingDelete(null)}>Annuler</Button>
            <Button className="flex-1" Icon={Trash2} onClick={() => deleteDocument(pendingDelete.id)}>Supprimer</Button>
          </div>
        </PatientModal>
      )}

      {apiDocs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
          <StatTile label="Documents" value={apiDocs.length} Icon={FileText} darkMode={darkMode}
            hint={latestDoc ? `Dernier ajout : ${latestDoc.d}` : undefined} />
          <StatTile label="Avec fichier" value={withFile} Icon={Download} darkMode={darkMode}
            hint={`${apiDocs.length - withFile} sans pièce jointe`} />
          <StatTile label="Espace utilisé" value={totalBytes ? formatBytes(totalBytes) : '—'} Icon={HardDrive} darkMode={darkMode} hint="Stockage chiffré" />
        </div>
      )}

      {apiDocs.length > 0 && (
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <SearchInput value={query} onChange={setQuery} count={filt.length} darkMode={darkMode} className="w-full lg:max-w-md"
            placeholder="Rechercher un document, une catégorie, une date…" />
          <div className="lg:ml-auto">
            <Pills darkMode={darkMode} value={f} onChange={setF}
              options={cats.map(c => [c.id, c.l, c.id === 'all' ? found.length : found.filter(d => d.cat === c.id).length])} />
          </div>
        </div>
      )}

      {apiDocs.length > 0 && query && filt.length === 0 ? (
        <NoResults query={query} onClear={() => setQuery('')} darkMode={darkMode} />
      ) : filt.length === 0 ? (
        <EmptyState Icon={FileText} darkMode={darkMode}
          title={apiDocs.length === 0 ? 'Aucun document' : 'Aucun document dans cette catégorie'}
          action={<Button Icon={Upload} onClick={() => setShowForm(true)}>Importer un document</Button>}>
          Ordonnances, comptes rendus et résultats d’analyses : retrouvez-les tous au même endroit.
        </EmptyState>
      ) : (
        <Card darkMode={darkMode} className="!p-0 overflow-hidden">
          <div className={`hidden md:grid grid-cols-[minmax(0,1fr)_9rem_6rem_auto] gap-4 px-5 py-3 text-xs font-semibold text-slate-500 ${darkMode ? 'bg-slate-800/40' : 'bg-red-50/50'}`}>
            <span>Document</span><span>Ajouté le</span><span className="text-right">Taille</span><span className="w-[8.5rem] text-right">Actions</span>
          </div>
          <ul className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
            {filt.map((d, i) => (
              <li key={d.id ?? i} className={`px-4 sm:px-5 py-4 flex flex-wrap md:grid md:grid-cols-[minmax(0,1fr)_9rem_6rem_auto] items-center gap-3 md:gap-4 transition-colors ${darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-red-50/30'}`}>
                <div className="flex items-center gap-3 min-w-0 flex-1 basis-full md:basis-auto">
                  <IconBadge Icon={d.I} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate" title={d.n}><Highlight text={d.n} query={query} /></p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <Chip tone="watch"><Highlight text={CAT_LABEL[d.cat] || d.cat} query={query} /></Chip>
                      <Chip>{d.t}</Chip>
                      <span className={`text-xs md:hidden ${sub}`}><Highlight text={d.d} query={query} />{d.s ? ` · ${d.s}` : ''}</span>
                    </div>
                  </div>
                </div>
                <span className={`hidden md:block text-sm ${sub}`}><Highlight text={d.d} query={query} /></span>
                <span className={`hidden md:block text-sm text-right tabular-nums ${sub}`}>{d.s}</span>
                <div className="flex items-center gap-2 w-full md:w-[8.5rem] md:justify-end pl-[3.25rem] md:pl-0">
                  {d.filePath ? (
                    <a href={`${API_BASE_URL}/${apiOverride ? 'doctor' : 'patient'}/me/documents/${d.id}/download`}
                      target="_blank" rel="noreferrer" aria-label={`Ouvrir ${d.n}`}
                      className={`flex-1 md:flex-none h-10 px-4 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-2 border ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 bg-white hover:border-red-300 hover:text-red-700'}`}>
                      <Download className="w-4 h-4" /> Ouvrir
                    </a>
                  ) : (
                    <span className={`flex-1 md:flex-none h-10 px-3 rounded-full text-xs inline-flex items-center justify-center gap-1.5 border border-dashed ${darkMode ? 'border-slate-700' : 'border-slate-200'} ${sub}`}>
                      <FileText className="w-3.5 h-3.5" /> Sans fichier
                    </span>
                  )}
                  <button type="button" onClick={() => d.id ? setPendingDelete(d) : undefined} aria-label={`Supprimer ${d.n}`} title="Supprimer"
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${darkMode ? 'border-red-900 text-red-300 hover:bg-red-950/40' : 'border-red-200 text-red-700 hover:bg-red-50'}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
