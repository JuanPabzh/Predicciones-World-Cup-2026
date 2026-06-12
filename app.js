// ══════════════════════════════════════════════════════
// MUNDIAL 2026 — Motor probabilidades + Supabase + Bracket
// ══════════════════════════════════════════════════════

const SUPABASE_URL = "https://gdsdeqrynsmgoflialxm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkc2RlcXJ5bnNtZ29mbGlhbHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTc1OTcsImV4cCI6MjA5Njc3MzU5N30.JQXSU_kNJfwyoqGv0Lr6w3o1M68gPPp_xbcEt2kBVdc";

// ── SUPABASE ──
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
        "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(data)
    });
    return r.ok;
  } catch(e) { return false; }
}
function setStatus(state, msg) {
  const el = document.getElementById("db-status");
  if (!el) return;
  el.className = "db-status " + state;
  el.querySelector(".db-label").textContent = msg;
}

// ── CARGA / GUARDA ──
async function cargarEquipos() {
  setStatus("", "Conectando...");
  const rows = await sbGet("m26_equipos");
  if (rows === null) {
    setStatus("err", "Sin conexión");
    return JSON.parse(JSON.stringify(equipos)); // estructura vacía de data.js
  }
  const base = JSON.parse(JSON.stringify(equipos));
  rows.forEach(r => { if (base[r.nombre]) base[r.nombre].p = r.partidos; });
  setStatus("ok", "Supabase ✓");
  return base;
}

async function guardarEquipo(nombre, datos) {
  const ok = await sbUpsert("m26_equipos", [{ nombre, bandera: datos.b, partidos: datos.p }]);
  setStatus(ok ? "ok" : "err", ok ? "Supabase ✓" : "Error al guardar");
  return ok;
}

async function cargarLlave() {
  const rows = await sbGet("m26_llave");
  if (!rows || rows.length === 0) return construirLlaveInicial();
  return rows[0].data || construirLlaveInicial();
}

async function guardarLlave(llave) {
  const ok = await sbUpsert("m26_llave", [{ id: 1, data: llave }]);
  setStatus(ok ? "ok" : "err", ok ? "Supabase ✓" : "Error al guardar");
  return ok;
}

async function cargarTabla() {
  const rows = await sbGet("m26_tabla");
  if (!rows) return {};
  const d = {};
  rows.forEach(r => { d[r.equipo] = r.stats; });
  return d;
}

async function guardarTablaEquipo(equipo, stats) {
  const ok = await sbUpsert("m26_tabla", [{ equipo, stats }]);
  setStatus(ok ? "ok" : "err", ok ? "Supabase ✓" : "Error al guardar");
  return ok;
}

// ══ BRACKET OFICIAL FIFA 2026 ══
// Estructura de octavos según imagen oficial
// Cada cruce: { id, local: {fuente, grupo, pos}, visitante: {fuente, grupo, pos} }
// fuente: "1" = primero, "2" = segundo, "3t" = tercero con código de grupos
const CRUCES_OCTAVOS = [
  // Lado izquierdo (arriba→abajo)
  { id:"O1",  l:{f:"1",g:"E"},      v:{f:"3t",gs:"ABCDF"} },
  { id:"O2",  l:{f:"1",g:"I"},      v:{f:"3t",gs:"CDFGH"} },
  { id:"O3",  l:{f:"2",g:"A"},      v:{f:"2",g:"B"}       },
  { id:"O4",  l:{f:"1",g:"F"},      v:{f:"2",g:"C"}       },
  { id:"O5",  l:{f:"2",g:"K"},      v:{f:"2",g:"L"}       },
  { id:"O6",  l:{f:"1",g:"H"},      v:{f:"2",g:"J"}       },
  { id:"O7",  l:{f:"1",g:"D"},      v:{f:"3t",gs:"BEFIJ"} },
  { id:"O8",  l:{f:"1",g:"G"},      v:{f:"3t",gs:"AEHIJ"} },
  // Lado derecho (arriba→abajo)
  { id:"O9",  l:{f:"1",g:"C"},      v:{f:"2",g:"F"}       },
  { id:"O10", l:{f:"2",g:"E"},      v:{f:"2",g:"I"}       },
  { id:"O11", l:{f:"1",g:"A"},      v:{f:"3t",gs:"CEFHI"} },
  { id:"O12", l:{f:"1",g:"L"},      v:{f:"3t",gs:"EHIJK"} },
  { id:"O13", l:{f:"1",g:"J"},      v:{f:"2",g:"H"}       },
  { id:"O14", l:{f:"2",g:"D"},      v:{f:"2",g:"G"}       },
  { id:"O15", l:{f:"1",g:"B"},      v:{f:"3t",gs:"EFGIJ"} },
  { id:"O16", l:{f:"1",g:"K"},      v:{f:"3t",gs:"DEIJL"} },
];

