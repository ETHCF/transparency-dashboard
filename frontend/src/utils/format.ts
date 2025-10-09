export const formatCurrency = (value: number | string, currency: string = "USD") => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(0);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(numValue);
};

export const formatTokenAmount = (value: number | string, symbol: string) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) {
    return `0 ${symbol}`;
  }
  return `${numValue.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${symbol}`;
};

export const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return 'N/A';

  try {
    const input = typeof date === "string" ? new Date(date) : date;
    if (isNaN(input.getTime())) return 'Invalid Date';

    return input.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

export const formatDateTime = (date: Date | string | null | undefined) => {
  if (!date) return 'N/A';

  try {
    const input = typeof date === "string" ? new Date(date) : date;
    if (isNaN(input.getTime())) return 'Invalid Date';

    return input.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};
