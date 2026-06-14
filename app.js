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
  const data = rows[0].data;
  // Si la llave guardada no tiene r32 (formato viejo), reconstruir
  if (!data || !data.r32) return construirLlaveInicial();
  return data;
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
const RONDA32 = [
  {id:"M73",  desc:"2°A vs 2°B",            lPos:"2A", vPos:"2B",  f3:false, f:"28 Jun", h:"15:00", est:"Los Ángeles"},
  {id:"M74",  desc:"1°E vs 3°ABCDF",        lPos:"1E", vPos:"3t",  f3:true,  f:"29 Jun", h:"16:30", est:"Boston"},
  {id:"M75",  desc:"1°F vs 2°C",            lPos:"1F", vPos:"2C",  f3:false, f:"29 Jun", h:"21:00", est:"Monterrey"},
  {id:"M76",  desc:"1°C vs 2°F",            lPos:"1C", vPos:"2F",  f3:false, f:"29 Jun", h:"13:00", est:"Houston"},
  {id:"M77",  desc:"1°I vs 3°CDFGH",        lPos:"1I", vPos:"3t",  f3:true,  f:"30 Jun", h:"17:00", est:"Nueva Jersey"},
  {id:"M78",  desc:"2°E vs 2°I",            lPos:"2E", vPos:"2I",  f3:false, f:"30 Jun", h:"13:00", est:"Dallas"},
  {id:"M79",  desc:"1°A vs 3°CEFHI",        lPos:"1A", vPos:"3t",  f3:true,  f:"30 Jun", h:"21:00", est:"Cd. México"},
  {id:"M80",  desc:"1°L vs 3°EHIJK",        lPos:"1L", vPos:"3t",  f3:true,  f:"1 Jul",  h:"12:00", est:"Atlanta"},
  {id:"M81",  desc:"1°D vs 3°BEFIJ",        lPos:"1D", vPos:"3t",  f3:true,  f:"1 Jul",  h:"20:00", est:"Santa Clara"},
  {id:"M82",  desc:"1°G vs 3°AEHIJ",        lPos:"1G", vPos:"3t",  f3:true,  f:"1 Jul",  h:"16:00", est:"Seattle"},
  {id:"M83",  desc:"2°K vs 2°L",            lPos:"2K", vPos:"2L",  f3:false, f:"2 Jul",  h:"19:00", est:"Toronto"},
  {id:"M84",  desc:"1°H vs 2°J",            lPos:"1H", vPos:"2J",  f3:false, f:"2 Jul",  h:"15:00", est:"Los Ángeles"},
  {id:"M85",  desc:"1°B vs 3°EFGIJ",        lPos:"1B", vPos:"3t",  f3:true,  f:"2 Jul",  h:"23:00", est:"Vancouver"},
  {id:"M86",  desc:"1°J vs 2°H",            lPos:"1J", vPos:"2H",  f3:false, f:"3 Jul",  h:"18:00", est:"Miami"},
  {id:"M87",  desc:"1°K vs 3°DEIJL",        lPos:"1K", vPos:"3t",  f3:true,  f:"3 Jul",  h:"21:30", est:"Kansas City"},
  {id:"M88",  desc:"2°D vs 2°G",            lPos:"2D", vPos:"2G",  f3:false, f:"3 Jul",  h:"14:00", est:"Dallas"},
];

const OCTAVOS_DEF = [
  {id:"M89",  desc:"W-M74 vs W-M77",  w1:"M74", w2:"M77", f:"4 Jul",  h:"17:00", est:"Filadelfia"},
  {id:"M90",  desc:"W-M73 vs W-M75",  w1:"M73", w2:"M75", f:"4 Jul",  h:"13:00", est:"Houston"},
  {id:"M91",  desc:"W-M76 vs W-M78",  w1:"M76", w2:"M78", f:"5 Jul",  h:"16:00", est:"Nueva Jersey"},
  {id:"M92",  desc:"W-M79 vs W-M80",  w1:"M79", w2:"M80", f:"5 Jul",  h:"20:00", est:"Cd. México"},
  {id:"M93",  desc:"W-M83 vs W-M84",  w1:"M83", w2:"M84", f:"6 Jul",  h:"15:00", est:"Dallas"},
  {id:"M94",  desc:"W-M81 vs W-M82",  w1:"M81", w2:"M82", f:"6 Jul",  h:"20:00", est:"Seattle"},
  {id:"M95",  desc:"W-M86 vs W-M88",  w1:"M86", w2:"M88", f:"7 Jul",  h:"12:00", est:"Atlanta"},
  {id:"M96",  desc:"W-M85 vs W-M87",  w1:"M85", w2:"M87", f:"7 Jul",  h:"16:00", est:"Vancouver"},
];

