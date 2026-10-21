export type Passo = {
  id: string;
  testo: string;
  minuti: number;
  fatto: boolean;
};

export type Promemoria = {
  /** id delle notifiche programmate (una serie finita, vedi lib/reminders.ts) */
  ids: string[];
  /** quando parte la prima notifica (ISO) */
  dal: string;
};

export type Compito = {
  id: string;
  titolo: string;
  creatoIl: string;
  /** giorno entro cui farlo (YYYY-MM-DD), facoltativo */
  scadenza?: string;
  passi: Passo[];
  incoraggiamento?: string;
  fatto: boolean;
  fattoIl?: string;
  /** giorno (YYYY-MM-DD) in cui l'utente ha detto "non oggi": il compito resta nascosto fino a domani */
  nonOggi?: string;
  promemoria?: Promemoria;
};

export type Orario = { attivo: boolean; ora: number; minuto: number };

export type Impostazioni = {
  onboardingFatto: boolean;
  /** l'utente ha accettato di inviare il testo dei compiti all'assistente AI */
  usaAi: boolean;
  intervalloPromemoria: 5 | 10 | 15 | 30;
  ripetizioniPromemoria: number;
  checkinMattina: Orario;
  checkinSera: Orario;
  leggiAdAltaVoce: boolean;
};

export type Focus = {
  giorno: string;
  ids: string[];
  motivi: Record<string, string>;
  messaggio?: string;
};
