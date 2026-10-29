import {useEffect,useRef,useSyncExternalStore} from 'react';
const entries=new Set(),listeners=new Set();
const notify=()=>listeners.forEach(fn=>fn());
export const hasUnsavedData=()=>entries.size>0;
export const clearUnsaved=()=>{entries.clear();notify();};
export function useHasUnsaved(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn);},()=>entries.size>0);}
export function useUnsaved(enabled,signature){
 const id=useRef(Symbol()),initial=useRef(null);
 useEffect(()=>{if(!enabled){initial.current=null;entries.delete(id.current);notify();return;}if(initial.current===null)initial.current=signature;if(signature!==initial.current){entries.add(id.current);notify();}},[enabled,signature]);
 useEffect(()=>()=>{entries.delete(id.current);notify();},[]);
}
