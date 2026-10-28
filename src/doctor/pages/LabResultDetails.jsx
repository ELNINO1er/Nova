import React,{useState} from 'react';
import {doctorApi} from '../../api/doctorApi.js';
export default function LabResultDetails({id}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const load=async()=>{if(loading)return;setLoading(true);try{setData(await doctorApi.labResult(id));setError('');}catch(e){setError(e.message);}finally{setLoading(false);}};
 return <div className="mt-2"><button type="button" className="text-red-700 text-sm font-semibold" disabled={loading} onClick={load}>{loading?'Chargement…':'Consulter les résultats'}</button>{error&&<p role="alert" className="text-red-700">{error}</p>}{data&&<section className="mt-2 border rounded-lg p-3"><p>{data.laboratoryName} — {new Date(data.performedAt).toLocaleDateString('fr-FR')}</p><p className="text-xs">Données transcrites ; provenance déclarée par le prescripteur.</p><ul>{data.items.map(i=><li key={i.id}>{i.name} : {i.value} {i.unit} — {i.status}</li>)}</ul></section>}</div>;
}
