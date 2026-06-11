-- ══════════════════════════════════════════════════
-- SUPABASE SETUP — Mundial 2026
-- Ejecuta esto en el SQL Editor de tu proyecto Supabase
-- ══════════════════════════════════════════════════

-- Tabla de equipos
CREATE TABLE IF NOT EXISTS m26_equipos (
  nombre    TEXT PRIMARY KEY,
  bandera   TEXT,
  partidos  JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de llave eliminatoria
CREATE TABLE IF NOT EXISTS m26_llave (
  id    INTEGER PRIMARY KEY DEFAULT 1,
  data  JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de posiciones (editable desde la página, independiente de probabilidades)
CREATE TABLE IF NOT EXISTS m26_tabla (
  equipo     TEXT PRIMARY KEY,
  stats      JSONB DEFAULT '{"pj":0,"pg":0,"pe":0,"pp":0,"gf":0,"gc":0,"pts":0}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE m26_tabla ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_tabla" ON m26_tabla FOR ALL USING (true) WITH CHECK (true);
INSERT INTO m26_llave (id, data) VALUES (1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS (Row Level Security)
ALTER TABLE m26_equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE m26_llave   ENABLE ROW LEVEL SECURITY;

-- Políticas: acceso público (es solo para ti, uso personal)
CREATE POLICY "allow_all_equipos" ON m26_equipos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_llave"   ON m26_llave   FOR ALL USING (true) WITH CHECK (true);
