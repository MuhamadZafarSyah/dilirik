import { describe, expect, it } from "vitest";
import { isDisposableEmail } from "./disposableEmail";

describe("isDisposableEmail", () => {
  it("harus mengembalikan true untuk domain temp email populer", () => {
    expect(isDisposableEmail("user@mailinator.com")).toBe(true);
    expect(isDisposableEmail("test.bot@tempmail.com")).toBe(true);
    expect(isDisposableEmail("spam@10minutemail.com")).toBe(true);
    expect(isDisposableEmail("admin@guerrillamail.com")).toBe(true);
    expect(isDisposableEmail("user@yopmail.com")).toBe(true);
    expect(isDisposableEmail("bot@dispostable.com")).toBe(true);
  });

  it("harus mengembalikan true untuk subdomain dari temp email domain", () => {
    expect(isDisposableEmail("user@sub.mailinator.com")).toBe(true);
    expect(isDisposableEmail("test@xyz.temp-mail.org")).toBe(true);
  });

  it("harus mengembalikan false untuk domain email biasa (legitimate)", () => {
    expect(isDisposableEmail("user@gmail.com")).toBe(false);
    expect(isDisposableEmail("john.doe@yahoo.com")).toBe(false);
    expect(isDisposableEmail("contact@company.co.id")).toBe(false);
    expect(isDisposableEmail("dev@outlook.com")).toBe(false);
    expect(isDisposableEmail("student@university.ac.id")).toBe(false);
  });

  it("harus menangani kasus huruf besar/kecil (case insensitive)", () => {
    expect(isDisposableEmail("USER@MAILINATOR.COM")).toBe(true);
    expect(isDisposableEmail("Test@TempMail.Com")).toBe(true);
  });

  it("harus mengembalikan false untuk input email yang tidak valid atau kosong", () => {
    expect(isDisposableEmail("")).toBe(false);
    expect(isDisposableEmail("invalid-email")).toBe(false);
    // @ts-expect-error testing invalid type
    expect(isDisposableEmail(null)).toBe(false);
  });
});
