// Demonstration of stack-based symmetrical zoom

const TOTAL_MONTHS = 360 // 30 years
const MIN_MONTHS = 12

console.log('=== ZOOM IN DEMONSTRATION (with stack recording) ===')
console.log(`Starting range: ${TOTAL_MONTHS} months (${(TOTAL_MONTHS / 12).toFixed(1)} years)`)
console.log('Each zoom divides by 1.5 and pushes current range to stack\n')

let currentRange = TOTAL_MONTHS
let zoomStep = 0
const stack = []

const zoomInSequence = []

while (currentRange > MIN_MONTHS) {
  zoomStep++
  const newRange = Math.max(MIN_MONTHS, Math.floor(currentRange / 1.5))
  const years = (newRange / 12).toFixed(1)
  const showsMonths = newRange < 24 ? '✓ SHOWS MONTHS' : '  shows years'

  stack.push(currentRange) // Record current range
  zoomInSequence.push({ from: currentRange, to: newRange })

  console.log(`Zoom ${zoomStep}: ${currentRange} → ${newRange} months (${years} years) ${showsMonths} [Stack: ${currentRange}]`)

  if (newRange === currentRange) break // Hit minimum
  currentRange = newRange
}

console.log(`\nStack now contains: [${stack.join(', ')}]`)
console.log(`Final range: ${currentRange} months`)

console.log('\n=== ZOOM OUT DEMONSTRATION (popping from stack) ===')
console.log(`Starting range: ${currentRange} months (${(currentRange / 12).toFixed(1)} year)`)
console.log('Each zoom pops previous range from stack\n')

zoomStep = 0
const zoomOutSequence = []

while (stack.length > 0) {
  zoomStep++
  const previousRange = stack.pop()
  zoomOutSequence.push({ from: currentRange, to: previousRange })

  const years = (previousRange / 12).toFixed(1)
  const showsMonths = previousRange < 24 ? '✓ SHOWS MONTHS' : '  shows years'

  console.log(`Zoom ${zoomStep}: ${currentRange} → ${previousRange} months (${years} years) ${showsMonths} [Popped: ${previousRange}]`)

  currentRange = previousRange
}

console.log(`\nFinal range: ${currentRange} months (back to start!)`)

// Verify symmetry
console.log('\n=== SYMMETRY VERIFICATION ===')
console.log('Zoom In Values:', zoomInSequence.map(z => `${z.from}→${z.to}`).join(', '))
console.log('Zoom Out Values:', zoomOutSequence.map(z => `${z.from}→${z.to}`).join(', '))

const isSymmetric = zoomInSequence.every((inZoom, i) => {
  const outIndex = zoomOutSequence.length - 1 - i
  const outZoom = zoomOutSequence[outIndex]
  return inZoom.from === outZoom.to && inZoom.to === outZoom.from
})

console.log(`\n✓ Zoom is ${isSymmetric ? 'PERFECTLY SYMMETRICAL' : 'NOT symmetrical'}!`)
console.log('Zoom out values are exact reverse of zoom in values.')