// Cuartos: ganadores de octavos se enfrentan según bracket
// Izquierda: O1/O2 → Q1, O3/O4 → Q2, O5/O6 → Q3, O7/O8 → Q4
// Derecha:   O9/O10→ Q5, O11/O12→Q6, O13/O14→Q7, O15/O16→Q8
const CRUCES_CUARTOS = [
  { id:"Q1", o1:"O1", o2:"O2" },
  { id:"Q2", o1:"O3", o2:"O4" },
  { id:"Q3", o1:"O5", o2:"O6" },
  { id:"Q4", o1:"O7", o2:"O8" },
  { id:"Q5", o1:"O9",  o2:"O10" },
  { id:"Q6", o1:"O11", o2:"O12" },
  { id:"Q7", o1:"O13", o2:"O14" },
  { id:"Q8", o1:"O15", o2:"O16" },
];

// Semis: Q1/Q2→S1, Q3/Q4→S2, Q5/Q6→S3, Q7/Q8→S4
const CRUCES_SEMIS = [
  { id:"S1", q1:"Q1", q2:"Q2" },
  { id:"S2", q1:"Q3", q2:"Q4" },
  { id:"S3", q1:"Q5", q2:"Q6" },
  { id:"S4", q1:"Q7", q2:"Q8" },
];

// Final y 3er puesto
// S1/S2 → lado izquierdo, S3/S4 → lado derecho
// Perdedores S1+S2 vs Perdedores S3+S4 = 3er puesto? No, es S1 perdedor vs S2 perdedor etc.
// Formato estándar: perdedores de S1 y S2 juegan 3er puesto, ganadores juegan final
// Aquí: perdedor S1 vs perdedor S3, ganador S1 vs ganador S3 (lados del bracket)
const CRUCES_FINAL = [
  { id:"T1", s1:"S1", s2:"S3", esTercero: true  },
  { id:"F1", s1:"S2", s2:"S4", esFinal:   true  },
];

// ── CONSTRUIR LLAVE ──
function construirLlaveInicial() {
  const llave = { octavos:{}, cuartos:{}, semis:{}, tercero:{}, final:{} };
  CRUCES_OCTAVOS.forEach(c => {
    llave.octavos[c.id] = { id:c.id, l:"", v:"", gl:"", gv:"", penales:"", ganador:"", cruceL:c.l, cruceV:c.v };
  });
  CRUCES_CUARTOS.forEach(c => {
    llave.cuartos[c.id] = { id:c.id, l:"", v:"", gl:"", gv:"", penales:"", ganador:"", o1:c.o1, o2:c.o2 };
  });
  CRUCES_SEMIS.forEach(c => {
    llave.semis[c.id] = { id:c.id, l:"", v:"", gl:"", gv:"", penales:"", ganador:"", q1:c.q1, q2:c.q2 };
  });
  llave.tercero["T1"] = { id:"T1", l:"", v:"", gl:"", gv:"", penales:"", ganador:"", s1:"S1", s2:"S3", esTercero:true };
  llave.final["F1"]   = { id:"F1", l:"", v:"", gl:"", gv:"", penales:"", ganador:"", s1:"S2", s2:"S4", esFinal:true };
  return llave;
}

