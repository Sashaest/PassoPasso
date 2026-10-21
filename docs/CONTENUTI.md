# Il metodo di PassoPasso — da rivedere con la specialista

Questo documento spiega **come ragiona e come parla** l’app. È scritto per chi non programma: si può commentare e correggere liberamente. Le modifiche vanno poi riportate nel codice:

- istruzioni dell’AI → `backend/src/prompts.ts`
- frasi dell’app → `app/src/lib/copy.ts` e le singole schermate in `app/src/app/`
- passi di base senza AI → `app/src/lib/fallback.ts`

## 1. Principi

1. **Iniziare è la parte difficile.** Il primo passo di ogni compito dura al massimo 2 minuti ed è “ridicolmente facile” (es. *Apri il portatile sulla pagina della banca*).
2. **Un’azione per passo, con un verbo concreto.** “Apri”, “Prendi”, “Scrivi”; mai “Organizzati”, “Pensa a”, “Gestisci”.
3. **Il tempo va reso visibile.** Ogni passo ha una stima in minuti (1–15) e un timer che si svuota.
4. **Fuori dalla vista, fuori dalla mente.** I promemoria insistono (es. ogni 10 minuti, fino a 6 volte) finché la persona risponde: *Fatto*, *Tra 10 min*, *Non oggi*.
5. **Poche priorità.** Al massimo 3 al giorno; meglio 2 realistiche che 3 troppo pesanti; possibilmente una piccola e veloce per dare slancio.
6. **La vergogna non motiva.** Niente serie da salvare, niente rosso, niente “sei in ritardo”. Una scadenza passata si chiama “In ritardo, ma si può fare”. Se si salta un giorno, si riparte da adesso.
7. **Non è terapia.** Nessuna diagnosi, nessun consiglio su farmaci o terapie. Se dal testo emerge un pericolo per la persona, l’unica risposta è invitarla a contattare subito qualcuno di fiducia o il 112.

## 2. Cosa chiediamo all’AI (in parole semplici)

**Spezza-compiti.** Riceve un compito e restituisce 2–7 passi nell’ordine giusto, ognuno con i minuti stimati, più una frase di incoraggiamento (max 100 caratteri) che invita a fare il primo passo, senza promesse e senza giudizi. Se mancano informazioni sceglie l’interpretazione più comune e non fa domande.

**Priorità del giorno.** Riceve l’elenco dei compiti aperti e sceglie fino a 3 priorità con un motivo concreto (“Scade venerdì”, “Ci vogliono 5 minuti”). Criteri, in ordine: scadenze vicine o conseguenze se rimandato → cose che sbloccano altre cose → una cosa piccola per prendere slancio.

**Tono comune.** Italiano, “tu”, caldo, semplice e diretto. Frasi brevi, niente gergo clinico, niente emoji. Mai: “dovresti”, “è facile”, “basta impegnarsi”, “pigrizia”.

### Esempio atteso

Compito: *Fare la dichiarazione dei redditi*

1. Apri il portatile sulla pagina del 730 precompilato — 2 min
2. Accedi con lo SPID — 3 min
3. Controlla i dati della prima sezione — 10 min
4. Segna su un foglio cosa non ti torna — 5 min
5. Salva la bozza e chiudi — 2 min

Incoraggiamento: *Il primo passo dura due minuti: basta aprire la pagina.*

## 3. Frasi dell’app

| Momento | Frasi attuali |
|---|---|
| Passo o compito completato | “Fatto. Questo conta.” · “Un passo in meno. Bel lavoro.” · “Ecco, l’hai fatto.” · “Uno alla volta: funziona.” · “Fatto! Respira un attimo.” |
| Ripartenza (schermata Oggi) | “Si riparte da adesso. Niente da recuperare.” · “Ieri è ieri. Oggi basta un passo.” · “Nessuna serie da salvare: solo il prossimo passo.” |
| Promemoria insistenti (a rotazione) | “Basta il primo passo: …” · “Ci sei? Il primo passo è piccolo: …” · “Due minuti, non di più: …” · “Sono ancora qui. Quando vuoi: …” |
| Lista vuota | “Lista vuota. Va benissimo così.” / “Per oggi hai fatto abbastanza.” |
| Check-in sera, nulla fatto | “Oggi è andata così, e va bene. Domani si riparte da un passo piccolo.” |
| Check-in sera, cose fatte | “Hai portato a termine N cose. Conta, tutte.” |
| Check-in mattina | “Svuota la testa: scrivi o detta tutto quello che ti gira in testa. Una riga per ogni cosa.” |
| Avviso limite AI | “Per oggi hai usato tutti gli aiuti AI gratuiti. Puoi sempre spezzare i compiti a mano: domani si riparte.” |
| Disclaimer | “PassoPasso è uno strumento di organizzazione: non fa diagnosi e non sostituisce il parere di un professionista sanitario.” |

## 4. Passi di base (senza AI)

1. Prepara ciò che ti serve per “…” e mettilo davanti a te — 2 min
2. Fai la parte più piccola e facile, solo quella — 5 min
3. Continua per un blocco breve, poi fermati e respira — 10 min
4. Controlla cosa manca e chiudi quello che puoi — 5 min

## 5. Domande aperte per la specialista

1. I principi del punto 1 sono corretti? Cosa manca (es. ricompense, pause, gestione dell’iperfocus)?
2. Durate: 1–15 minuti per passo e primo passo ≤ 2 minuti vanno bene? Serve un’opzione “passi ancora più piccoli”?
3. Promemoria: ogni 10 minuti per 6 volte è giusto o rischia di diventare fastidioso/ansiogeno? Che default consiglieresti?
4. Il tono dei messaggi è quello giusto? Ci sono parole da evitare in più?
5. Check-in serale: è utile mostrare cosa non è stato fatto, o è meglio nasconderlo del tutto?
6. Ci sono situazioni (es. momenti di crisi, sovraccarico) in cui l’app dovrebbe comportarsi diversamente?
7. Quali tecniche validate (body doubling, time blocking, “2 minuti”, ecc.) vale la pena aggiungere nelle prossime versioni?
