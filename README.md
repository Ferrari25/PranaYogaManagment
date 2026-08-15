# PRANA YOGA — Estudio & Bienestar

Aplicación de gestión para el estudio de yoga: alumnos, pagos, planes, clases y
reservas públicas. Reconstrucción limpia y minimalista de la app original.

## Stack

- **React 19 + Vite + TypeScript** — frontend SPA
- **Tailwind CSS 4** — estilos (tonos neutros, tipografía serif en títulos)
- **Supabase** (PostgreSQL) — base de datos y API
- **Vercel** — hosting con deploys automáticos desde GitHub

## Rutas

| Ruta | Descripción |
|---|---|
| `/` | Inicio: métricas rápidas del estudio |
| `/clases` | Grilla semanal de clases y horarios |
| `/alumnos` | Gestión de miembros, planes y asistencias |
| `/pagos` | Registro de cobros, filtros y exportación CSV |
| `/planes` | Tarifas y tipos de membresía |
| `/reservas` | Vista admin de reservas + link público |
| `/book` | **Página pública** para que los clientes reserven su cupo |

No hay login: el panel está abierto para la administración del estudio
(diseñado para cero fricción, tipografía grande y botones claros).

## Desarrollo local

```bash
npm install
cp .env.example .env   # completar con las claves de Supabase
npm run dev
```

## Estructura

```
supabase/schema.sql      Esquema SQL completo + seed data (pegar en Supabase)
src/
  lib/
    supabase.ts          Cliente de Supabase
    types.ts             Tipos del dominio (1:1 con las columnas de la DB)
    api.ts               Capa de datos: CRUD directo, sin mappers
    format.ts            Formateo de precios, fechas y links de WhatsApp
  hooks/useData.ts       Hook de carga de datos con recarga
  components/
    ui.tsx               Primitivas: Button, Modal, Badge, Table, etc.
    *Modal.tsx           Modales de alta/edición por entidad
  layouts/AdminLayout.tsx  Sidebar de navegación
  pages/                 Una página por módulo
```

Ver [DEPLOY.md](DEPLOY.md) para la guía completa de despliegue.
