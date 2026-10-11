export function formatLiters(liters: number): string {
  if (liters >= 1000000) {
    return `${(liters / 1000000).toFixed(1)}M L`;
  }
  if (liters >= 1000) {
    return `${(liters / 1000).toFixed(0)}k L`;
  }
  return `${liters} L`;
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMinutes = Math.max(
    1,
    Math.round((now.getTime() - date.getTime()) / 60000),
  );

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours}h ${diffMinutes % 60}m ago`;
}

export function generateSha256Mock(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `0x${hex}9a4f21b7c8d3e910fae420b98214f7b2c5d6e1a0${hex}`;
}
