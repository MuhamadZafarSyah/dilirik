import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import type { CvStructured } from "@dilirik/shared"

const LABELS = {
  id: {
    skills: "Keahlian",
    experience: "Pengalaman",
    achievements: "Pencapaian",
    education: "Pendidikan",
    footer: "Dibuat dengan Dilirik — bikin CV-mu dilirik.",
  },
  en: {
    skills: "Skills",
    experience: "Experience",
    achievements: "Achievements",
    education: "Education",
    footer: "Made with Dilirik — get your CV noticed.",
  },
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
  name: { fontFamily: "Helvetica-Bold", fontSize: 22, marginBottom: 2 },
  headline: { fontSize: 11, color: "#6f6a5f" },
  section: { marginTop: 16 },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#d8d3c6",
    paddingBottom: 3,
    marginBottom: 8,
  },
  skillsRow: { flexDirection: "row", flexWrap: "wrap" },
  skill: {
    fontSize: 9,
    backgroundColor: "#f1ede2",
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginRight: 4,
    marginBottom: 4,
  },
  item: { marginBottom: 8 },
  itemTitle: { fontFamily: "Helvetica-Bold", fontSize: 10.5 },
  itemMeta: { fontSize: 9, color: "#6f6a5f", marginBottom: 2 },
  bulletRow: { flexDirection: "row", marginBottom: 1 },
  bullet: { width: 10 },
  bulletText: { flex: 1 },
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

type Props = {
  cv: CvStructured
  title: string
  language: string
}

/**
 * Template PDF CV ATS-friendly (1 kolom, font standar, tanpa grafis) yang
 * dirender dari structuredJson versi CV — dipakai untuk fitur "Download PDF"
 * hasil revisi. Dirender sepenuhnya di browser (client-side).
 */
export function CvDocument({ cv, title, language }: Props) {
  const t = language.toLowerCase().startsWith("en") ? LABELS.en : LABELS.id

  return (
    <Document title={title} author={cv.fullName || "Dilirik"} creator="Dilirik" producer="Dilirik">
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{cv.fullName || title}</Text>
        {cv.headline ? <Text style={styles.headline}>{cv.headline}</Text> : null}

        {cv.skills.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.skills}</Text>
            <View style={styles.skillsRow}>
              {cv.skills.map((skill, i) => (
                <Text key={i} style={styles.skill}>{skill}</Text>
              ))}
            </View>
          </View>
        ) : null}

        {cv.experiences.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.experience}</Text>
            {cv.experiences.map((exp, i) => (
              <View key={i} style={styles.item}>
                <Text style={styles.itemTitle}>
                  {exp.title}
                  {exp.company ? ` — ${exp.company}` : ""}
                </Text>
                {exp.period ? <Text style={styles.itemMeta}>{exp.period}</Text> : null}
                {(exp.highlights ?? []).map((h, j) => (
                  <View key={j} style={styles.bulletRow}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>{h}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {(cv.achievements ?? []).length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.achievements}</Text>
            {(cv.achievements ?? []).map((a, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{a}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {cv.education.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.education}</Text>
            {cv.education.map((edu, i) => (
              <View key={i} style={styles.item}>
                <Text style={styles.itemTitle}>{edu.institution}</Text>
                <Text style={styles.itemMeta}>
                  {[edu.degree, edu.period].filter(Boolean).join(" · ") || "—"}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.footer} fixed>{t.footer}</Text>
      </Page>
    </Document>
  )
}
