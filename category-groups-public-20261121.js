// Agrupa categorías solo en la vista pública; no modifica datos guardados.
(function(){
 const originalFetch=window.fetch.bind(window);
 const normalize=s=>String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
 function group(c){
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
  response.json=async function(){const data=await read();return Array.isArray(data)?data.map(p=>({...p,category:group(p.category)})):data};
  return response;
 };
})();