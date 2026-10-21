# Architettura

```
 Telefono (app Expo)                      AWS (eu-south-1, Milano)                    Anthropic
┌──────────────────────────┐   HTTPS   ┌──────────────────────────────────┐  HTTPS  ┌───────────────┐
│ Compiti, passi, focus,   │ ────────▶ │ API Gateway (HTTP API, throttling)│ ──────▶ │ Claude Haiku  │
│ impostazioni             │           │   └─ Lambda "passo-api" (Node 22) │         │ 5.5 (JSON)    │
│ (AsyncStorage, locale)   │ ◀──────── │        ├─ DynamoDB "passo-<stage>"│ ◀────── └───────────────┘
│ Notifiche locali         │           │        │   quota#<hash dispositivo>│
└──────────────────────────┘           │        │   waitlist / <email>      │
                                       │        └─ SSM: chiave API AI       │
 Sito statico (GitHub Pages) ────────▶ │  POST /v1/lista-attesa            │
                                       └──────────────────────────────────┘
```

## Scelte principali

- **Niente account, dati in locale.** I compiti stanno in AsyncStorage (zustand + persist). Meno dati sensibili sul server = meno rischi e meno obblighi GDPR. Lo svantaggio: niente sincronizzazione tra dispositivi (possibile funzione Pro futura).
- **AI dietro un backend.** L’app non ha mai la chiave dell’API: chiama la Lambda, che legge la chiave da SSM Parameter Store (SecureString) e chiama il modello con *structured outputs* (`output_config.format`, schema JSON), poi normalizza la risposta (lunghezze, minuti 1–15, max 7 passi, id validi).
- **Limite gratuito per dispositivo.** L’app genera un UUID casuale; il server ne salva solo l’hash SHA-256 con un contatore giornaliero (fuso orario italiano) che DynamoDB cancella da solo dopo 48 ore (TTL). Default: 10 richieste AI al giorno (`DailyFreeLimit`).
- **Promemoria come serie finita.** Invece di una notifica ripetuta all’infinito, l’app programma N notifiche a data fissa. “Rimanda” e “Fatto” cancellano e riprogrammano la serie. Funziona offline e senza server push.
- **Degradazione gentile.** Senza rete, senza backend configurato, con limite esaurito o AI spenta: passi di base (`app/src/lib/fallback.ts`) e priorità per scadenza (`prioritaSenzaAi`).

## Endpoint

| Metodo e percorso | Corpo | Risposta |
|---|---|---|
| `GET /v1/salute` | — | `{ ok: true }` |
| `POST /v1/spezza` | `{ compito, dettagli? }` + header `x-passo-device` | `{ passi: [{testo, minuti}], incoraggiamento }` + header `x-passo-remaining` |
| `POST /v1/priorita` | `{ momento: "mattina"\|"sera", oggi: "YYYY-MM-DD", compiti: [{id, titolo, scadenza?}] }` | `{ priorita: [{id, motivo}], messaggio }` |
| `POST /v1/lista-attesa` | `{ email, consenso: true, sito?: "" (honeypot), origine? }` | `{ ok: true }` |

Errori: `{ errore: { codice, messaggio } }` con 400, 401, 429 (`limite_giornaliero`), 502 (`ai_non_disponibile`).

## Sicurezza e limiti noti

- `x-passo-app-key` (`AppKey` nel template) è solo un deterrente: chiunque estragga l’APK la può leggere. Prima di crescere: **Google Play Integrity API** per verificare che le richieste vengano dall’app autentica.
- Throttling API Gateway: 20 richieste/s, burst 50 (modificabile nel template).
- Il testo dei compiti **non viene mai scritto nei log** (si registrano solo gli errori).
- Riconoscimento vocale: per ora si usa il microfono della tastiera (nessun permesso RECORD_AUDIO, bloccato in `app.json`). Un riconoscimento vocale integrato richiederebbe una libreria nativa e una nuova valutazione privacy.

## Cartelle del codice

```
app/src/app/            schermate (Expo Router): benvenuto, (tabs)/oggi|checkin|impostazioni, compito/[id], focus/[id]
app/src/lib/            logica: tasks.ts (pura), store.ts, azioni.ts, api.ts, reminders.ts, schedule.ts, copy.ts
app/src/components/     UI riusabile e TimerVisivo
backend/src/            handler.ts (rotte), ai.ts (modello), prompts.ts (metodo), store.ts (DynamoDB), dev-server.ts
website/                index.html, privacy.html, termini.html, config.js (URL API)
```
