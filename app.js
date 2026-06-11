// ══════════════════════════════════════════════════════
// MUNDIAL 2026 — Motor de probabilidades + Supabase sync
// ══════════════════════════════════════════════════════

// ── SUPABASE CONFIG ──
// Reemplaza con tus credenciales de Supabase
const SUPABASE_URL = "https://TU_PROJECT.supabase.co";
const SUPABASE_KEY = "TU_ANON_KEY";

const SK_EQ    = "m26_equipos";
const SK_LLAVE = "m26_llave";

// ── HELPERS SUPABASE ──
async function sbGet(table) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    if (!r.ok) return null;
    return await r.json();
  } catch(e) { return null; }
}

async function sbUpsert(table, data) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(data)
    });
    return r.ok;
  } catch(e) { return false; }
}

// ── STATUS UI ──
function setStatus(state, msg) {
  const el = document.getElementById("db-status");
  if (!el) return;
  el.className = "db-status " + state;
  el.querySelector(".db-label").textContent = msg;
}

// ── CARGA / GUARDA con fallback a localStorage ──
async function cargarEquipos() {
  setStatus("", "Sincronizando...");
  const rows = await sbGet("m26_equipos");
  if (rows && rows.length > 0) {
    const data = {};
    rows.forEach(r => { data[r.nombre] = { b: r.bandera, p: r.partidos }; });
    localStorage.setItem(SK_EQ, JSON.stringify(data));
    setStatus("ok", "Supabase ✓");
    return data;
  }
  setStatus("err", "Local");
  const local = localStorage.getItem(SK_EQ);
  return local ? JSON.parse(local) : JSON.parse(JSON.stringify(equipos));
}

async function guardarEquipo(nombre, datos) {
  localStorage.setItem(SK_EQ, JSON.stringify(
    Object.assign(JSON.parse(localStorage.getItem(SK_EQ)||"{}"), { [nombre]: datos })
  ));
  const ok = await sbUpsert("m26_equipos", [{
    nombre, bandera: datos.b, partidos: datos.p
  }]);
  setStatus(ok ? "ok" : "err", ok ? "Supabase ✓" : "Solo local");
}

async function cargarLlave() {
  const rows = await sbGet("m26_llave");
  if (rows && rows.length > 0) {
    const local = rows[0].data;
    localStorage.setItem(SK_LLAVE, JSON.stringify(local));
    return local;
  }
  const local = localStorage.getItem(SK_LLAVE);
  return local ? JSON.parse(local) : JSON.parse(JSON.stringify(llaveInicial));
}

async function guardarLlave(llave) {
  localStorage.setItem(SK_LLAVE, JSON.stringify(llave));
  await sbUpsert("m26_llave", [{ id: 1, data: llave }]);
}

// ══ MOTOR PROBABILIDADES ══
function prom(eq) {
  const p = eq.p, n = p.length || 1;
  return {
    ga: p.reduce((s,r)=>s+r[0],0)/n, gc: p.reduce((s,r)=>s+r[1],0)/n,
    ca: p.reduce((s,r)=>s+r[2],0)/n, cc: p.reduce((s,r)=>s+r[3],0)/n,
    ya: p.reduce((s,r)=>s+r[4],0)/n, yc: p.reduce((s,r)=>s+r[5],0)/n,
  };
}
function poisson(l,k){let p=Math.exp(-l);for(let i=0;i<k;i++)p*=l/(i+1);return p;}
function erf(x){const t=1/(1+0.3275911*Math.abs(x));const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return x>=0?y:-y;}
function pMasP(l,u){let a=0;for(let k=0;k<=Math.floor(u);k++)a+=poisson(l,k);return Math.max(0,Math.min(1,1-a));}
function pMasN(m,u){const s=Math.sqrt(Math.max(m,0.5)),z=(u-m)/s;return Math.max(0,Math.min(1,1-(0.5*(1+erf(z/Math.SQRT2)))));}

