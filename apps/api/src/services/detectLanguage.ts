/**
 * Deteksi bahasa CV (PRD §7.2) — heuristik stopword ringan (tanpa biaya LLM).
 * Mendukung id/en secara kuat; bahasa lain jatuh ke "en" sebagai default aman
 * (output analisis tetap mengikuti bahasa terdeteksi).
 */
const ID_MARKERS = [
  " dan ", " yang ", " di ", " dengan ", " untuk ", " pada ", " dari ", " sebagai ",
  " pengalaman ", " pendidikan ", " universitas ", " bertanggung jawab ", " mengembangkan ",
  " membuat ", " tahun ", " kerja ", " saya ",
]
const EN_MARKERS = [
  " and ", " the ", " with ", " for ", " of ", " in ", " as ", " to ",
  " experience ", " education ", " university ", " responsible ", " developed ",
  " built ", " years ", " work ", " led ",
]

export function detectLanguage(rawText: string): string {
  const text = ` ${rawText.toLowerCase().replace(/\s+/g, " ")} `
  const count = (markers: string[]) =>
    markers.reduce((total, m) => total + (text.split(m).length - 1), 0)
  const idScore = count(ID_MARKERS)
  const enScore = count(EN_MARKERS)
  if (idScore === 0 && enScore === 0) return "en"
  return idScore >= enScore ? "id" : "en"
}
