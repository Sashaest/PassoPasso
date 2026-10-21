# Messa in produzione

Ordine consigliato: **0 → 1 → 2 → 3 → 4**. I passi 1–3 si possono fare in una sera; il passo 4 richiede almeno 14 giorni (test chiuso obbligatorio di Google).

## 0. Decisioni da prendere prima

- [ ] **Nome definitivo.** “Passo” è un nome di lavoro: verificare che non esista già su Play Store e che non ci siano marchi registrati simili (banca dati UIBM / EUIPO).
- [ ] **ID del pacchetto Android** (`app/app.json` → `android.package`, ora `it.passo.adhd`). **Non si può cambiare dopo il primo caricamento** sul Play Store.
- [x] **Titolari e contatti**: Sasha Estatico e Francesca Estatico (contitolari), sashaestatico@gmail.com — già inseriti in privacy e termini. Far rivedere i due testi a un consulente.
- [ ] **Fisco**: con un commercialista, partita IVA o prestazione occasionale quando l’app inizierà a incassare.
- [ ] **Contratto di lavoro**: controllare clausole di esclusiva o non concorrenza.
- [ ] **Accordo di comproprietà** tra Sasha e Francesca (quote, ruoli, decisioni, uso dei nomi nel marketing, cosa succede se uno dei due esce), per iscritto. Per il GDPR serve anche un breve accordo di contitolarità (art. 26).

## 1. Backend su AWS