function calcular(l,v,datos) {
  const L=prom(datos[l]),V=prom(datos[v]);
  const gL=(L.ga+V.gc)/2,gV=(V.ga+L.gc)/2,gT=gL+gV;
  const cT=(L.ca+V.ca+L.cc+V.cc)/2,yT=(L.ya+V.ya+L.yc+V.yc)/2;
  let pL=0,pE=0,pV=0;
  for(let i=0;i<=8;i++)for(let j=0;j<=8;j++){const p=poisson(gL,i)*poisson(gV,j);if(i>j)pL+=p;else if(i===j)pE+=p;else pV+=p;}
  const s=pL+pE+pV; pL/=s;pE/=s;pV/=s;
  const pSi=(1-poisson(gL,0))*(1-poisson(gV,0));
  return {
    "1X2":{"Local":Math.round(pL*100),"Empate":Math.round(pE*100),"Visitante":Math.round(pV*100)},
    "Ambos marcan":{"Sí":Math.round(pSi*100),"No":Math.round((1-pSi)*100)},
    "Goles +/-":{"+1.5":Math.round(pMasP(gT,1.5)*100),"-1.5":Math.round((1-pMasP(gT,1.5))*100),"+2.5":Math.round(pMasP(gT,2.5)*100),"-2.5":Math.round((1-pMasP(gT,2.5))*100),"+3.5":Math.round(pMasP(gT,3.5)*100),"-3.5":Math.round((1-pMasP(gT,3.5))*100)},
    "Corners +/-":{"+7.5":Math.round(pMasN(cT,7.5)*100),"-7.5":Math.round((1-pMasN(cT,7.5))*100),"+9.5":Math.round(pMasN(cT,9.5)*100),"-9.5":Math.round((1-pMasN(cT,9.5))*100),"+11.5":Math.round(pMasN(cT,11.5)*100),"-11.5":Math.round((1-pMasN(cT,11.5))*100)},
    "Tarjetas +/-":{"+1.5":Math.round(pMasN(yT,1.5)*100),"-1.5":Math.round((1-pMasN(yT,1.5))*100),"+3.5":Math.round(pMasN(yT,3.5)*100),"-3.5":Math.round((1-pMasN(yT,3.5))*100),"+5.5":Math.round(pMasN(yT,5.5)*100),"-5.5":Math.round((1-pMasN(yT,5.5))*100)},
  };
}

// ══ COLORES BARRAS ══
const PAL = {
  "1X2":[["#B5D4F4","#0C447C"],["#D0CFCB","#3a3a3a"],["#9FE1CB","#085041"]],
  "Ambos marcan":[["#C0DD97","#27500A"],["#F5C4B3","#712B13"]],
  "Goles +/-":[["#00C9B1","#003D36"],["#FF6B35","#5A1A00"]],
  "Corners +/-":[["#7B2FBE","#2A0052"],["#D0CFCB","#3a3a3a"]],
  "Tarjetas +/-":[["#FFD700","#5A4000"],["#E63946","#5A000A"]],
};

function barra(ets,vals,m){
  const pal=PAL[m]||[];
  const tot=vals.reduce((a,b)=>a+b,0)||100;
  return `<div class="barra-wrap">${ets.map((e,i)=>{
    const pct=Math.round((vals[i]/tot)*100);
    const [bg,fg]=(pal[i%pal.length])||["#333","#eee"];
    return `<div class="seg" style="width:${pct}%;background:${bg};color:${fg}" title="${e}: ${vals[i]}%">${e} ${vals[i]}%</div>`;
  }).join("")}</div>`;
}

function renderMercados(probs,activos){
  return Object.entries(probs).filter(([m])=>activos.has(m)).map(([m,d])=>{
    const ets=Object.keys(d),vals=Object.values(d);
    if(m.includes("+/-")){
      let r="";for(let i=0;i<ets.length;i+=2)r+=barra(ets.slice(i,i+2),vals.slice(i,i+2),m);
      return `<div class="mercado"><div class="mercado-label">${m}</div>${r}</div>`;
    }
    return `<div class="mercado"><div class="mercado-label">${m}</div>${barra(ets,vals,m)}</div>`;
  }).join("");
}