// ── RESOLVER CLASIFICADO DESDE TABLA ──
function obtenerClasificado(fuente, grupo, tablaBD) {
  if (!grupo || !grupos[grupo]) return "";
  const eqs = grupos[grupo].eq;
  const ordenados = [...eqs].sort((a,b) => {
    const sa = tablaBD[a]||{pts:0,gf:0,gc:0}, sb = tablaBD[b]||{pts:0,gf:0,gc:0};
    const dp = sb.pts - sa.pts;
    if (dp !== 0) return dp;
    return (sb.gf-sb.gc) - (sa.gf-sa.gc);
  });
  const pos = fuente === "1" ? 0 : fuente === "2" ? 1 : fuente === "3" ? 2 : -1;
  return pos >= 0 ? (ordenados[pos]||"") : "";
}

// Los terceros clasificados dependen de cuáles grupos avanzan — por ahora devuelve vacío
// hasta que el usuario los defina manualmente si los cruces de terceros son complejos
function obtenerTercero(grupos_str) {
  // Se define manualmente desde el modal cuando se conocen los 4 mejores terceros
  return "";
}

// ── SINCRONIZAR LLAVE CON TABLA ──
function sincronizarOctavos(llave, tablaBD) {
  CRUCES_OCTAVOS.forEach(c => {
    const p = llave.octavos[c.id];
    if (!p.ganador) { // solo si no hay resultado
      if (c.l.f !== "3t") p.l = obtenerClasificado(c.l.f, c.l.g, tablaBD);
      if (c.v.f !== "3t") p.v = obtenerClasificado(c.v.f, c.v.g, tablaBD);
      // Los terceros se mantienen si ya fueron definidos manualmente
    }
  });
}

function propagarGanadores(llave) {
  // Cuartos: ganador de O → entra al cruce Q
  CRUCES_CUARTOS.forEach(c => {
    const p  = llave.cuartos[c.id];
    const o1 = llave.octavos[c.o1], o2 = llave.octavos[c.o2];
    if (!p.ganador) {
      if (o1?.ganador) p.l = o1.ganador;
      if (o2?.ganador) p.v = o2.ganador;
    }
  });
  // Semis: ganador de Q → entra al cruce S
  CRUCES_SEMIS.forEach(c => {
    const p  = llave.semis[c.id];
    const q1 = llave.cuartos[c.q1], q2 = llave.cuartos[c.q2];
    if (!p.ganador) {
      if (q1?.ganador) p.l = q1.ganador;
      if (q2?.ganador) p.v = q2.ganador;
    }
  });
  // 3er puesto: perdedores de semis
  const t = llave.tercero["T1"];
  const s1 = llave.semis[t.s1], s2 = llave.semis[t.s2];
  if (!t.ganador) {
    if (s1?.ganador && s1.l && s1.v) t.l = s1.l===s1.ganador ? s1.v : s1.l;
    if (s2?.ganador && s2.l && s2.v) t.v = s2.l===s2.ganador ? s2.v : s2.l;
  }
  // Final: ganadores de semis
  const f = llave.final["F1"];
  const sf1 = llave.semis[f.s1], sf2 = llave.semis[f.s2];
  if (!f.ganador) {
    if (sf1?.ganador) f.l = sf1.ganador;
    if (sf2?.ganador) f.v = sf2.ganador;
  }
}

// ══ MOTOR PROBABILIDADES ══
function prom(eq) {
  const p=eq.p, n=p.length||1;
  return {
    ga:p.reduce((s,r)=>s+r[0],0)/n, gc:p.reduce((s,r)=>s+r[1],0)/n,
    ca:p.reduce((s,r)=>s+r[2],0)/n, cc:p.reduce((s,r)=>s+r[3],0)/n,
    ya:p.reduce((s,r)=>s+r[4],0)/n, yc:p.reduce((s,r)=>s+r[5],0)/n,
  };
}
function poisson(l,k){let p=Math.exp(-l);for(let i=0;i<k;i++)p*=l/(i+1);return p;}
function erf(x){const t=1/(1+0.3275911*Math.abs(x));const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return x>=0?y:-y;}
function pMasP(l,u){let a=0;for(let k=0;k<=Math.floor(u);k++)a+=poisson(l,k);return Math.max(0,Math.min(1,1-a));}
function pMasN(m,u){const s=Math.sqrt(Math.max(m,0.5)),z=(u-m)/s;return Math.max(0,Math.min(1,1-(0.5*(1+erf(z/Math.SQRT2)))));}

