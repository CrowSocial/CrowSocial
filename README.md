# CrowSocial

Responsive Social Network als React + TypeScript + Supabase + PostgreSQL + PWA.

## Deployment
1. `npm install`
2. Supabase-Projekt erstellen.
3. `supabase/schema.sql` im Supabase SQL Editor ausführen.
4. `.env.example` nach `.env` kopieren und `VITE_SUPABASE_URL` sowie `VITE_SUPABASE_ANON_KEY` eintragen.
5. `npm run build` testen.
6. GitHub Repository anlegen und Projekt pushen.
7. In Vercel das Repository importieren und die beiden VITE-Variablen setzen.
8. Deployen und optional eine eigene Domain verbinden.

## Owner
Der Owner sollte NICHT per Frontend festgelegt werden. Lege nach der Registrierung den ersten Owner serverseitig über eine geschützte Supabase-Admin-Funktion/SQL-Migration fest. Der Browser darf Rollen nie selbst ändern.

## Cloud
Nach Vercel/Supabase Deployment muss dein eigener PC nicht dauerhaft laufen. Vercel hostet das Frontend und Supabase Datenbank/Auth/Storage/Realtime.

## PWA
`manifest.json` ist enthalten. Für produktive App-Icons sollten PNG/WebP Icons in `public/icons/` ergänzt und im Manifest eingetragen werden.

## Hinweis
Dies ist eine funktionierende Projektgrundlage mit Auth, Feed, Posts, Rollen-/Badge-Darstellung, Admin-/Owner-Oberfläche und Supabase-Schema. Für einen echten Launch müssen insbesondere Storage-Policies, serverseitige Admin-Funktionen, Rate Limits, Moderationsworkflows und die übrigen Realtime-Chat-/Notification-Operationen noch produktionssicher vervollständigt werden.
