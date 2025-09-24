export const formatCurrency = (value: number, currency: string = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);

export const formatTokenAmount = (value: number, symbol: string) =>
  `${value.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${symbol}`;

export const formatDate = (date: Date | string) => {
  const input = typeof date === "string" ? new Date(date) : date;
  return input.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatDateTime = (date: Date | string) => {
  const input = typeof date === "string" ? new Date(date) : date;
  return input.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
