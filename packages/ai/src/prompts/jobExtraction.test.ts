import { describe, expect, it } from "vitest"
import { JOB_EXTRACTION_SYSTEM_PROMPT, strictJobParsedSchema } from "./jobExtraction"

/** Hasil ekstraksi yang sah; tiap tes hanya menimpa bagian yang diuji. */
const BASE = {
  jobTitle: "Frontend Developer",
  company: "PT Nusantara Data Kreasi",
  level: "Mid",
  mustHaveSkills: ["React", "TypeScript"],
  niceToHaveSkills: [] as string[],
  requirements: ["Menguasai React dan TypeScript"],
  keywords: [] as string[],
}

function check(patch: Partial<typeof BASE> = {}) {
  return strictJobParsedSchema.safeParse({ ...BASE, ...patch })
}

function reasons(result: ReturnType<typeof check>): string {
  return result.success ? "" : result.error.issues.map((issue) => issue.message).join("\n")
}

describe("strictJobParsedSchema", () => {
  it("menerima hasil ekstraksi yang rapi", () => {
    const result = check()
    expect(result.success).toBe(true)
  })

  it("tidak menganggap istilah ber-garis-miring atau bertitik sebagai gabungan", () => {
    const result = check({
      mustHaveSkills: ["CI/CD", "Node.js", "Vue.js", "Agile/Scrum"],
    })
    expect(result.success).toBe(true)
  })

  it("menolak satu entri yang memuat dua skill", () => {
    const result = check({ mustHaveSkills: ["React", "HTML, CSS"] })
    expect(result.success).toBe(false)
    expect(reasons(result)).toContain("Pecah")
  })

  it("menolak kalimat utuh yang menyamar jadi skill", () => {
    const result = check({
      mustHaveSkills: [
        "Minimal 3 tahun pengalaman sebagai Frontend Developer di perusahaan teknologi",
      ],
    })
    expect(result.success).toBe(false)
    expect(reasons(result)).toContain("requirements")
  })

  it("menolak entri yang cuma berisi spasi", () => {
    const result = check({ mustHaveSkills: ["React", "   "] })
    expect(result.success).toBe(false)
    expect(reasons(result)).toContain("kosong")
  })

  it("menolak skill kembar tanpa peduli kapitalisasi", () => {
    const result = check({ mustHaveSkills: ["React", "react"] })
    expect(result.success).toBe(false)
    expect(reasons(result)).toContain("dua kali")
  })

  it("menolak skill yang wajib sekaligus opsional", () => {
    const result = check({
      mustHaveSkills: ["React"],
      niceToHaveSkills: ["React"],
    })
    expect(result.success).toBe(false)
    expect(reasons(result)).toContain("pilih salah satu")
  })

  it("menolak requirement yang terisi tapi tanpa satu pun skill wajib", () => {
    const result = check({ mustHaveSkills: [] })
    expect(result.success).toBe(false)
    expect(reasons(result)).toContain("Sisir ulang")
  })

  it("membiarkan lowongan yang memang tidak punya bagian kualifikasi", () => {
    const result = check({ mustHaveSkills: [], requirements: [] })
    expect(result.success).toBe(true)
  })

  it("menunjuk entri yang salah lewat path, bukan cuma menolak objeknya", () => {
    // generateStructured merangkai repair hint dari issue.path + issue.message,
    // jadi path yang tepat menentukan model memperbaiki entri yang benar.
    const result = check({ mustHaveSkills: ["React", "HTML, CSS"] })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues[0]?.path).toEqual(["mustHaveSkills", 1])
    expect(result.error.issues[0]?.message).toContain("HTML, CSS")
  })
})

describe("JOB_EXTRACTION_SYSTEM_PROMPT", () => {
  it("masih memuat contoh yang mengunci Bug 2", () => {
    // Contoh inilah satu-satunya tempat model diberi tahu bahwa sebuah konsep
    // ikut diangkat walaupun alat-alatnya sudah disebut. Kalau contoh ini
    // hilang saat prompt dirapikan, bug lama kembali tanpa suara.
    expect(JOB_EXTRACTION_SYSTEM_PROMPT).toContain("Automated Testing")
    expect(JOB_EXTRACTION_SYSTEM_PROMPT).toContain("BARIS PER BARIS")
  })
})
