// Demonstration of zoom in/out ranges

const TOTAL_MONTHS = 360 // 30 years
const MIN_MONTHS = 12

console.log('=== ZOOM IN DEMONSTRATION ===')
console.log(`Starting range: ${TOTAL_MONTHS} months (${(TOTAL_MONTHS / 12).toFixed(1)} years)`)
console.log('Each zoom divides by 1.5\n')

let currentRange = TOTAL_MONTHS
let zoomStep = 0

while (currentRange > MIN_MONTHS) {
  zoomStep++
  const newRange = Math.max(MIN_MONTHS, Math.floor(currentRange / 1.5))
  const years = (newRange / 12).toFixed(1)
  const showsMonths = newRange < 24 ? '✓ SHOWS MONTHS' : '  shows years'

  console.log(`Zoom ${zoomStep}: ${currentRange} → ${newRange} months (${years} years) ${showsMonths}`)

  if (newRange === currentRange) break // Hit minimum
  currentRange = newRange
}

console.log('\n=== ZOOM OUT DEMONSTRATION ===')
console.log(`Starting range: ${MIN_MONTHS} months (${(MIN_MONTHS / 12).toFixed(1)} year)`)
console.log('Each zoom multiplies by 1.5 (inverse of zoom in)\n')

currentRange = MIN_MONTHS
zoomStep = 0

while (currentRange < TOTAL_MONTHS) {
  zoomStep++
  const newRange = Math.min(TOTAL_MONTHS, Math.floor(currentRange * 1.5))
  const years = (newRange / 12).toFixed(1)
  const showsMonths = newRange < 24 ? '✓ SHOWS MONTHS' : '  shows years'

  console.log(`Zoom ${zoomStep}: ${currentRange} → ${newRange} months (${years} years) ${showsMonths}`)

  if (newRange === TOTAL_MONTHS) {
    console.log(`Zoom ${zoomStep + 1}: ${newRange} → switches to yearly view (all data)`)
    break
  }
  currentRange = newRange
}

console.log('\n=== SUMMARY ===')
console.log('- Shows MONTHS when visible range < 24 months (2 years)')
console.log('- Shows YEARS when visible range ≥ 24 months')
console.log('- Minimum zoom: 12 months (1 year)')
console.log('- Maximum zoom: switches back to yearly view (all data)')
