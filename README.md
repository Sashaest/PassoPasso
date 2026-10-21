# Passo — un passo alla volta

Assistente in italiano per adulti con ADHD: spezza i compiti in micro-passi con l’AI, ricorda le cose con insistenza finché non rispondi, mostra il tempo con un timer visivo. Senza sensi di colpa.

> Passo è uno strumento di organizzazione, non un dispositivo medico.

Progetto in comproprietà di **Sasha Estatico** (sviluppo) e **Francesca Estatico** (specialista in ADHD: metodo e contenuti).

## Cosa c’è in questo repository

| Cartella | Cosa contiene | Tecnologia |
|---|---|---|
| [`app/`](app) | L’app Android (e in futuro iOS) | Expo SDK 58 · React Native · TypeScript · Expo Router |
| [`backend/`](backend) | Il server dell’assistente AI e della lista d’attesa | AWS Lambda · API Gateway · DynamoDB (SAM) · Claude Haiku 5.5 |
| [`website/`](website) | Il sito: landing con lista d’attesa, privacy, termini | HTML/CSS/JS statico (GitHub Pages) |
| [`docs/`](docs) | Architettura, messa in produzione, contenuti da far rivedere | Markdown |

## Funzioni dell’app (MVP)

1. **Spezza-compiti AI**: ogni compito diventa 2–7 micro-passi da 1–15 minuti; il primo dura al massimo 2 minuti. Senza rete o senza AI: traccia di base.
2. **Promemoria insistenti**: una serie di notifiche (es. ogni 10 minuti, 6 volte) con i pulsanti *Fatto*, *Tra 10 min*, *Non oggi*.
3. **Timer visivo**: modalità focus con un solo passo a schermo e un disco che si svuota; schermo sempre acceso.
4. **Check-in mattina e sera**: “svuota la testa” (testo o dettatura dalla tastiera), l’AI propone 3 priorità; la sera si guarda cosa è stato fatto. Lettura ad alta voce facoltativa.
5. **Zero sensi di colpa**: niente serie, niente numeri rossi; “Non oggi” rimanda a domani.

Privacy by design: nessun account, i dati restano sul telefono; all’AI va solo il testo dei compiti (disattivabile).

## Avvio rapido in locale

```bash
# 1. Backend finto (nessun costo, nessun AWS)
cd backend && npm install && npm run dev        # http://localhost:8787
#    con l'AI vera: ANTHROPIC_API_KEY=sk-... npm run dev

# 2. App
cd app && npm install
cp .env.example .env.local                      # EXPO_PUBLIC_API_URL=http://<IP-del-PC>:8787
npx expo start                                  # poi "a" per Android, oppure inquadra il QR con Expo Go

# 3. Sito
cd website && python3 -m http.server 8080       # http://localhost:8080
```

## Controlli

```bash
cd backend && npm run typecheck && npm test && npm run build
cd app && npm run typecheck && npm run lint && npm test
```

La CI di GitHub (`.github/workflows/ci.yml`) esegue gli stessi controlli a ogni push, e `sito.yml` pubblica il sito su GitHub Pages.

## Andare in produzione

Tutti i passaggi (AWS, Play Console, test chiuso con 12 tester, scheda dello store, modulo “Sicurezza dei dati”) sono in **[docs/PRODUZIONE.md](docs/PRODUZIONE.md)**.