function calcular(l,v,datos) {
  if (!datos[l]||!datos[v]) return null;
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

// ══ BARRAS ══
const PAL={
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
  if (!probs) return `<p class="sin-datos">⏳ Ingresa estadísticas para ver probabilidades</p>`;
  return Object.entries(probs).filter(([m])=>activos.has(m)).map(([m,d])=>{
    const ets=Object.keys(d),vals=Object.values(d);
    if(m.includes("+/-")){let r="";for(let i=0;i<ets.length;i+=2)r+=barra(ets.slice(i,i+2),vals.slice(i,i+2),m);return `<div class="mercado"><div class="mercado-label">${m}</div>${r}</div>`;}
    return `<div class="mercado"><div class="mercado-label">${m}</div>${barra(ets,vals,m)}</div>`;
  }).join("");
}

// ══ TABLA GRUPO ══
function statsVacias(){return {pj:0,pg:0,pe:0,pp:0,gf:0,gc:0,pts:0};}

function renderTablaGrupo(g) {
  const info=grupos[g], eqs=info.eq;
  const ordenados=[...eqs].sort((a,b)=>{
    const sa=tablaBD[a]||statsVacias(), sb=tablaBD[b]||statsVacias();
    const dp=sb.pts-sa.pts;
    if(dp!==0)return dp;
    return (sb.gf-sb.gc)-(sa.gf-sa.gc);
  });
  const cols=["pj","pg","pe","pp","gf","gc","pts"];
  const heads=["PJ","PG","PE","PP","GF","GC","Pts"];
  const rows=ordenados.map((e,i)=>{
    const s=tablaBD[e]||statsVacias(), gd=s.gf-s.gc;
    return `<tr>
      <td class="td-equipo"><span class="pos-num">${i+1}</span><span class="eq-flag">${equiposBD[e]?.b||""}</span><span class="eq-nombre">${e}</span></td>
      ${cols.map(c=>`<td class="td-stat editable" data-equipo="${e}" data-col="${c}" contenteditable="true" spellcheck="false">${s[c]??0}</td>`).join("")}
      <td class="td-gd ${gd>0?"pos":gd<0?"neg":""}">${gd>0?"+":""}${gd}</td>
    </tr>`;
  }).join("");
  document.getElementById("grupo-table-wrap").innerHTML=`
    <div class="grupo-table-card">
      <div class="grupo-table-header">
        <span class="grupo-badge">GRUPO ${g}</span>
        <div class="grupo-teams-list">${eqs.map(e=>`<span class="grupo-team-chip">${equiposBD[e]?.b||""} ${e}</span>`).join("")}</div>
        <span class="tabla-hint">✏️ toca un número para editar</span>
      </div>
      <div class="grupo-table-body">
        <table class="standings">
          <thead><tr><th class="th-equipo">Equipo</th>${heads.map(h=>`<th>${h}</th>`).join("")}<th>DG</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  document.querySelectorAll(".td-stat.editable").forEach(td=>{
    td.addEventListener("focus",()=>{const range=document.createRange();range.selectNodeContents(td);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);});
    const guardar=async()=>{
      const eq=td.dataset.equipo, col=td.dataset.col;
      const val=parseInt(td.textContent)||0;
      td.textContent=val;
      const stats={...(tablaBD[eq]||statsVacias()),[col]:val};
      tablaBD[eq]=stats;
      await guardarTablaEquipo(eq,stats);
      // Sincronizar octavos con nueva posición
      sincronizarOctavos(llaveBD, tablaBD);
      await guardarLlave(llaveBD);
      renderTablaGrupo(g);
    };
    td.addEventListener("blur",guardar);
    td.addEventListener("keydown",e=>{
      if(e.key==="Enter"){e.preventDefault();td.blur();}
      if(!/[\d\b]/.test(e.key)&&!["ArrowLeft","ArrowRight","Tab","Delete","Backspace"].includes(e.key))e.preventDefault();
    });
  });
}

// ══ PARTIDOS GRUPO ══
function renderPartidosGrupo(g,activos){
  const info=grupos[g];
  let html=`<div class="partidos-section-title">PARTIDOS</div>`;
  info.partidos.forEach(p=>{
    const tL=equiposBD[p.l],tV=equiposBD[p.v];
    const fL=tL?.b||"🏳",fV=tV?.b||"🏳";
    const meta=`<div class="match-meta"><span class="meta-fecha">${p.f}</span>${p.h?`<span class="meta-hora">${p.h}</span>`:""}<span class="meta-est">${p.est||""}</span></div>`;
    const probs=tL&&tV?calcular(p.l,p.v,equiposBD):null;
    html+=`<div class="match-card">
      <div class="match-top">
        <div class="match-teams">
          <span class="team"><span class="flag">${fL}</span>${p.l}</span>
          <span class="vs-sep">VS</span>
          <span class="team"><span class="flag">${fV}</span>${p.v}</span>
        </div>${meta}
      </div>
      ${renderMercados(probs,activos)}
    </div>`;
  });
  document.getElementById("partidos-lista").innerHTML=html;
}

// ══ BRACKET ÁRBOL VISUAL ══
function flag(n){return n?(equiposBD[n]?.b||""):"";}

function bcCard(p, ronda, extraClass="") {
  if (!p) return "";
  const lDef = !!p.l, vDef = !!p.v;
  const lWin = p.ganador===p.l && lDef;
  const vWin = p.ganador===p.v && vDef;
  const lScore = (p.gl!==undefined && p.gl!=="") ? p.gl : "";
  const vScore = (p.gv!==undefined && p.gv!=="") ? p.gv : "";
  const pen = p.penales ? `<span class="bc-pen">pen: ${flag(p.penales)}${p.penales}</span>` : "";
  return `<div class="bracket-card${p.l&&p.v?" definido":""}${extraClass}" data-ronda="${ronda}" data-id="${p.id}">
    <div class="bc-team${lDef?lWin?" winner":"":""} ${!lDef?"vacio":""}">
      <span class="bc-flag">${flag(p.l)}</span>
      <span class="bc-name">${p.l||"Por definir"}</span>
      ${lScore!==""?`<span class="bc-score">${lScore}</span>`:""}
    </div>
    <div class="bc-team${vDef?vWin?" winner":"":""} ${!vDef?"vacio":""}">
      <span class="bc-flag">${flag(p.v)}</span>
      <span class="bc-name">${p.v||"Por definir"}</span>
      ${vScore!==""?`<span class="bc-score">${vScore}</span>`:""}
    </div>
    <div class="bc-footer">
      ${pen}
      <button class="bc-edit" data-ronda="${ronda}" data-id="${p.id}">✏️</button>
    </div>
  </div>`;
}

// Conector SVG entre columnas
function connectorSVG(n, flip=false) {
  // n = número de partidos en la columna de origen
  // Dibuja líneas que conectan pares hacia el centro
  const h = 100 / n;
  let paths = "";
  for (let i=0; i<n; i+=2) {
    const y1 = (i + 0.5) * h;
    const y2 = (i + 1.5) * h;
    const ymid = (y1 + y2) / 2;
    if (!flip) {
      paths += `<line x1="0" y1="${y1}%" x2="50%" y2="${y1}%" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
               <line x1="0" y1="${y2}%" x2="50%" y2="${y2}%" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
               <line x1="50%" y1="${y1}%" x2="50%" y2="${y2}%" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
               <line x1="50%" y1="${ymid}%" x2="100%" y2="${ymid}%" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
    } else {
      paths += `<line x1="100%" y1="${y1}%" x2="50%" y2="${y1}%" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
               <line x1="100%" y1="${y2}%" x2="50%" y2="${y2}%" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
               <line x1="50%" y1="${y1}%" x2="50%" y2="${y2}%" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
               <line x1="50%" y1="${ymid}%" x2="0" y2="${ymid}%" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
    }
  }
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;position:absolute;top:0;left:0">${paths}</svg>`;
}

function renderBracket(llave) {
  sincronizarOctavos(llave, tablaBD);
  propagarGanadores(llave);

  const o = llave.octavos, q = llave.cuartos, s = llave.semis;

  // Lado izquierdo: O1-O8, Q1-Q4, S1-S2
  const leftOct  = ["O1","O2","O3","O4","O5","O6","O7","O8"].map(id=>o[id]);
  const leftQtr  = ["Q1","Q2","Q3","Q4"].map(id=>q[id]);
  const leftSemi = ["S1","S2"].map(id=>s[id]);

  // Lado derecho: O9-O16, Q5-Q8, S3-S4
  const rightSemi = ["S3","S4"].map(id=>s[id]);
  const rightQtr  = ["Q5","Q6","Q7","Q8"].map(id=>q[id]);
  const rightOct  = ["O9","O10","O11","O12","O13","O14","O15","O16"].map(id=>o[id]);

  const col = (items, ronda, extraClass="") =>
    `<div class="bracket-slots">${items.map(p=>bcCard(p,ronda,extraClass)).join("")}</div>`;

  const conn = (n, flip=false) =>
    `<div class="bracket-connector" style="position:relative;height:100%">${connectorSVG(n,flip)}</div>`;

  const html = `
  <div class="bracket-scroll">
    <div class="bracket-tree" style="min-height:640px">
      <!-- Títulos -->
      <div class="bracket-col"><div class="bracket-col-title">OCTAVOS</div>${col(leftOct,"octavos")}</div>
      <div style="position:relative">${conn(8,false)}</div>
      <div class="bracket-col"><div class="bracket-col-title">CUARTOS</div>${col(leftQtr,"cuartos")}</div>
      <div style="position:relative">${conn(4,false)}</div>
      <div class="bracket-col"><div class="bracket-col-title">SEMIS</div>${col(leftSemi,"semis")}</div>
      <!-- Centro -->
      <div class="bracket-center"><span>🏆</span><span class="bracket-center-label">Final</span></div>
      <!-- Lado derecho (invertido) -->
      <div class="bracket-col"><div class="bracket-col-title">SEMIS</div>${col(rightSemi,"semis")}</div>
      <div style="position:relative">${conn(4,true)}</div>
      <div class="bracket-col"><div class="bracket-col-title">CUARTOS</div>${col(rightQtr,"cuartos")}</div>
      <div style="position:relative">${conn(8,true)}</div>
      <div class="bracket-col"><div class="bracket-col-title">OCTAVOS</div>${col(rightOct,"octavos")}</div>
    </div>

    <!-- Final y 3er puesto -->
    <div class="bracket-endgame">
      <div class="endgame-section">
        <div class="endgame-title">🥉 TERCER Y CUARTO PUESTO</div>
        ${bcCard(llave.tercero["T1"],"tercero"," tercero-card")}
      </div>
      <div class="endgame-section">
        <div class="endgame-title">⭐ GRAN FINAL</div>
        ${bcCard(llave.final["F1"],"final"," final-card")}
      </div>
    </div>
  </div>`;

  document.getElementById("bracket-wrap").innerHTML = html;

  document.querySelectorAll(".bc-edit").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      abrirModalBracket(btn.dataset.ronda, btn.dataset.id, llave);
    });
  });
}

