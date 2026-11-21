// Agrupa categorías solo en la vista pública; no modifica datos guardados.
(function(){
 const originalFetch=window.fetch.bind(window);
 const normalize=s=>String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
 function group(c,p){
  const name=normalize([p?.name,p?.description].filter(Boolean).join(' '));
  const isPaperRefill=/\b(repuesto|repuestos|rep\.?|block|blocks|bloc|blocs)\b/.test(name)&&(/\b(hoja|hojas|rayad|cuadriculad|cuadric|cuadros|cuadro|cuad|raya|a4|a5|n[°ºo]?\s?3|n[°ºo]?\s?5|escolar|universitari|carpeta|80\s?h|48\s?h|96\s?h)\b/.test(name)||/\b(block|blocks|bloc|blocs)\b/.test(name));
  if(isPaperRefill)return 'Repuestos y blocks';
  const k=normalize(c);
  if(['lapiceras','boligrafos','lapiceras y boligrafos','boligrafos y lapiceras','lapiceras y microfibras'].includes(k))return 'Lapiceras y bolígrafos';
  if(['repuestos','blocks','blocs','repuestos y blocks','blocks y repuestos'].includes(k))return 'Repuestos y blocks';
  if(['pegamentos','adhesivos','pegamentos y adhesivos','adhesivos y pegamentos'].includes(k))return 'Pegamentos y adhesivos';
  return c;
 }
 window.fetch=async function(input,init){
  const response=await originalFetch(input,init);
  const url=typeof input==='string'?input:input?.url||'';
  if(!url.includes('/rest/v1/complemento_products?')||!response.ok||((init?.method||'GET').toUpperCase()!=='GET'))return response;
  const read=response.json.bind(response);
  response.json=async function(){const data=await read();return Array.isArray(data)?data.map(p=>({...p,category:group(p.category,p)})):data};
  return response;
 };
})();