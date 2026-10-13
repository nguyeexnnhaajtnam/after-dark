/** Copies text and reports whether it really landed. The async Clipboard API needs a secure context (https or localhost), so LAN/http play falls back to a hidden textarea. */
export async function copyText(text:string):Promise<boolean>{
 if(typeof navigator!=='undefined'&&navigator.clipboard&&window.isSecureContext){
  try{await navigator.clipboard.writeText(text);return true}catch{/* permission denied or unfocused document: try the fallback */}
 }
 try{
  const area=document.createElement('textarea');area.value=text;area.setAttribute('readonly','');area.style.position='fixed';area.style.top='0';area.style.left='0';area.style.opacity='0';
  document.body.appendChild(area);area.focus();area.select();area.setSelectionRange(0,text.length);
  const ok=document.execCommand('copy');area.remove();return ok;
 }catch{return false}
}
