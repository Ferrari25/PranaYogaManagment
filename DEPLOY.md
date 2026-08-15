# Guía de Despliegue — PRANA YOGA Management

Pasos completos para dejar la aplicación funcionando en producción:
GitHub → Supabase → Vercel.

---

## 1. Subir el proyecto al repositorio de GitHub

El repositorio destino es `https://github.com/Ferrari25/PranaYogaManagment`.

Desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Reconstrucción limpia de PRANA YOGA Management"
git branch -M main
git remote add origin https://github.com/Ferrari25/PranaYogaManagment.git
git push -u origin main
```

> Si el repositorio ya tiene contenido y querés reemplazarlo, usá
> `git push -u origin main --force` (esto pisa lo anterior).

---

## 2. Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá una cuenta (gratis).
2. **New project** → elegí nombre (ej: `prana-yoga`), contraseña de base de
   datos y región (South America - São Paulo es la más cercana).
3. Cuando el proyecto termine de crearse, abrí el **SQL Editor** (ícono de
   terminal en el menú lateral).
4. Abrí el archivo [`supabase/schema.sql`](supabase/schema.sql) de este
   repositorio, copiá **todo** su contenido, pegalo en el editor y presioná
   **Run**.

   > **¿Ya habías ejecutado schema.sql antes?** Entonces solo te falta lo
   > nuevo: ejecutá [`supabase/migration.sql`](supabase/migration.sql) de la
   > misma forma. Agrega las inscripciones a clases, los pagos divididos, el
   > mes de imputación de cuotas y las tablas de Masajes & Reiki, sin tocar
   > los datos existentes. Después ejecutá también
   > [`supabase/migration-seguridad.sql`](supabase/migration-seguridad.sql)
   > (ver el paso siguiente).

5. **Login del panel:** ejecutá
   [`supabase/migration-seguridad.sql`](supabase/migration-seguridad.sql) en el
   SQL Editor (las instalaciones nuevas ya lo traen incluido en `schema.sql`).
   Luego creá el usuario administrador:
   - Andá a **Authentication → Users → Add user → Create new user**.
   - Cargá el email y una contraseña, y activá **Auto Confirm User**.
   - Con ese email y contraseña se entra al panel. La sesión queda guardada en
     el navegador: se inicia sesión una sola vez por dispositivo.
   - La página pública de reservas (`/book`) no requiere login.
   - Esto crea las 6 tablas (`planes`, `alumnos`, `alumno_planes`, `pagos`,
     `clases`, `reservas`), los índices, las políticas de acceso y carga los
     planes reales del estudio + alumnos de prueba.
   - El script es idempotente: se puede ejecutar más de una vez sin romper nada.
6. Andá a **Project Settings → API** y copiá dos valores:
   - **Project URL** (ej: `https://abcd1234.supabase.co`)
   - **anon public key** (una clave larga que empieza con `eyJ…`)

---

## 3. Probar en local (opcional pero recomendado)

```bash
npm install
```

Copiá `.env.example` como `.env` y completá:

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...tu-clave-anon...
```

```bash
npm run dev
```

Abrí `http://localhost:5173` — deberías ver el panel con los planes y los
alumnos de prueba cargados.

---

## 4. Conectar el repositorio en Vercel

1. Entrá a [vercel.com](https://vercel.com) e iniciá sesión **con tu cuenta de
   GitHub**.
2. **Add New… → Project** → en la lista de repositorios elegí
   `Ferrari25/PranaYogaManagment` → **Import**.
3. Vercel detecta Vite automáticamente. No cambies el build command
   (`npm run build`) ni el output (`dist`).
4. En la sección **Environment Variables**, agregá las dos variables:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | la Project URL de Supabase |
   | `VITE_SUPABASE_ANON_KEY` | la clave anon public de Supabase |

5. **Deploy**. En un minuto la app queda publicada en una URL tipo
   `https://prana-yoga-managment.vercel.app`.

### Deploys automáticos

Ya quedó activado: cada `git push` a la rama `main` dispara un deploy nuevo en
Vercel automáticamente. Para publicar cambios:

```bash
git add .
git commit -m "descripción del cambio"
git push
```

### Nota sobre las rutas

El archivo `vercel.json` incluido redirige todas las rutas a `index.html`
(necesario para que `/alumnos`, `/book`, etc. funcionen al recargar la página).
No hace falta configurar nada extra.

---

## 5. Compartir la página de reservas

La vista pública para clientes queda en:

```
https://TU-APP.vercel.app/book
```

Ese link también se puede copiar desde el módulo **Reservas** del panel.
