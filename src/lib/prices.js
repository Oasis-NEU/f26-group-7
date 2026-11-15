// "$8", or "$7.50" when there are cents.
function dollars(amount) {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`
}

// What an event costs, in words: "Free", "$8", "$15–$25", "$0–$20" (pay
// what you can), or "Price not listed" when we don't know.
export function priceText(price, isFree) {
  if (isFree) return 'Free'
  if (!price) return 'Price not listed'
  if (price.min === price.max) return dollars(price.max)
  return `${dollars(price.min)}–${dollars(price.max)}`
}