const CUARTOS_DEF = [
  {id:"M97",  desc:"W-M89 vs W-M90",  w1:"M89", w2:"M90", f:"9 Jul",  h:"16:00", est:"Boston"},
  {id:"M98",  desc:"W-M93 vs W-M94",  w1:"M93", w2:"M94", f:"10 Jul", h:"15:00", est:"Los Ángeles"},
  {id:"M99",  desc:"W-M91 vs W-M92",  w1:"M91", w2:"M92", f:"11 Jul", h:"17:00", est:"Miami"},
  {id:"M100", desc:"W-M95 vs W-M96",  w1:"M95", w2:"M96", f:"11 Jul", h:"21:00", est:"Kansas City"},
];

const SEMIS_DEF = [
  {id:"M101", desc:"W-M97 vs W-M98",   w1:"M97",  w2:"M98",  f:"14 Jul", h:"15:00", est:"Dallas"},
  {id:"M102", desc:"W-M99 vs W-M100",  w1:"M99",  w2:"M100", f:"15 Jul", h:"15:00", est:"Atlanta"},
];

function construirLlaveInicial() {
  const llave = { r32:{}, octavos:{}, cuartos:{}, semis:{}, tercero:{}, final:{} };
  RONDA32.forEach(c     => { llave.r32[c.id]      = {...c, l:"", v:"", gl:"", gv:"", penales:"", ganador:""}; });
  OCTAVOS_DEF.forEach(c => { llave.octavos[c.id]  = {...c, l:"", v:"", gl:"", gv:"", penales:"", ganador:""}; });
  CUARTOS_DEF.forEach(c => { llave.cuartos[c.id]  = {...c, l:"", v:"", gl:"", gv:"", penales:"", ganador:""}; });
  SEMIS_DEF.forEach(c   => { llave.semis[c.id]    = {...c, l:"", v:"", gl:"", gv:"", penales:"", ganador:""}; });
  llave.tercero["M103"] = {id:"M103", desc:"Perdedor S1 vs Perdedor S2", l:"", v:"", gl:"", gv:"", penales:"", ganador:"", f:"18 Jul", h:"17:00", est:"Miami"};
  llave.final["M104"]   = {id:"M104", desc:"Ganador S1 vs Ganador S2",   l:"", v:"", gl:"", gv:"", penales:"", ganador:"", f:"19 Jul", h:"15:00", est:"Nueva Jersey"};
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

// ── RESOLVER POSICIÓN DESDE TABLA ──
function clasificado(pos, grupo) {
  if (!grupo || !grupos[grupo]) return "";
  const eqs = grupos[grupo].eq;
  const ord = [...eqs].sort((a,b)=>{
    const sa=tablaBD[a]||{pts:0,gf:0,gc:0}, sb=tablaBD[b]||{pts:0,gf:0,gc:0};
    const dp=sb.pts-sa.pts; if(dp!==0) return dp;
    return (sb.gf-sb.gc)-(sa.gf-sa.gc);
  });
  const n = parseInt(pos[0])-1; // "1E" → índice 0
  return ord[n] || "";
}

// ── SINCRONIZAR R32 CON TABLA ──
function sincronizarR32(llave) {
  RONDA32.forEach(c => {
    const p = llave.r32[c.id];
    if (p.ganador) return; // ya tiene resultado, no tocar
    // local
    if (!c.f3) {
      const [posL, grupoL] = [c.lPos[0], c.lPos.slice(1)];
      p.l = clasificado(posL, grupoL);
    }
    // visitante
    if (!c.f3) {
      const [posV, grupoV] = [c.vPos[0], c.vPos.slice(1)];
      p.v = clasificado(posV, grupoV);
    }
    // Los 3eros (f3:true) se definen manualmente desde el modal
  });
}

// ── PROPAGACIÓN DE GANADORES ──
function propagarGanadores(llave) {
  // R32 → Octavos
  OCTAVOS_DEF.forEach(c => {
    const p = llave.octavos[c.id];
    if (p.ganador) return;
    const r1 = llave.r32[c.w1], r2 = llave.r32[c.w2];
    if (r1?.ganador) p.l = r1.ganador;
    if (r2?.ganador) p.v = r2.ganador;
  });
  // Octavos → Cuartos
  CUARTOS_DEF.forEach(c => {
    const p = llave.cuartos[c.id];
    if (p.ganador) return;
    const o1 = llave.octavos[c.w1], o2 = llave.octavos[c.w2];
    if (o1?.ganador) p.l = o1.ganador;
    if (o2?.ganador) p.v = o2.ganador;
  });
  // Cuartos → Semis
  SEMIS_DEF.forEach(c => {
    const p = llave.semis[c.id];
    if (p.ganador) return;
    const q1 = llave.cuartos[c.w1], q2 = llave.cuartos[c.w2];
    if (q1?.ganador) p.l = q1.ganador;
    if (q2?.ganador) p.v = q2.ganador;
  });
  // Semis → 3er puesto (perdedores)
  const t = llave.tercero["M103"];
  if (!t.ganador) {
    const s1 = llave.semis["M101"], s2 = llave.semis["M102"];
    if (s1?.ganador && s1.l && s1.v) t.l = s1.l===s1.ganador ? s1.v : s1.l;
    if (s2?.ganador && s2.l && s2.v) t.v = s2.l===s2.ganador ? s2.v : s2.l;
  }
  // Semis → Final (ganadores)
  const f = llave.final["M104"];
  if (!f.ganador) {
    const s1 = llave.semis["M101"], s2 = llave.semis["M102"];
    if (s1?.ganador) f.l = s1.ganador;
    if (s2?.ganador) f.v = s2.ganador;
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
      sincronizarR32(llaveBD);
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
  if (!p) return '<div class="bracket-card"><div class="bc-team vacio">Por definir</div><div class="bc-team vacio">Por definir</div></div>';
  const lWin = p.ganador && p.ganador===p.l;
  const vWin = p.ganador && p.ganador===p.v;
  const lScore = (p.gl!==undefined && p.gl!=="") ? p.gl : "";
  const vScore = (p.gv!==undefined && p.gv!=="") ? p.gv : "";
  const pen = p.penales ? `<span class="bc-pen">pen: ${flag(p.penales)}${p.penales}</span>` : "";

  // Probabilidades 1X2 si hay datos
  let probBar = "";
  if (p.l && p.v && equiposBD[p.l] && equiposBD[p.v] && !p.ganador) {
    const pr = calcular(p.l, p.v, equiposBD);
    if (pr) {
      const ox = pr["1X2"];
      probBar = `<div style="margin:3px 0 1px">${barra(Object.keys(ox), Object.values(ox), "1X2")}</div>`;
    }
  }

  return `<div class="bracket-card${p.l&&p.v?" definido":""}${extraClass}">
    <div class="bc-team${!p.l?" vacio":lWin?" winner":""}">
      <span class="bc-flag">${flag(p.l)}</span>
      <span class="bc-name">${p.l||"Por definir"}</span>
      ${lScore!==""?`<span class="bc-score">${lScore}</span>`:""}
    </div>
    <div class="bc-team${!p.v?" vacio":vWin?" winner":""}">
      <span class="bc-flag">${flag(p.v)}</span>
      <span class="bc-name">${p.v||"Por definir"}</span>
      ${vScore!==""?`<span class="bc-score">${vScore}</span>`:""}
    </div>
    ${probBar}
    <div class="bc-footer">
      <span class="bc-meta">${p.f||""} ${p.h||""}</span>
      ${pen}
      <button class="bc-edit" data-ronda="${ronda}" data-id="${p.id}">✏️</button>
    </div>
  </div>`;
}

function makeSlots(items, ronda, extraClass="") {
  return items.map(p => `<div class="b-slot">${bcCard(p, ronda, extraClass)}</div>`).join("");
}

function makeConnSVG(n, dir) {
  const pairs = n / 2;
  const slotH = 100 / n;
  let paths = "";
  for (let i = 0; i < pairs; i++) {
    const y1 = (i*2+0.5)*slotH;
    const y2 = (i*2+1.5)*slotH;
    const ym = (y1+y2)/2;
    if (dir==="right") {
      paths += `<line x1="0" y1="${y1}%" x2="50%" y2="${y1}%" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
        <line x1="0" y1="${y2}%" x2="50%" y2="${y2}%" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
        <line x1="50%" y1="${y1}%" x2="50%" y2="${y2}%" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
        <line x1="50%" y1="${ym}%" x2="100%" y2="${ym}%" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`;
    } else {
      paths += `<line x1="100%" y1="${y1}%" x2="50%" y2="${y1}%" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
        <line x1="100%" y1="${y2}%" x2="50%" y2="${y2}%" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
        <line x1="50%" y1="${y1}%" x2="50%" y2="${y2}%" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
        <line x1="50%" y1="${ym}%" x2="0" y2="${ym}%" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`;
    }
  }
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${paths}</svg>`;
}

function makeConn(n, dir) {
  return `<div class="b-conn"><div class="b-conn-inner">${makeConnSVG(n,dir)}</div></div>`;
}

function makeCol(title, items, ronda, extraClass="") {
  return `<div class="b-col">
    <div class="b-col-title">${title}</div>
    <div class="b-slots">${makeSlots(items, ronda, extraClass)}</div>
  </div>`;
}

function renderBracket(llave) {
  sincronizarR32(llave);
  propagarGanadores(llave);

  const r = llave.r32, o = llave.octavos, q = llave.cuartos, s = llave.semis;

  // Lado izquierdo: M73,M74,M75,M76,M77,M78,M79,M80 → M89,M90,M91,M92 → M97,M99 → M101
  const lr32  = ["M73","M74","M75","M76","M77","M78","M79","M80"].map(id=>r[id]);
  const loct  = ["M89","M90","M91","M92"].map(id=>o[id]);
  const lqtr  = ["M97","M99"].map(id=>q[id]);
  const lsemi = ["M101"].map(id=>s[id]);

  // Lado derecho: M81,M82,M83,M84,M85,M86,M87,M88 → M93,M94,M95,M96 → M98,M100 → M102
  const rsemi = ["M102"].map(id=>s[id]);
  const rqtr  = ["M98","M100"].map(id=>q[id]);
  const roct  = ["M93","M94","M95","M96"].map(id=>o[id]);
  const rr32  = ["M81","M82","M83","M84","M85","M86","M87","M88"].map(id=>r[id]);

  const html = `
  <div class="bracket-scroll">
    <div class="bracket-body">
      <!-- LADO IZQUIERDO: R32 → Octavos → Cuartos → Semis → centro -->
      <div class="bracket-side">
        ${makeCol("DIECISEISAVOS", lr32, "r32")}
        ${makeConn(8,"right")}
        ${makeCol("OCTAVOS DE FINAL", loct, "octavos")}
        ${makeConn(4,"right")}
        ${makeCol("CUARTOS DE FINAL", lqtr, "cuartos")}
        ${makeConn(2,"right")}
        ${makeCol("SEMIFINAL", lsemi, "semis")}
        ${makeConn(1,"right")}
      </div>
      <!-- CENTRO -->
      <div class="bracket-center">
        <span class="bracket-center-emoji">🏆</span>
        <span class="bracket-center-label">Final<br>19 Jul</span>
      </div>
      <!-- LADO DERECHO: centro → Semis → Cuartos → Octavos → R32 -->
      <div class="bracket-side right">
        ${makeConn(1,"left")}
        ${makeCol("SEMIFINAL", rsemi, "semis")}
        ${makeConn(2,"left")}
        ${makeCol("CUARTOS DE FINAL", rqtr, "cuartos")}
        ${makeConn(4,"left")}
        ${makeCol("OCTAVOS DE FINAL", roct, "octavos")}
        ${makeConn(8,"left")}
        ${makeCol("DIECISEISAVOS", rr32, "r32")}
      </div>
    </div>
    <!-- FINAL Y 3ER PUESTO -->
    <div class="bracket-endgame">
      <div class="endgame-section">
        <div class="endgame-title">🥉 TERCER Y CUARTO PUESTO · 18 Jul · Miami</div>
        ${bcCard(llave.tercero["M103"], "tercero", " tercero-card")}
      </div>
      <div class="endgame-section">
        <div class="endgame-title">⭐ GRAN FINAL · 19 Jul · Nueva Jersey</div>
        ${bcCard(llave.final["M104"], "final", " final-card")}
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
  // Asegurar que r32 también esté en el objeto llave
  if (!llave[ronda]) { console.error("Ronda no encontrada:", ronda); return; }
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
    if (ronda !== "r32") propagarGanadores(llave);
    else { propagarGanadores(llave); } // también propaga desde r32
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
    <div class="form-group"><label>⚽ Goles anotados</label><input type="number" id="up-ga" min="0" max="20" placeholder="0"></div>
    <div class="form-group"><label>⚽ Goles recibidos</label><input type="number" id="up-gc" min="0" max="20" placeholder="0"></div>
    <div class="form-group"><label>🔄 Corners a favor</label><input type="number" id="up-ca" min="0" max="30" placeholder="0"></div>
    <div class="form-group"><label>🔄 Corners en contra</label><input type="number" id="up-cc" min="0" max="30" placeholder="0"></div>
    <div class="form-group"><label>🟨 Amarillas propias</label><input type="number" id="up-ya" min="0" max="11" placeholder="0"></div>
    <div class="form-group"><label>🟨 Amarillas rival</label><input type="number" id="up-yc" min="0" max="11" placeholder="0"></div>`;
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
      if(v==="eliminatorias"){sincronizarR32(llaveBD);propagarGanadores(llaveBD);renderBracket(llaveBD);}
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
      renderFormActualizar(); // resetea todos los campos
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
