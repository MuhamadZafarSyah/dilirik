import React from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { StatusBadge } from "@/components/ui/status-badge"

describe("StatusBadge", () => {
  it("menampilkan label bahasa Indonesia", () => {
    render(<StatusBadge status="DILAMAR" lang="id" />)
    expect(screen.getByText("Dilamar")).toBeInTheDocument()
  })
  it("menampilkan label bahasa Inggris", () => {
    render(<StatusBadge status="OFFER" lang="en" />)
    expect(screen.getByText("Offer")).toBeInTheDocument()
  })
})
