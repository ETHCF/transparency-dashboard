import { describe, expect, it } from "vitest";

import { formatCurrency, formatDate, formatTokenAmount } from "@/utils/format";

describe("format utilities", () => {
  it("formats fiat currency", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("formats token amounts", () => {
    expect(formatTokenAmount(1.2345, "ETH")).toBe("1.2345 ETH");
  });

  it("formats dates", () => {
    const result = formatDate(new Date("2024-01-01"));
    expect(result).toContain("2024");
  });
});
