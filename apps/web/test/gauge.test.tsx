import React from "react"
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { ScoreGauge } from "@/components/ui/gauge"

describe("ScoreGauge", () => {
  it("menampilkan angka skor dan atribut aksesibilitas", () => {
    const { getByRole, getByText } = render(<ScoreGauge score={78} />)
    expect(getByText("78")).toBeTruthy()
    expect(getByRole("meter").getAttribute("aria-valuenow")).toBe("78")
  })
  it("skor rendah tetap ter-render", () => {
    const { getByText } = render(<ScoreGauge score={12} />)
    expect(getByText("12")).toBeTruthy()
  })
})