// ══ MODAL RESULTADO ELIMINATORIA ══
function abrirModalBracket(ronda, id, llave) {
  const p = llave[ronda][id];
  const nombres = Object.keys(equiposBD).sort();
  const esEditable = !p.ganador; // si ya tiene ganador, solo ver

  document.getElementById("modal-title").textContent = `${ronda.charAt(0).toUpperCase()+ronda.slice(1)} · ${p.id}`;

  // Si los equipos no están definidos aún (ej. terceros), permitir definirlos
  const mostrarSelectores = !p.l || !p.v || p.cruceL?.f==="3t" || p.cruceV?.f==="3t";

  document.getElementById("modal-form").innerHTML=`
    ${mostrarSelectores ? `
    <div class="form-group full"><label>Equipo Local</label>
      <select id="m-l"><option value="">Por definir</option>${nombres.map(n=>`<option value="${n}"${p.l===n?" selected":""}>${equiposBD[n]?.b||""} ${n}</option>`).join("")}</select>
    </div>
    <div class="form-group full"><label>Equipo Visitante</label>
      <select id="m-v"><option value="">Por definir</option>${nombres.map(n=>`<option value="${n}"${p.v===n?" selected":""}>${equiposBD[n]?.b||""} ${n}</option>`).join("")}</select>
    </div>` : `
    <div class="form-group full modal-equipos">
      <span class="modal-eq">${flag(p.l)}${p.l}</span>
      <span class="modal-vs">VS</span>
      <span class="modal-eq">${flag(p.v)}${p.v}</span>
    </div>`}
    <div class="form-group"><label>⚽ Goles ${p.l||"Local"}</label><input type="number" id="m-gl" min="0" max="30" value="${p.gl||0}"></div>
    <div class="form-group"><label>⚽ Goles ${p.v||"Visitante"}</label><input type="number" id="m-gv" min="0" max="30" value="${p.gv||0}"></div>
    <div id="penales-wrap" style="display:none" class="form-group full">
      <label>🎯 Ganó en penales</label>
      <select id="m-pen">
        <option value="">Selecciona</option>
        ${p.l?`<option value="${p.l}"${p.penales===p.l?" selected":""}>${flag(p.l)}${p.l}</option>`:""}
        ${p.v?`<option value="${p.v}"${p.penales===p.v?" selected":""}>${flag(p.v)}${p.v}</option>`:""}
      </select>
    </div>
    ${p.ganador?`<div class="form-group full"><div class="ganador-badge-modal">✓ Ganador: ${flag(p.ganador)}${p.ganador}</div><button class="btn-limpiar" id="btn-limpiar-resultado">Limpiar resultado</button></div>`:""}
  `;

  // Mostrar penales si hay empate
  const checkEmpate = () => {
    const gl = parseInt(document.getElementById("m-gl")?.value)||0;
    const gv = parseInt(document.getElementById("m-gv")?.value)||0;
    const pw = document.getElementById("penales-wrap");
    if (pw) pw.style.display = (gl===gv) ? "block" : "none";
  };
  document.getElementById("m-gl")?.addEventListener("input", checkEmpate);
  document.getElementById("m-gv")?.addEventListener("input", checkEmpate);
  if (p.gl!==undefined && p.gv!==undefined && p.gl===p.gv) checkEmpate();

  document.getElementById("modal").style.display="flex";

  // Limpiar resultado
  document.getElementById("btn-limpiar-resultado")?.addEventListener("click", async()=>{
    llave[ronda][id] = {...p, gl:"", gv:"", penales:"", ganador:""};
    propagarGanadores(llave);
    await guardarLlave(llave);
    document.getElementById("modal").style.display="none";
    renderBracket(llave);
  });

  document.getElementById("modal-guardar").onclick = async () => {
    const gl = parseInt(document.getElementById("m-gl").value)||0;
    const gv = parseInt(document.getElementById("m-gv").value)||0;
    const lEq = mostrarSelectores ? document.getElementById("m-l")?.value||p.l : p.l;
    const vEq = mostrarSelectores ? document.getElementById("m-v")?.value||p.v : p.v;
    let penales = "", ganador = "";

    if (gl > gv) ganador = lEq;
    else if (gv > gl) ganador = vEq;
    else {
      penales = document.getElementById("m-pen")?.value||"";
      ganador = penales;
    }

    llave[ronda][id] = { ...p, l:lEq, v:vEq, gl, gv, penales, ganador };
    propagarGanadores(llave);
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
let equiposBD={}, llaveBD={}, tablaBD={}, grupoSel="A";
const mercados=["1X2","Ambos marcan","Goles +/-","Corners +/-","Tarjetas +/-"];
const activos=new Set(mercados);

document.addEventListener("DOMContentLoaded", async()=>{
  document.body.insertAdjacentHTML("beforeend",`<div class="db-status" id="db-status"><div class="db-dot"></div><span class="db-label">Conectando...</span></div>`);

  equiposBD = await cargarEquipos();
  llaveBD   = await cargarLlave();
  tablaBD   = await cargarTabla();

  // TABS GRUPOS
  const tabsEl=document.getElementById("tabs-grupo");
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
    btn.className="filter-btn on";btn.textContent=m;
    btn.addEventListener("click",()=>{activos.has(m)?activos.delete(m):activos.add(m);btn.classList.toggle("on");renderPartidosGrupo(grupoSel,activos);});
    fmEl.appendChild(btn);
  });

  // NAV
  const vistas={"btn-grupos":"grupos","btn-eliminatorias":"eliminatorias","btn-actualizar":"actualizar"};
  Object.entries(vistas).forEach(([id,v])=>{
    document.getElementById(id).addEventListener("click",()=>{
      document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
      document.getElementById(id).classList.add("active");
      document.getElementById("vista-grupos").style.display       =v==="grupos"?"block":"none";
      document.getElementById("vista-eliminatorias").style.display=v==="eliminatorias"?"block":"none";
      document.getElementById("vista-actualizar").style.display   =v==="actualizar"?"block":"none";
      if(v==="eliminatorias"){sincronizarOctavos(llaveBD,tablaBD);propagarGanadores(llaveBD);renderBracket(llaveBD);}
      if(v==="actualizar")   renderFormActualizar();
    });
  });

  // GUARDAR RESULTADO
  document.getElementById("btn-guardar").addEventListener("click",async()=>{
    equiposBD = await cargarEquipos();
    const eq=document.getElementById("up-eq").value;
    const fila=[+document.getElementById("up-ga").value||0,+document.getElementById("up-gc").value||0,+document.getElementById("up-ca").value||0,+document.getElementById("up-cc").value||0,+document.getElementById("up-ya").value||0,+document.getElementById("up-yc").value||0];
    equiposBD[eq].p.push(fila);
    if(equiposBD[eq].p.length>10) equiposBD[eq].p.shift();
    const msg=document.getElementById("panel-msg");
    const ok = await guardarEquipo(eq, equiposBD[eq]);
    if (ok) {
      msg.style.color="var(--green)";
      msg.textContent=`✓ Guardado ${equiposBD[eq].b} ${eq} (${equiposBD[eq].p.length} partidos)`;
    } else {
      msg.style.color="var(--red)";
      msg.textContent=`✗ Sin conexión — dato no guardado. Conéctate a internet e intenta de nuevo.`;
    }
    setTimeout(()=>{msg.textContent="";},5000);
    if(document.getElementById("vista-grupos").style.display!=="none") renderPartidosGrupo(grupoSel,activos);
  });

  // RESET
  document.getElementById("btn-reset").addEventListener("click",async()=>{
    if(confirm("¿Resetear todos los datos?")){
      localStorage.removeItem(SK_EQ);localStorage.removeItem(SK_LLAVE);localStorage.removeItem(SK_TABLA);
      equiposBD=JSON.parse(JSON.stringify(equipos));
      llaveBD=construirLlaveInicial();
      tablaBD={};
      renderTablaGrupo(grupoSel);renderPartidosGrupo(grupoSel,activos);
    }
  });

  // MODAL
  document.getElementById("modal-cancelar").addEventListener("click",()=>{document.getElementById("modal").style.display="none";});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")document.getElementById("modal").style.display="none";});

  renderTablaGrupo(grupoSel);
  renderPartidosGrupo(grupoSel,activos);
});
