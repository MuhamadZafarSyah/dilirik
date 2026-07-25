import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"

const FOOTER = {
  id: "Dibuat dengan Dilirik — bikin CV-mu dilirik.",
  en: "Made with Dilirik — get your CV noticed.",
} as const

// Hanya font bawaan PDF (Helvetica) — tanpa fetch font eksternal, 100% offline & gratis.
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#26241f",
    lineHeight: 1.5,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 52,
  },
  name: { fontFamily: "Helvetica-Bold", fontSize: 20, marginBottom: 6 },
  heading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#d8d3c6",
    paddingBottom: 3,
    marginTop: 14,
    marginBottom: 6,
  },
  text: { marginBottom: 1 },
  bulletRow: { flexDirection: "row", marginBottom: 1 },
  bullet: { width: 12 },
  bulletText: { flex: 1 },
  gap: { height: 6 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 52,
    right: 52,
    textAlign: "center",
    fontSize: 8,
    color: "#a39d8f",
  },
})

type Line =
  | { kind: "name"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "text"; text: string }
  | { kind: "gap" }

/**
 * Typesetting ringan dari teks mentah CV — TANPA merangkum, TANPA mengubah
 * urutan. Setiap baris rawText dirender apa adanya; heuristik hanya dipakai
 * untuk gaya visual:
 * - baris pertama → nama (judul besar)
 * - baris FULL KAPITAL pendek → judul section (SUMMARY, WORK EXPERIENCES, …)
 * - baris berawalan • - – * ▪ → bullet
 * - sisanya → paragraf biasa
 */
function parseRawText(rawText: string): Line[] {
  const lines: Line[] = []
  let nameAssigned = false
  for (const raw of rawText.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim()
    if (!line) {
      if (lines.length > 0 && lines[lines.length - 1]!.kind !== "gap") lines.push({ kind: "gap" })
      continue
    }
    if (!nameAssigned) {
      lines.push({ kind: "name", text: line })
      nameAssigned = true
      continue
    }
    const bulletMatch = line.match(/^[\u2022\u25cf\u25aa\u2023\u00b7*\u2013\u2014-]\s+(.*)$/)
    if (bulletMatch) {
      lines.push({ kind: "bullet", text: bulletMatch[1]! })
      continue
    }
    const letters = line.replace(/[^A-Za-z\u00c0-\u00ff]/g, "")
    const isHeading =
      line.length <= 48 &&
      letters.length >= 3 &&
      line === line.toUpperCase() &&
      /[A-Z\u00c0-\u00dd]/.test(line)
    lines.push(isHeading ? { kind: "heading", text: line } : { kind: "text", text: line })
  }
  // Buang gap di ujung
  while (lines.length > 0 && lines[lines.length - 1]!.kind === "gap") lines.pop()
  return lines
}

type Props = {
  rawText: string
  title: string
  language: string
}

/**
 * PDF CV dari TEKS MENTAH (rawText) — sumber yang sama dengan yang ditimpa
 * saat revisi. Hasilnya: isi, urutan section, dan kalimat 100% sama dengan
 * teks CV + revisi yang diterapkan; tidak ada bagian yang dirangkum/hilang.
 * structuredJson TIDAK dipakai di sini — perannya hanya untuk analisis &
 * kartu "Hasil baca AI". Dirender sepenuhnya di browser (client-side, gratis).
 */
export function CvDocument({ rawText, title, language }: Props) {
  const footer = language.toLowerCase().startsWith("en") ? FOOTER.en : FOOTER.id
  const lines = parseRawText(rawText)

  return (
    <Document title={title} creator="Dilirik" producer="Dilirik">
      <Page size="A4" style={styles.page}>
        {lines.map((line, i) => {
          switch (line.kind) {
            case "name":
              return <Text key={i} style={styles.name}>{line.text}</Text>
            case "heading":
              return <Text key={i} style={styles.heading}>{line.text}</Text>
            case "bullet":
              return (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{line.text}</Text>
                </View>
              )
            case "gap":
              return <View key={i} style={styles.gap} />
            default:
              return <Text key={i} style={styles.text}>{line.text}</Text>
          }
        })}
        <Text style={styles.footer} fixed>{footer}</Text>
      </Page>
    </Document>
  )
}
