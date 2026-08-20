import { expect, test } from "vitest";
import { signUpSchema } from "./auth";

test("chấp nhận thông tin đăng ký hợp lệ", () => {
  expect(
    signUpSchema.safeParse({
      displayName: "An",
      email: "an@example.com",
      password: "12345678",
    }).success,
  ).toBe(true);
});

test("từ chối thông tin đăng ký không hợp lệ", () => {
  expect(
    signUpSchema.safeParse({
      displayName: "",
      email: "sai",
      password: "123",
    }).success,
  ).toBe(false);
});
