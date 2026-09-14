export function applicationFeeCents(priceCents, feeBps) {
  const amount = Math.round(Number(priceCents) * Number(feeBps) / 10000)
  return Math.max(1, Math.min(Number(priceCents) - 1, amount))
}

export function feePercent(feeBps) {
  return Number(feeBps) / 100
}