Prerequisiti: [AWS CLI](https://docs.aws.amazon.com/cli/) e [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) configurati; una chiave API da [console.anthropic.com](https://console.anthropic.com) con un limite di spesa mensile.

```bash
export AWS_REGION=eu-south-1          # Milano: dati in UE

# chiave AI come SecureString (non finisce mai nel codice né nel template)
aws ssm put-parameter --name /passo/anthropic-api-key --type SecureString --value 'sk-ant-...'

cd backend
npm ci
sam build
sam deploy --guided \
  --stack-name passo-prod \
  --parameter-overrides Stage=prod AllowedOrigin=https://IL-TUO-DOMINIO AppKey=$(openssl rand -hex 16)
```

Annota l’output **ApiUrl** e la `AppKey` scelta. Verifica:

```bash
curl https://<ApiUrl>/v1/salute
curl -X POST https://<ApiUrl>/v1/spezza -H 'content-type: application/json' \
  -H 'x-passo-device: 3f2b8a1e-7c4d-4e5f-9a6b-1c2d3e4f5a6b' -H 'x-passo-app-key: <AppKey>' \
  -d '{"compito":"Fare la dichiarazione dei redditi"}'
```

Consigliato: un **AWS Budget** con avviso via email (es. 10 €/mese) e un limite di spesa sulla console Anthropic.

**Costi indicativi:** Lambda, API Gateway e DynamoDB on-demand stanno quasi a zero con pochi utenti. L’AI costa una frazione di centesimo per richiesta con Claude Haiku 5.5: con il limite di 10 richieste al giorno, un utente gratuito costa al massimo pochi centesimi al mese.

## 2. Sito web

1. In `website/config.js` imposta `API_URL` con l’ApiUrl del passo 1.
2. Fai rivedere privacy e termini a un consulente.
3. Su GitHub: **Settings → Pages → Source: GitHub Actions**. A ogni push su `main` che tocca `website/`, il workflow `sito.yml` pubblica il sito.
4. Dominio (consigliato, serve anche come URL della privacy per il Play Store): aggiungi un file `website/CNAME` con il dominio e configura il DNS come indicato da GitHub. Poi aggiorna `AllowedOrigin` nel backend (`sam deploy` di nuovo).

> `404.html` usa percorsi assoluti: funziona con un dominio personalizzato. Senza dominio (indirizzo `sashaest.github.io/passo/`) la pagina 404 apparirà senza stile.

## 3. App: build con EAS

```bash
cd app
npx eas-cli@latest login            # account gratuito su expo.dev
npx eas-cli@latest init             # collega il progetto (aggiunge projectId in app.json)

# variabili (in produzione NON si usa .env.local)
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_API_URL --value https://<ApiUrl> --visibility plaintext
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_APP_KEY --value <AppKey> --visibility plaintext
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_PRIVACY_URL --value https://IL-TUO-DOMINIO/privacy.html --visibility plaintext
# ripeti per --environment preview

# APK da installare sul tuo telefono per provarla
npx eas-cli@latest build -p android --profile preview

# AAB per il Play Store
npx eas-cli@latest build -p android --profile production
```

Prova sul telefono vero almeno: promemoria con app chiusa e pulsanti delle notifiche, check-in all’ora scelta, modalità “Non disturbare”, risparmio energetico (su alcuni telefoni, es. Xiaomi o Samsung, va escluso Passo dall’ottimizzazione batteria).

> Le notifiche usano allarmi non esatti (nessun permesso `SCHEDULE_EXACT_ALARM`, che Google concede solo ad app sveglia e calendario): un promemoria può arrivare con qualche minuto di ritardo.

## 4. Google Play Console

1. **Account sviluppatore**: 25 $ una tantum, verifica dell’identità.
2. **Crea l’app**: lingua predefinita italiano, app gratuita.
3. **Test chiuso** (obbligatorio per gli account personali creati dopo il 13/11/2023): **almeno 12 tester per 14 giorni consecutivi**. Carica l’AAB su una traccia di test chiuso e invita i tester con un Google Group o una lista di email. Solo dopo puoi chiedere l’accesso alla produzione.
4. **Scheda dello store** (materiali pronti in `app/store/`):
   - Titolo (max 30): `Passo: ADHD, un passo alla volta`
   - Descrizione breve (max 80): `Compiti in micro-passi, promemoria insistenti e timer visivo. Per adulti con ADHD.`
   - Descrizione completa: vedi `app/store/descrizione.txt`
   - Icona 512×512: `app/assets/play-icon-512.png`
   - Grafica in primo piano 1024×500: `app/store/feature-graphic.png`
   - Screenshot telefono: `app/store/screenshot-*.png`
5. **Contenuti dell’app**:
   - Informativa privacy: URL di `privacy.html`.
   - Accesso all’app: nessun login richiesto.
   - Annunci: no.
   - Classificazione dei contenuti: questionario (nessun contenuto sensibile).
   - Pubblico di destinazione: **18+**.
   - App per la salute: dichiarare onestamente la categoria; Passo è uno strumento di organizzazione e produttività, **non** un dispositivo medico (non fare promesse terapeutiche nella scheda).
   - **Sicurezza dei dati** (Data safety), risposte coerenti con l’informativa:
     - Raccolta dati: **sì**, solo quando l’assistente AI è attivo.
     - “Altri contenuti generati dagli utenti” (testo dei compiti): raccolti, **non condivisi** per pubblicità, trattati in modo temporaneo, finalità *Funzionalità dell’app*, facoltativo (l’utente può spegnere l’AI).
     - “ID dispositivo o altri ID” (UUID casuale): raccolto, finalità *Funzionalità dell’app* e *Prevenzione di frodi e sicurezza*.
     - Dati crittografati in transito: **sì**. L’utente può chiedere la cancellazione: **sì**.
6. **Pubblicazione**: dopo i 14 giorni di test, richiedi l’accesso alla produzione e pubblica (anche a rilascio graduale).

## 5. Dopo il lancio

- **Piano Pro**: Google Play Billing (es. con RevenueCat, che ha un SDK per Expo); il backend legge il diritto Pro e alza `DailyFreeLimit` per quegli utenti. Ricorda la commissione del 15% di Google sugli abbonamenti.
- **Play Integrity API** al posto della `AppKey`.
- **Crash reporting** rispettoso della privacy (es. Sentry senza dati personali), da aggiungere all’informativa.
- Rivedere periodicamente con la specialista i testi di `docs/CONTENUTI.md`.
