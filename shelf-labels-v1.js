(()=>{
const q=id=>document.getElementById(id);const panel=q('shelfPanel'),open=q('shelfOpen');if(!panel||!open)return;
let items=[],selected=new Set();
const labelEdits=new Map();
const labelFor=product=>labelEdits.get(product.sku)??product;
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const price=n=>Number(n||0).toLocaleString('es-AR',{maximumFractionDigits:2});
open.onclick=async()=>{panel.hidden=false;panel.scrollIntoView({behavior:'smooth'});q('shelfStatus').textContent='Cargando productos…';try{const cfg=window.COMPLEMENTO_DB,token=localStorage.getItem('complemento_access_token')||sessionStorage.getItem('complemento_access_token');if(!cfg||!token)throw Error('Iniciá sesión.');items=[];for(let offset=0;offset<50000;offset+=500){const r=await fetch(cfg.url+'/rest/v1/complemento_products?select=sku,name,price,active&order=name.asc&limit=500&offset='+offset,{headers:{apikey:cfg.key,Authorization:'Bearer '+token}});if(!r.ok)throw Error('No se pudo consultar el catálogo');const batch=await r.json();items.push(...batch);if(batch.length<500)break}q('shelfStatus').textContent=items.length+' productos disponibles';render()}catch(e){q('shelfStatus').textContent=e.message}};
q('shelfClose').onclick=()=>panel.hidden=true;
const editor=document.createElement('dialog');
editor.style.cssText='width:min(420px,calc(100% - 24px));border:1px solid #ccd4d9;border-radius:12px;padding:16px';
editor.setAttribute('aria-labelledby','shelfEditTitle');
editor.innerHTML=`<form style="display:grid;gap:10px">
  <h3 id="shelfEditTitle" style="margin:0">Editar etiqueta</h3>
  <p style="margin:0">Los cambios se aplican solo a la impresión y al PDF de esta sesión.</p>
  <label>Producto<input name="labelName" required></label>
  <label>Precio ($)<input name="labelPrice" type="text" inputmode="decimal" required></label>
  <label>Código impreso<input name="labelCode"></label>
  <div class="row">
    <button type="submit">Guardar etiqueta</button>
    <button type="button" data-reset>Usar datos del catálogo</button>
    <button type="button" data-cancel>Cancelar</button>
  </div>
</form>`;
panel.append(editor);
const form=editor.querySelector('form');
function editLabel(product){
 const current=labelFor(product);
 const name=form.elements.labelName, amount=form.elements.labelPrice, code=form.elements.labelCode;
 name.value=current.name;
 name.setCustomValidity('');
 amount.value=String(current.price??0).replace('.',',');
 amount.setCustomValidity('');
 code.value=current.sku;
 name.oninput=()=>name.setCustomValidity('');
 amount.oninput=()=>amount.setCustomValidity('');
 form.onsubmit=event=>{
  event.preventDefault();
  const value=amount.value.trim();
  const parsed=Number(value.replace(',','.'));
  if(!name.value.trim()){
   name.setCustomValidity('Ingresá el nombre que querés imprimir.');
   name.reportValidity();
   return;
  }
  if(!/^\d+(?:[.,]\d{1,2})?$/.test(value)||!Number.isFinite(parsed)){
   amount.setCustomValidity('Ingresá un precio válido sin separador de miles, por ejemplo 2500,50.');
   amount.reportValidity();
   return;
  }
  labelEdits.set(product.sku,{name:name.value.trim(),price:parsed,sku:code.value.trim()});
  selected.add(product.sku);
  editor.close();
  render();
 };
 editor.querySelector('[data-reset]').onclick=()=>{
  labelEdits.delete(product.sku);
  editor.close();
  render();
 };
 editor.querySelector('[data-cancel]').onclick=()=>editor.close();
 editor.showModal();
}
function render(){const term=norm(q('shelfSearch').value).trim().split(/\s+/).filter(Boolean);const visible=items.filter(p=>term.every(t=>norm(p.name+' '+p.sku).includes(t))).slice(0,150);const tbody=q('shelfRows');tbody.replaceChildren();for(const p of visible){const tr=document.createElement('tr'),td=document.createElement('td'),check=document.createElement('input');check.type='checkbox';check.checked=selected.has(p.sku);check.onchange=()=>{if(check.checked)selected.add(p.sku);else selected.delete(p.sku);count()};td.append(check);tr.append(td);const label=labelFor(p);for(const v of [label.sku,label.name,'$ '+price(label.price)]){const cell=document.createElement('td');cell.textContent=v;tr.append(cell)}const editCell=document.createElement('td'),edit=document.createElement('button');edit.type='button';edit.textContent=labelEdits.has(p.sku)?'Editada':'Editar';edit.setAttribute('aria-label','Editar etiqueta de '+p.name);edit.onclick=()=>editLabel(p);editCell.append(edit);tr.append(editCell);tbody.append(tr)}count()}
function count(){q('shelfCount').textContent=selected.size+' productos seleccionados'}
q('shelfSearch').oninput=render;
q('shelfAll').onclick=()=>{for(const p of items.filter(p=>norm(p.name+' '+p.sku).includes(norm(q('shelfSearch').value))).slice(0,150))selected.add(p.sku);render()};
q('shelfClear').onclick=()=>{selected.clear();render()};
q('shelfPrint').onclick=()=>{
 const chosen=items.filter(p=>selected.has(p.sku));if(!chosen.length)return alert('Seleccioná al menos un producto.');
 const w=Number(q('shelfWidth').value),h=Number(q('shelfHeight').value);
 if(!Number.isFinite(w)||w<30||w>150||!Number.isFinite(h)||h<20||h>100)return alert('Medidas fuera de rango.');
 const cols=Math.floor(200/w),rows=Math.floor(287/h);
 if(cols<1||rows<1)return alert('Las etiquetas no entran en una hoja A4. Reducí sus medidas.');
 const pageWidth=cols*w,pageHeight=rows*h,marginX=(210-pageWidth)/2,marginY=(297-pageHeight)/2;
 const perPage=chosen.map(labelFor).map(p=>{const amount=price(p.price),digits=amount.replace(/[^0-9]/g,'').length;return '<div class="tag"><div class="name">'+escape(p.name)+'</div><div class="price '+(digits>=7?'tiny':digits>=6?'small':digits>=5?'medium':'')+'">$ '+amount+'</div><div class="code">'+escape(p.sku)+'</div></div>'}).join('');
 const html='<!doctype html><html lang="es"><meta charset="utf-8"><title>Etiquetas de góndola A4 - Complemento</title><style>@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;width:210mm;font-family:Arial,sans-serif}.grid{display:grid;grid-template-columns:repeat('+cols+','+w+'mm);grid-auto-rows:'+h+'mm;width:'+pageWidth+'mm;margin:'+marginY+'mm auto 0;gap:0;align-content:start}.tag{width:'+w+'mm;height:'+h+'mm;border:0.25mm dashed #999;padding:2mm;display:flex;flex-direction:column;justify-content:space-between;break-inside:avoid;overflow:hidden;min-width:0}.name{font-size:12pt;font-weight:800;line-height:1.08;overflow:hidden;max-height:15mm;overflow-wrap:anywhere}.price{font-size:36pt;font-weight:900;letter-spacing:-1.1px;text-align:center;line-height:1;white-space:nowrap;max-width:100%;font-family:Arial Narrow,Arial,sans-serif}.price.medium{font-size:36pt;letter-spacing:-1.1px}.price.small{font-size:36pt;letter-spacing:-1px}.price.tiny{font-size:36pt;letter-spacing:-.8px}.code{font-size:8pt;color:#555;white-space:nowrap;overflow:hidden}@media screen{body{background:#eee}.tag{background:white}}@media print{html,body{background:white!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style><div class="grid">'+perPage+'</div></html>';
 const win=window.open('','_blank');if(!win)return alert('Permití ventanas emergentes para imprimir.');win.document.write(html);win.document.close();win.focus();(async()=>{await win.document.fonts.ready;const canvas=win.document.createElement('canvas'),ctx=canvas.getContext('2d');for(const tag of win.document.querySelectorAll('.tag')){const label=tag.querySelector('.name'),priceEl=tag.querySelector('.price');const available=tag.clientWidth-16;for(let size=12;size>=9;size-=.5){label.style.fontSize=size+'pt';if(label.scrollHeight<=label.clientHeight+1)break}for(let size=39;size>=17;size-=.5){priceEl.style.fontSize=size+'pt';ctx.font='900 '+size+'pt Arial';if(ctx.measureText(priceEl.textContent).width<=available)break}}setTimeout(()=>win.print(),250)})();
};
})();