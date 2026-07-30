import { describe, expect, it } from "vitest";
import { parseOrigins } from "../src/lib/origins";

describe("parseOrigins", () => {
  it("harus men-split string yang dipisahkan koma dan membuang spasi", () => {
    const result = parseOrigins("https://dilirik.tech, https://www.dilirik.tech");
    expect(result).toContain("https://dilirik.tech");
    expect(result).toContain("https://www.dilirik.tech");
  });

  it("harus otomatis menambahkan varian www jika diberikan domain apex", () => {
    const result = parseOrigins("https://dilirik.tech");
    expect(result).toContain("https://dilirik.tech");
    expect(result).toContain("https://www.dilirik.tech");
  });

  it("harus otomatis menambahkan varian apex jika diberikan domain www", () => {
    const result = parseOrigins("https://www.dilirik.tech");
    expect(result).toContain("https://dilirik.tech");
    expect(result).toContain("https://www.dilirik.tech");
  });

  it("tidak boleh mengubah localhost atau 127.0.0.1", () => {
    const result = parseOrigins("http://localhost:3000");
    expect(result).toEqual(["http://localhost:3000"]);
  });
});
