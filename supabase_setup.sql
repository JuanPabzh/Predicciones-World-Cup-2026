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

-- Fila inicial llave (solo 1 fila)
INSERT INTO m26_llave (id, data) VALUES (1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS (Row Level Security)
ALTER TABLE m26_equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE m26_llave   ENABLE ROW LEVEL SECURITY;

-- Políticas: acceso público (es solo para ti, uso personal)
CREATE POLICY "allow_all_equipos" ON m26_equipos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_llave"   ON m26_llave   FOR ALL USING (true) WITH CHECK (true);
