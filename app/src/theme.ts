/** Palette e misure. Colori caldi e calmi, contrasto alto, bersagli grandi. */
export const colori = {
  sfondo: "#F7F4EE",
  superficie: "#FFFDF9",
  superficieAlta: "#EDE7DC",
  inchiostro: "#1F2A44",
  testoSoft: "#4A5568",
  testoTenue: "#6B6458",
  accento: "#E8833A",
  accentoScuro: "#A84A16",
  successo: "#2F6B4F",
  successoChiaro: "#E3F0E8",
  bordo: "#E3DCCF",
  pericolo: "#A33A2E",
  bianco: "#FFFDF9",
} as const;

export const spazi = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;

export const raggi = { s: 10, m: 16, l: 24, pillola: 999 } as const;

export const testo = {
  titolone: { fontSize: 30, fontWeight: "700" as const, color: colori.inchiostro, lineHeight: 36 },
  titolo: { fontSize: 22, fontWeight: "700" as const, color: colori.inchiostro, lineHeight: 28 },
  sottotitolo: { fontSize: 18, fontWeight: "600" as const, color: colori.inchiostro, lineHeight: 24 },
  corpo: { fontSize: 17, color: colori.inchiostro, lineHeight: 24 },
  soft: { fontSize: 16, color: colori.testoSoft, lineHeight: 22 },
  piccolo: { fontSize: 14, color: colori.testoTenue, lineHeight: 20 },
  etichetta: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colori.accentoScuro,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
};
