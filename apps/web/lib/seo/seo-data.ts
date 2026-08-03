export type JobRoleSeoData = {
  slug: string
  title: string
  category: string
  metaTitle: string
  metaDescription: string
  keywords: string[]
  atsKeywords: string[]
  cvTips: string[]
  coverLetterTemplate: {
    greeting: string
    opening: string
    body: string
    closing: string
  }
}

export const JOB_ROLES_SEO_DATA: Record<string, JobRoleSeoData> = {
  "frontend-developer": {
    slug: "frontend-developer",
    title: "Frontend Developer",
    category: "Teknologi & Software",
    metaTitle: "Contoh Surat Lamaran Kerja & Tips CV ATS Frontend Developer | Dilirik",
    metaDescription:
      "Contoh surat lamaran kerja Frontend Developer profesional beserta daftar kata kunci CV ATS penting seperti React, TypeScript, Tailwind CSS, dan Next.js.",
    keywords: [
      "Contoh Surat Lamaran Frontend Developer",
      "CV ATS Frontend Developer",
      "Kata Kunci CV Frontend Engineer",
      "Surat Lamaran Web Developer Indonesia",
    ],
    atsKeywords: ["React.js", "TypeScript", "Next.js", "Tailwind CSS", "REST API", "State Management", "Git", "Performance Optimization"],
    cvTips: [
      "Tampilkan proyek nyata beserta tautan repositori GitHub atau live demo.",
      "Sebutkan framework dan library modern yang relevan dengan spesifikasi lowongan.",
      "Sertakan pencapaian terukur seperti peningkatan kecepatan loading halaman atau performa web.",
    ],
    coverLetterTemplate: {
      greeting: "Yth. Manajer Rekrutmen / Tim HRD,",
      opening: "Saya menulis surat ini untuk menyatakan ketertarikan saya pada posisi Frontend Developer di perusahaan Anda.",
      body: "Dengan pengalaman dalam membangun antarmuka web yang responsif dan performan menggunakan React.js dan TypeScript, saya terbiasa mengoptimalkan pengalaman pengguna dan berkolaborasi erat dengan tim desain maupun backend.",
      closing: "Besar harapan saya untuk berdiskusi lebih lanjut mengenai kontribusi yang dapat saya berikan. Terima kasih atas waktu dan pertimbangan Anda.",
    },
  },
  "backend-developer": {
    slug: "backend-developer",
    title: "Backend Developer",
    category: "Teknologi & Software",
    metaTitle: "Contoh Surat Lamaran Kerja & Tips CV ATS Backend Developer | Dilirik",
    metaDescription:
      "Contoh surat lamaran kerja Backend Developer dan daftar kata kunci CV ATS esensial seperti Node.js, PostgreSQL, REST API, Redis, dan microservices.",
    keywords: [
      "Contoh Surat Lamaran Backend Developer",
      "CV ATS Backend Engineer",
      "Kata Kunci CV Software Engineer Backend",
      "Surat Lamaran Programmer Backend",
    ],
    atsKeywords: ["Node.js", "Express.js", "TypeScript", "PostgreSQL", "Prisma/ORM", "Redis", "Docker", "RESTful API / gRPC"],
    cvTips: [
      "Fokus pada efisiensi sistem, manajemen database, dan arsitektur backend yang pernah Anda bangun.",
      "Tuliskan metrik performa seperti skala request per second (RPS) atau optimasi query database.",
      "Sebutkan alat testing dan integrasi CI/CD yang pernah Anda gunakan.",
    ],
    coverLetterTemplate: {
      greeting: "Yth. Manajer Rekrutmen,",
      opening: "Melalui surat ini, saya bermaksud untuk melamar posisi Backend Developer di perusahaan Anda.",
      body: "Saya memiliki latar belakang yang kuat dalam merancang API yang aman dan scalable menggunakan Node.js dan TypeScript, serta berpengalaman mengelola database relational (PostgreSQL) dan caching menggunakan Redis.",
      closing: "Saya sangat antusias untuk berdiskusi lebih lanjut mengenai pengalaman teknis saya. Terima kasih.",
    },
  },
  "data-analyst": {
    slug: "data-analyst",
    title: "Data Analyst",
    category: "Data & Analisis",
    metaTitle: "Contoh Surat Lamaran Kerja & Tips CV ATS Data Analyst | Dilirik",
    metaDescription:
      "Panduan lengkap contoh surat lamaran Data Analyst dan rekomendasi kata kunci CV ATS seperti SQL, Python, Tableau, PowerBI, dan analisis statistik.",
    keywords: [
      "Contoh Surat Lamaran Data Analyst",
      "CV ATS Data Analyst Indonesia",
      "Kata Kunci CV Analis Data",
      "Surat Lamaran Kerja Data Science",
    ],
    atsKeywords: ["SQL", "Python / R", "Tableau", "Power BI", "Data Visualization", "Statistical Analysis", "ETL", "Excel Advanced"],
    cvTips: [
      "Sertakan studi kasus nyata di mana hasil analisis Anda mendorong keputusan bisnis yang berdampak.",
      "Sebutkan kombinasi keahlian teknis (SQL/Python) dan alat visualisasi data (Tableau/Power BI).",
      "Gunakan angka konkret untuk menggambarkan dampak analisis Anda pada pertumbuhan revenue atau efisiensi biaya.",
    ],
    coverLetterTemplate: {
      greeting: "Yth. Tim Rekrutmen Data Analyst,",
      opening: "Saya tertarik untuk mengajukan diri sebagai Data Analyst di perusahaan yang Bapak/Ibu pimpin.",
      body: "Pengalaman saya dalam mengolah data kompleks menggunakan SQL dan Python, serta menyajikannya dalam dashboard interaktif Power BI, membantu manajemen mengambil keputusan strategis berbasis data.",
      closing: "Terima kasih atas perhatian Anda. Saya berharap dapat diberi kesempatan wawancara.",
    },
  },
  "digital-marketer": {
    slug: "digital-marketer",
    title: "Digital Marketer",
    category: "Pemasaran & Media",
    metaTitle: "Contoh Surat Lamaran Kerja & Tips CV ATS Digital Marketer | Dilirik",
    metaDescription:
      "Contoh surat lamaran kerja Digital Marketing Specialist beserta rekomendasi kata kunci CV ATS seperti Meta Ads, Google Ads, SEO, dan Google Analytics.",
    keywords: [
      "Contoh Surat Lamaran Digital Marketing",
      "CV ATS Digital Marketer",
      "Kata Kunci CV Pemasaran Digital",
      "Surat Lamaran Specialist SEO PPC",
    ],
    atsKeywords: ["Meta Ads", "Google Ads", "SEO", "Google Analytics 4", "Copywriting", "Content Strategy", "Email Marketing", "ROAS / CAC"],
    cvTips: [
      "Cantumkan pencapaian metrik utama pemasaran seperti Return on Ad Spend (ROAS), CTR, dan pertumbuhan organik.",
      "Sebutkan platform iklan dan alat analitik yang sudah Anda kuasai secara mendalam.",
      "Tunjukkan pemahaman Anda dalam mengelola anggaran kampanye pemasaran.",
    ],
    coverLetterTemplate: {
      greeting: "Yth. Head of Marketing / Tim HRD,",
      opening: "Saya bermaksud melamar posisi Digital Marketing Specialist di perusahaan Anda.",
      body: "Berbekal pengalaman mengelola kampanye iklan berbayar (Meta & Google Ads) dan strategi konten organik SEO, saya berhasil meningkatkan perolehan leads berkualifikasi serta mengoptimalkan biaya akuisisi pelanggan.",
      closing: "Saya menyambut baik kesempatan untuk mendiskusikan strategi pertumbuhan bisnis bersama tim Anda.",
    },
  },
  "product-manager": {
    slug: "product-manager",
    title: "Product Manager",
    category: "Manajemen Produk",
    metaTitle: "Contoh Surat Lamaran Kerja & Tips CV ATS Product Manager | Dilirik",
    metaDescription:
      "Contoh surat lamaran Product Manager profesional & panduan kata kunci CV ATS seperti Agile, Scrum, Product Roadmap, User Research, dan OKRs.",
    keywords: [
      "Contoh Surat Lamaran Product Manager",
      "CV ATS Product Manager",
      "Kata Kunci CV PM Indonesia",
      "Surat Lamaran Manajer Produk",
    ],
    atsKeywords: ["Product Roadmap", "Agile / Scrum", "User Research", "Wireframing", "PRD (Product Requirements)", "A/B Testing", "OKRs", "Data-Driven"],
    cvTips: [
      "Jelaskan siklus pengembangan produk dari ideasi, riset pengguna, hingga peluncuran ke pasar.",
      "Highlight kolaborasi lintas fungsi dengan tim engineering, desain UI/UX, dan bisnis.",
      "Sebutkan metrik kesuksesan produk (retensi pengguna, adopsi fitur, CSAT).",
    ],
    coverLetterTemplate: {
      greeting: "Yth. Tim Rekrutmen Product Management,",
      opening: "Saya sangat tertarik melamar posisi Product Manager di perusahaan Anda.",
      body: "Dengan pengalaman memimpin tim lintas fungsi menggunakan metodologi Agile, saya terbiasa merumuskan peta jalan produk (roadmap), menyusun PRD mendalam, serta meluncurkan fitur yang menjawab kebutuhan pengguna.",
      closing: "Terima kasih atas waktu Anda. Saya berharap dapat berdiskusi mengenai visi produk perusahaan.",
    },
  },
  "human-resources": {
    slug: "human-resources",
    title: "Human Resources (HR Generalist / Recruiter)",
    category: "Sumber Daya Manusia",
    metaTitle: "Contoh Surat Lamaran Kerja & Tips CV ATS HRD / Recruiter | Dilirik",
    metaDescription:
      "Contoh surat lamaran kerja HR Specialist & daftar kata kunci CV ATS penting seperti End-to-End Recruitment, Employee Relations, Payroll, dan HRIS.",
    keywords: [
      "Contoh Surat Lamaran HRD",
      "CV ATS Human Resources",
      "Surat Lamaran Kerja HR Generalist",
      "Kata Kunci CV Rekruter",
    ],
    atsKeywords: ["Full-Cycle Recruitment", "HRIS", "Employee Engagement", "Performance Appraisal", "Labor Law (UU Ketenagakerjaan)", "Onboarding", "Payroll"],
    cvTips: [
      "Tunjukkan volume dan efisiensi rekrutmen (misal: waktu pemenuhan posisi / Time to Hire).",
      "Sebutkan software HRIS atau Applicant Tracking System (ATS) yang pernah Anda operasikan.",
      "Sertakan pengalaman dalam mengelola hubungan karyawan dan regulasi hukum ketenagakerjaan.",
    ],
    coverLetterTemplate: {
      greeting: "Yth. Manajer HRD / Tim Rekrutmen,",
      opening: "Saya mengajukan diri untuk mengisi posisi HR Generalist di perusahaan yang Bapak/Ibu pimpin.",
      body: "Saya berpengalaman mengelola proses rekrutmen end-to-end, manajemen kinerja karyawan, serta administrasi HRIS. Saya berkomitmen menciptakan budaya kerja yang produktif dan inklusif.",
      closing: "Saya sangat antusias untuk berdiskusi lebih lanjut mengenai pengalaman saya. Terima kasih.",
    },
  },
  "accounting-finance": {
    slug: "accounting-finance",
    title: "Accounting & Finance",
    category: "Keuangan & Akuntansi",
    metaTitle: "Contoh Surat Lamaran Kerja & Tips CV ATS Accounting Finance | Dilirik",
    metaDescription:
      "Contoh surat lamaran kerja Staf Akuntansi & Keuangan beserta kata kunci CV ATS penting seperti Financial Reporting, Tax (PPh/PPN), Accurate, dan SAP.",
    keywords: [
      "Contoh Surat Lamaran Staf Akuntansi",
      "CV ATS Accounting Finance",
      "Surat Lamaran Finance Specialist",
      "Kata Kunci CV Akuntan",
    ],
    atsKeywords: ["Financial Statements", "General Ledger", "Taxation (PPh 21/23/4(2)/PPN)", "Auditing", "Accurate Software", "SAP", "Bank Reconciliation", "Excel Advanced"],
    cvTips: [
      "Sebutkan sertifikasi akuntansi atau perpajakan (misal: Brevet A/B) jika ada.",
      "Tuliskan software akuntansi utama yang Anda kuasai (Accurate, SAP, Jurnal.id).",
      "Tekankan ketelitian dan rekam jejak dalam audit atau penyusunan laporan keuangan tepat waktu.",
    ],
    coverLetterTemplate: {
      greeting: "Yth. Finance & Accounting Manager,",
      opening: "Dengan surat ini, saya menyampaikan minat melamar posisi Staf Akuntansi & Keuangan.",
      body: "Saya berpengalaman dalam rekonsiliasi bank, penyusunan laporan keuangan bulanan, serta pelaporan perpajakan sesuai regulasi Indonesia menggunakan software Accurate dan Excel.",
      closing: "Besar harapan saya untuk diberikan kesempatan wawancara. Terima kasih atas perhatian Anda.",
    },
  },
  "sales-marketing": {
    slug: "sales-marketing",
    title: "Sales & Account Executive",
    category: "Penjualan & Bisnis",
    metaTitle: "Contoh Surat Lamaran Kerja & Tips CV ATS Sales & Account Executive | Dilirik",
    metaDescription:
      "Contoh surat lamaran kerja Sales & Account Executive profesional dengan kata kunci CV ATS seperti B2B Sales, CRM, Lead Generation, dan Negotiation.",
    keywords: [
      "Contoh Surat Lamaran Sales Executive",
      "CV ATS Account Executive",
      "Surat Lamaran Kerja Penjualan B2B",
      "Kata Kunci CV Sales Manager",
    ],
    atsKeywords: ["B2B / B2C Sales", "Lead Generation", "CRM (HubSpot/Salesforce)", "Account Management", "Negotiation", "Pipeline Management", "Quota Attainment"],
    cvTips: [
      "Wajib mencantumkan pencapaian target penjualan dalam persentase atau nominal angka.",
      "Tunjukkan kemampuan mengelola hubungan dengan klien dan pipeline penjualan di CRM.",
      "Sebutkan segmen industri klien yang pernah Anda tangani.",
    ],
    coverLetterTemplate: {
      greeting: "Yth. Sales Director / Tim HRD,",
      opening: "Saya tertarik untuk mengisi posisi Account Executive di perusahaan Anda.",
      body: "Saya berpengalaman dalam strategi penjualan B2B, membangun hubungan jangka panjang dengan pemangku kepentingan kunci, serta konsisten melampaui kuota pencapaian omzet tahunan.",
      closing: "Saya siap untuk berdiskusi tentang bagaimana saya bisa mendorong pertumbuhan pendapatan perusahaan.",
    },
  },
  "admin-perkantoran": {
    slug: "admin-perkantoran",
    title: "Admin Perkantoran",
    category: "Administrasi",
    metaTitle: "Contoh Surat Lamaran Kerja & Tips CV ATS Staf Administrasi | Dilirik",
    metaDescription:
      "Contoh surat lamaran kerja Staf Admin Perkantoran dan kata kunci CV ATS esensial seperti Microsoft Office, Data Entry, Surat Menyurat, dan Pengarsipan.",
    keywords: [
      "Contoh Surat Lamaran Staf Admin",
      "CV ATS Admin Perkantoran",
      "Surat Lamaran Kerja Administrasi",
      "Kata Kunci CV Admin Office",
    ],
    atsKeywords: ["Microsoft Office (Word/Excel/PowerPoint)", "Data Entry", "Document Filing", "Correspondence", "Schedule Management", "Customer Service", "Inventory Admin"],
    cvTips: [
      "Tekankan kecepatan dan ketelitian input data (data entry accuracy).",
      "Sebutkan keahlian dalam mengoperasikan alat perkantoran dan aplikasi Google Workspace/Microsoft Office.",
      "Tunjukkan kemampuan manajemen waktu dan komunikasi interpersonal yang baik.",
    ],
    coverLetterTemplate: {
      greeting: "Yth. Manajer Operasional / HRD,",
      opening: "Melalui surat ini, saya bermaksud melamar pekerjaan sebagai Staf Administrasi Perkantoran.",
      body: "Saya terbiasa mengelola pengarsipan dokumen, penyusunan laporan operasional harian menggunakan Microsoft Excel, serta koordinasi jadwal rapat kerja secara rapi dan terorganisir.",
      closing: "Terima kasih atas pertimbangan Bapak/Ibu. Saya siap hadir untuk wawancara kerja.",
    },
  },
}
