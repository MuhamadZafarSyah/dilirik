import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx"

export async function generateCoverLetterDocx(
  text: string,
  template: string = "professional",
): Promise<Buffer> {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  const font =
    template === "modern"
      ? "Calibri"
      : template === "creative"
        ? "Georgia"
        : "Arial"

  const docParagraphs: Paragraph[] = paragraphs.map((paraText, idx) => {
    const isFirst = idx === 0
    const isLast = idx === paragraphs.length - 1

    const textRuns: TextRun[] = paraText.split("\n").map((line, lineIdx) => {
      const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("• ")
      const cleanLine = isBullet ? line.trim().substring(2) : line

      return new TextRun({
        text: (lineIdx > 0 ? "\n" : "") + cleanLine,
        font,
        size: isFirst && template === "modern" ? 22 : 24, // 11pt or 12pt
        bold: isLast && lineIdx === 0 ? true : false,
        color: template === "creative" && isFirst ? "2C3E50" : "000000",
      })
    })

    return new Paragraph({
      children: textRuns,
      spacing: {
        after: isLast ? 120 : 240, // 12pt after paragraph
        line: 276, // 1.15 line spacing
      },
      alignment: AlignmentType.LEFT,
    })
  })

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: docParagraphs,
      },
    ],
  })

  return (await Packer.toBuffer(doc)) as Buffer
}
