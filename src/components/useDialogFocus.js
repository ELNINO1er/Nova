import {useEffect,useRef} from 'react';
export function useDialogFocus(open,ref,onClose){
 const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  if(!open)return;const previous=document.activeElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  const elements=()=>Array.from(ref.current?.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')||[]).filter(e=>e.getClientRects().length);
  elements()[0]?.focus();
  const handle=e=>{if(e.key==='Escape'){e.preventDefault();close.current?.();}if(e.key!=='Tab')return;const list=elements();if(!list.length)return;const first=list[0],last=list[list.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}};
  document.addEventListener('keydown',handle);return()=>{document.removeEventListener('keydown',handle);document.body.style.overflow=overflow;previous?.focus?.();};
 },[open,ref]);
}