// ══ TABLA DE POSICIONES — independiente de probabilidades ══
const SK_TABLA = "m26_tabla";

async function cargarTabla() {
  const rows = await sbGet("m26_tabla");
  if (rows && rows.length > 0) {
    const d = {};
    rows.forEach(r => { d[r.equipo] = r.stats; });
    localStorage.setItem(SK_TABLA, JSON.stringify(d));
    return d;
  }
  const local = localStorage.getItem(SK_TABLA);
  return local ? JSON.parse(local) : {};
}

async function guardarTablaEquipo(equipo, stats) {
  const local = JSON.parse(localStorage.getItem(SK_TABLA)||"{}");
  local[equipo] = stats;
  localStorage.setItem(SK_TABLA, JSON.stringify(local));
  await sbUpsert("m26_tabla", [{ equipo, stats }]);
}

function statsVacias() {
  return { pj:0, pg:0, pe:0, pp:0, gf:0, gc:0, pts:0 };
}

function renderTablaGrupo(g) {
  const info = grupos[g];
  const eqs  = info.eq;

  // Ordenar por pts desc, luego GD desc
  const ordenados = [...eqs].sort((a,b)=>{
    const sa = tablaBD[a]||statsVacias(), sb = tablaBD[b]||statsVacias();
    const ptsDiff = sb.pts - sa.pts;
    if (ptsDiff !== 0) return ptsDiff;
    return (sb.gf-sb.gc) - (sa.gf-sa.gc);
  });

  const cols = ["pj","pg","pe","pp","gf","gc","pts"];
  const heads = ["PJ","PG","PE","PP","GF","GC","Pts"];

  const rows = ordenados.map((e,i) => {
    const s = tablaBD[e] || statsVacias();
    const gd = s.gf - s.gc;
    return `<tr>
      <td class="td-equipo">
        <span class="pos-num">${i+1}</span>
        <span class="eq-flag">${equiposBD[e]?.b||""}</span>
        <span class="eq-nombre">${e}</span>
      </td>
      ${cols.map(c=>`<td class="td-stat editable"
          data-equipo="${e}" data-col="${c}"
          contenteditable="true"
          spellcheck="false">${s[c]??0}</td>`).join("")}
      <td class="td-gd ${gd>0?"pos":gd<0?"neg":""}">${gd>0?"+":""}${gd}</td>
    </tr>`;
  }).join("");

  document.getElementById("grupo-table-wrap").innerHTML = `
    <div class="grupo-table-card">
      <div class="grupo-table-header">
        <span class="grupo-badge">GRUPO ${g}</span>
        <div class="grupo-teams-list">
          ${eqs.map(e=>`<span class="grupo-team-chip">${equiposBD[e]?.b||""} ${e}</span>`).join("")}
        </div>
        <span class="tabla-hint">✏️ toca un número para editar</span>
      </div>
      <div class="grupo-table-body">
        <table class="standings">
          <thead><tr>
            <th class="th-equipo">Equipo</th>
            ${heads.map(h=>`<th>${h}</th>`).join("")}
            <th>DG</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;

  // Eventos de edición inline por celda
  document.querySelectorAll(".td-stat.editable").forEach(td => {
    // Seleccionar todo al hacer foco
    td.addEventListener("focus", () => {
      const range = document.createRange();
      range.selectNodeContents(td);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });

    // Guardar al perder foco o al presionar Enter
    const guardar = async () => {
      const eq  = td.dataset.equipo;
      const col = td.dataset.col;
      const val = parseInt(td.textContent) || 0;
      td.textContent = val; // normaliza
      const stats = { ...(tablaBD[eq] || statsVacias()), [col]: val };
      tablaBD[eq] = stats;
      await guardarTablaEquipo(eq, stats);
      // Re-render para reordenar y recalcular DG
      renderTablaGrupo(g);
    };

    td.addEventListener("blur", guardar);
    td.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); td.blur(); }
      // Solo permitir números
      if (!/[\d\b]/.test(e.key) && !["ArrowLeft","ArrowRight","Tab","Delete","Backspace"].includes(e.key)) {
        e.preventDefault();
      }
    });
  });
}

// ══ RENDER PARTIDOS GRUPO ══
function renderPartidosGrupo(g, activos) {
  const info = grupos[g];
  let html = `<div class="partidos-section-title">PARTIDOS</div>`;
  info.partidos.forEach(p => {
    const tL = equiposBD[p.l], tV = equiposBD[p.v];
    const fL = tL?.b||"🏳", fV = tV?.b||"🏳";
    const metaHTML = `
      <div class="match-meta">
        <span class="meta-fecha">${p.f}</span>
        ${p.h?`<span class="meta-hora">${p.h}</span>`:""}
        <span class="meta-est">${p.est||""}</span>
      </div>`;
    if (!tL || !tV || p.l==="" || p.v==="") {
      html+=`<div class="match-card"><div class="match-top"><div class="match-teams"><span class="team"><span class="flag">${fL}</span>${p.l}</span><span class="vs-sep">VS</span><span class="team"><span class="flag">${fV}</span>${p.v}</span></div>${metaHTML}</div><p class="sin-datos">⏳ Ingresa estadísticas para ver probabilidades</p></div>`;
      return;
    }
    const probs = calcular(p.l, p.v, equiposBD);
    html+=`<div class="match-card"><div class="match-top"><div class="match-teams"><span class="team"><span class="flag">${fL}</span>${p.l}</span><span class="vs-sep">VS</span><span class="team"><span class="flag">${fV}</span>${p.v}</span></div>${metaHTML}</div>${renderMercados(probs,activos)}</div>`;
  });
  document.getElementById("partidos-lista").innerHTML = html;
}

// ══ RENDER BRACKET ══
function renderBracket(llave) {
  const rondas = [
    {key:"octavos", label:"OCTAVOS DE FINAL", cols:2},
    {key:"cuartos", label:"CUARTOS DE FINAL", cols:2},
    {key:"semis",   label:"SEMIFINALES",       cols:2},
    {key:"tercero", label:"TERCER Y CUARTO PUESTO", cols:1},
    {key:"final",   label:"⭐ GRAN FINAL",      cols:1, esFinal:true},
  ];
  let html="";
  rondas.forEach(r => {
    const items = llave[r.key]||[];
    html+=`<div class="bracket-round${r.esFinal?" bracket-final":""}">
      <div class="bracket-round-title">${r.label}<span></span></div>
      <div class="bracket-grid" style="grid-template-columns:repeat(auto-fill,minmax(${r.cols===1?"100%":"280px"},1fr))">`;
    items.forEach((p,i)=>{
      const def=p.l&&p.v;
      const lTxt=p.l?`${equiposBD[p.l]?.b||""} ${p.l}`:"Por definir";
      const vTxt=p.v?`${equiposBD[p.v]?.b||""} ${p.v}`:"Por definir";
      let probHTML="";
      if(def && equiposBD[p.l] && equiposBD[p.v]){
        const pr=calcular(p.l,p.v,equiposBD);
        const ox=pr["1X2"];
        probHTML=`<div style="margin-top:4px">${barra(Object.keys(ox),Object.values(ox),"1X2")}</div>`;
      }
      html+=`<div class="bracket-card${def?" definido":""}${r.esFinal?" final-card":""}" >
        <div class="bracket-matchup">
          <span class="bracket-team${p.l?"":" vacio"}">${lTxt}</span>
          <span class="bracket-vs">VS</span>
          <span class="bracket-team${p.v?"":" vacio"}">${vTxt}</span>
        </div>
        ${probHTML}
        <div class="bracket-bottom">
          <span class="bracket-desc">${p.desc||""}</span>
          <div class="bracket-meta">
            ${p.f?`<span class="bracket-fecha">${p.f}</span>`:""}
            ${p.h?`<span class="bracket-hora">${p.h} h</span>`:""}
            <button class="bracket-edit-btn" data-ronda="${r.key}" data-idx="${i}">✏️ editar</button>
          </div>
        </div>
      </div>`;
    });
    html+=`</div></div>`;
  });
  document.getElementById("bracket-wrap").innerHTML=html;
  document.querySelectorAll(".bracket-edit-btn").forEach(btn=>{
    btn.addEventListener("click",(e)=>{
      e.stopPropagation();
      abrirModal(btn.dataset.ronda, parseInt(btn.dataset.idx), llave);
    });
  });
}

// ══ MODAL EDITAR PARTIDO ELIM. ══
function abrirModal(ronda, idx, llave) {
  const p = llave[ronda][idx];
  const nombres = Object.keys(equiposBD).sort();
  document.getElementById("modal-title").textContent = `Editar · ${p.desc||ronda+" #"+(idx+1)}`;
  document.getElementById("modal-form").innerHTML=`
    <div class="form-group full"><label>Equipo Local</label>
      <select id="m-l"><option value="">Por definir</option>${nombres.map(n=>`<option value="${n}"${p.l===n?" selected":""}>${equiposBD[n]?.b||""} ${n}</option>`).join("")}</select>
    </div>
    <div class="form-group full"><label>Equipo Visitante</label>
      <select id="m-v"><option value="">Por definir</option>${nombres.map(n=>`<option value="${n}"${p.v===n?" selected":""}>${equiposBD[n]?.b||""} ${n}</option>`).join("")}</select>
    </div>
    <div class="form-group"><label>Fecha</label><input id="m-f" type="text" value="${p.f||""}" placeholder="19 Jul"></div>
    <div class="form-group"><label>Hora (Colombia)</label><input id="m-h" type="text" value="${p.h||""}" placeholder="19:00"></div>`;
  document.getElementById("modal").style.display="flex";
  document.getElementById("modal-guardar").onclick=async()=>{
    llave[ronda][idx]={...p,l:document.getElementById("m-l").value,v:document.getElementById("m-v").value,f:document.getElementById("m-f").value,h:document.getElementById("m-h").value};
    await guardarLlave(llave);
    document.getElementById("modal").style.display="none";
    renderBracket(llave);
  };
}

// ══ FORM ACTUALIZAR ══
function renderFormActualizar() {
  const nombres=Object.keys(equiposBD).sort();
  document.getElementById("form-actualizar").innerHTML=`
    <div class="form-group full"><label>Equipo</label>
      <select id="up-eq">${nombres.map(n=>`<option value="${n}">${equiposBD[n]?.b||""} ${n}</option>`).join("")}</select>
    </div>
    <div class="form-group"><label>⚽ Goles anotados</label><input type="number" id="up-ga" min="0" max="20" value="0"></div>
    <div class="form-group"><label>⚽ Goles recibidos</label><input type="number" id="up-gc" min="0" max="20" value="0"></div>
    <div class="form-group"><label>🔄 Corners a favor</label><input type="number" id="up-ca" min="0" max="30" value="0"></div>
    <div class="form-group"><label>🔄 Corners en contra</label><input type="number" id="up-cc" min="0" max="30" value="0"></div>
    <div class="form-group"><label>🟨 Amarillas propias</label><input type="number" id="up-ya" min="0" max="11" value="0"></div>
    <div class="form-group"><label>🟨 Amarillas rival</label><input type="number" id="up-yc" min="0" max="11" value="0"></div>`;
}

// ══ INIT ══
let equiposBD = {};
let llaveBD   = {};
let tablaBD   = {};
let grupoSel  = "A";
const mercados = ["1X2","Ambos marcan","Goles +/-","Corners +/-","Tarjetas +/-"];
const activos  = new Set(mercados);

document.addEventListener("DOMContentLoaded", async () => {

  // Status badge
  document.body.insertAdjacentHTML("beforeend",`
    <div class="db-status" id="db-status">
      <div class="db-dot"></div>
      <span class="db-label">Conectando...</span>
    </div>`);

  equiposBD = await cargarEquipos();
  llaveBD   = await cargarLlave();
  tablaBD   = await cargarTabla();

  // TABS GRUPOS
  const tabsEl = document.getElementById("tabs-grupo");
  Object.keys(grupos).forEach(g=>{
    const btn=document.createElement("button");
    btn.className="tab"+(g===grupoSel?" active":"");
    btn.textContent=`G.${g}`;
    btn.addEventListener("click",()=>{
      grupoSel=g;
      tabsEl.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      renderTablaGrupo(g);
      renderPartidosGrupo(g,activos);
    });
    tabsEl.appendChild(btn);
  });

  // FILTROS MERCADO
  const fmEl=document.getElementById("filtro-mercados");
  mercados.forEach(m=>{
    const btn=document.createElement("button");
    btn.className="filter-btn on";
    btn.textContent=m;
    btn.addEventListener("click",()=>{
      activos.has(m)?activos.delete(m):activos.add(m);
      btn.classList.toggle("on");
      renderPartidosGrupo(grupoSel,activos);
    });
    fmEl.appendChild(btn);
  });

  // NAV PRINCIPAL
  const vistas={"btn-grupos":"grupos","btn-eliminatorias":"eliminatorias","btn-actualizar":"actualizar"};
  Object.entries(vistas).forEach(([id,v])=>{
    document.getElementById(id).addEventListener("click",()=>{
      document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
      document.getElementById(id).classList.add("active");
      document.getElementById("vista-grupos").style.display       =v==="grupos"?"block":"none";
      document.getElementById("vista-eliminatorias").style.display=v==="eliminatorias"?"block":"none";
      document.getElementById("vista-actualizar").style.display   =v==="actualizar"?"block":"none";
      if(v==="eliminatorias") renderBracket(llaveBD);
      if(v==="actualizar")    renderFormActualizar();
    });
  });

  // GUARDAR RESULTADO
  document.getElementById("btn-guardar").addEventListener("click",async()=>{
    equiposBD=await cargarEquipos();
    const eq=document.getElementById("up-eq").value;
    const fila=[
      +document.getElementById("up-ga").value||0,
      +document.getElementById("up-gc").value||0,
      +document.getElementById("up-ca").value||0,
      +document.getElementById("up-cc").value||0,
      +document.getElementById("up-ya").value||0,
      +document.getElementById("up-yc").value||0,
    ];
    equiposBD[eq].p.push(fila);
    if(equiposBD[eq].p.length>10) equiposBD[eq].p.shift();
    await guardarEquipo(eq, equiposBD[eq]);
    const msg=document.getElementById("panel-msg");
    msg.textContent=`✓ Guardado para ${equiposBD[eq].b} ${eq} (${equiposBD[eq].p.length} partidos)`;
    setTimeout(()=>{msg.textContent="";},4000);
    if(document.getElementById("vista-grupos").style.display!=="none"){
      renderPartidosGrupo(grupoSel,activos);
    }
  });

  // RESET
  document.getElementById("btn-reset").addEventListener("click",async()=>{
    if(confirm("¿Resetear todos los datos? Se borrará el historial guardado.")){
      localStorage.removeItem(SK_EQ);
      localStorage.removeItem(SK_LLAVE);
      equiposBD=JSON.parse(JSON.stringify(equipos));
      llaveBD=JSON.parse(JSON.stringify(llaveInicial));
      renderTablaGrupo(grupoSel);
      renderPartidosGrupo(grupoSel,activos);
    }
  });

  // CERRAR MODAL
  document.getElementById("modal-cancelar").addEventListener("click",()=>{document.getElementById("modal").style.display="none";});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")document.getElementById("modal").style.display="none";});

  // RENDER INICIAL
  renderTablaGrupo(grupoSel);
  renderPartidosGrupo(grupoSel,activos);
});
