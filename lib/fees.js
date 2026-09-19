export function applicationFeeCents(priceCents, feeBps) {
  const bps = Number(feeBps) || 0
  if (bps <= 0) return 0
  const amount = Math.round(Number(priceCents) * bps / 10000)
  return Math.max(1, Math.min(Number(priceCents) - 1, amount))
}

export function feePercent(feeBps) {
  return Number(feeBps) / 100
}
