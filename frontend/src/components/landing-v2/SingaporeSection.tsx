'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { SpotlightCard } from './SpotlightCard'

// Sankey-style flow data - nodes positioned as percentages
const flowNodes = [
  // Column 0 - Start
  { id: 'start', label: 'You', x: 2, y: 50, color: '#3B82F6', size: 'lg' },

  // Column 1 - Early decisions
  { id: 'career', label: 'Career', x: 14, y: 22, color: '#3B82F6', size: 'md' },
  { id: 'savings', label: 'Savings', x: 14, y: 50, color: '#10B981', size: 'md' },
  { id: 'insurance', label: 'Insurance', x: 14, y: 78, color: '#F59E0B', size: 'md' },

  // Column 2 - Life events
  { id: 'marriage', label: 'Marriage', x: 30, y: 18, color: '#EC4899', size: 'md' },
  { id: 'property', label: 'Property', x: 30, y: 44, color: '#8B5CF6', size: 'md' },
  { id: 'investments', label: 'Investments', x: 30, y: 72, color: '#10B981', size: 'md' },

  // Column 3 - Growing complexity
  { id: 'children', label: 'Children', x: 48, y: 12, color: '#F97316', size: 'md' },
  { id: 'education', label: 'Education', x: 48, y: 34, color: '#06B6D4', size: 'sm' },
  { id: 'mortgage', label: 'Mortgage', x: 48, y: 56, color: '#8B5CF6', size: 'sm' },
  { id: 'healthcare', label: 'Healthcare', x: 48, y: 78, color: '#EF4444', size: 'sm' },

  // Column 4 - Peak complexity
  { id: 'uni', label: 'University', x: 66, y: 8, color: '#06B6D4', size: 'sm' },
  { id: 'career-peak', label: 'Career Peak', x: 66, y: 28, color: '#6366F1', size: 'md' },
  { id: 'second-prop', label: '2nd Property?', x: 66, y: 50, color: '#8B5CF6', size: 'sm' },
  { id: 'aging-parents', label: 'Aging Parents', x: 66, y: 72, color: '#EF4444', size: 'sm' },
  { id: 'inflation', label: 'Inflation', x: 66, y: 92, color: '#DC2626', size: 'sm' },

  // Column 5 - End
  { id: 'retirement', label: 'Retirement', x: 84, y: 32, color: '#14B8A6', size: 'md' },
  { id: 'legacy', label: 'Legacy', x: 84, y: 62, color: '#F59E0B', size: 'sm' },
  { id: 'question', label: '?', x: 96, y: 50, color: '#8A8F98', size: 'lg', isQuestion: true },
]

// Flow connections
const flowConnections = [
  { from: 'start', to: 'career' },
  { from: 'start', to: 'savings' },
  { from: 'start', to: 'insurance' },
  { from: 'career', to: 'marriage' },
  { from: 'career', to: 'property' },
  { from: 'savings', to: 'property' },
  { from: 'savings', to: 'investments' },
  { from: 'insurance', to: 'investments' },
  { from: 'marriage', to: 'children' },
  { from: 'marriage', to: 'education' },
  { from: 'property', to: 'mortgage' },
  { from: 'property', to: 'education' },
  { from: 'investments', to: 'healthcare' },
  { from: 'investments', to: 'mortgage' },
  { from: 'children', to: 'uni' },
  { from: 'children', to: 'career-peak' },
  { from: 'education', to: 'uni' },
  { from: 'mortgage', to: 'second-prop' },
  { from: 'healthcare', to: 'aging-parents' },
  { from: 'healthcare', to: 'inflation' },
  { from: 'uni', to: 'retirement' },
  { from: 'career-peak', to: 'retirement' },
  { from: 'second-prop', to: 'retirement' },
  { from: 'second-prop', to: 'legacy' },
  { from: 'aging-parents', to: 'legacy' },
  { from: 'inflation', to: 'legacy' },
  { from: 'retirement', to: 'question' },
  { from: 'legacy', to: 'question' },
]

const getNode = (id: string) => flowNodes.find(n => n.id === id)

// Animation variants
const nodeVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: (delay: number) => ({
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 20,
      delay,
    },
  }),
}

// Connection line component using canvas-like SVG path
function ConnectionLine({
  fromId,
  toId,
  index,
  isInView,
  containerRef
}: {
  fromId: string
  toId: string
  index: number
  isInView: boolean
  containerRef: React.RefObject<HTMLDivElement | null>
}) {
  const [path, setPath] = useState('')
  const fromNode = getNode(fromId)
  const toNode = getNode(toId)

  useEffect(() => {
    if (!containerRef.current || !fromNode || !toNode) return

    const container = containerRef.current
    const containerRect = container.getBoundingClientRect()

    // Find actual DOM elements
    const fromEl = container.querySelector(`[data-node-id="${fromId}"]`)
    const toEl = container.querySelector(`[data-node-id="${toId}"]`)

    if (!fromEl || !toEl) return

    const fromRect = fromEl.getBoundingClientRect()
    const toRect = toEl.getBoundingClientRect()

    // Calculate positions relative to container
    const x1 = fromRect.right - containerRect.left
    const y1 = fromRect.top + fromRect.height / 2 - containerRect.top
    const x2 = toRect.left - containerRect.left
    const y2 = toRect.top + toRect.height / 2 - containerRect.top

    // Bezier control points for smooth S-curve
    const midX = (x1 + x2) / 2
    const pathD = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
    setPath(pathD)
  }, [fromId, toId, fromNode, toNode, containerRef])

  if (!path || !fromNode) return null

  return (
    <motion.path
      d={path}
      fill="none"
      stroke={fromNode.color}
      strokeWidth="2"
      strokeOpacity="0.4"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={isInView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
      transition={{
        pathLength: { duration: 0.6, delay: 0.3 + index * 0.02, ease: 'easeOut' },
        opacity: { duration: 0.3, delay: 0.3 + index * 0.02 },
      }}
    />
  )
}

export function SingaporeSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Delay to ensure DOM elements are rendered
    const timer = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section
      id="singapore"
      ref={sectionRef}
      className="relative py-24 md:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      {/* Section divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-mono font-medium tracking-widest text-blue-400 uppercase mb-4">
            The Challenge
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[#EDEDEF] mb-4">
            Life is
            <br />
            <span className="linear-text-accent">overwhelmingly complex</span>
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-[#8A8F98]">
            Every decision branches into dozens more. Aspirations, policies, and life events
            intertwine in ways that make planning feel impossible.
          </p>
        </motion.div>

        {/* Sankey-style Flow Diagram */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-16"
        >
          <SpotlightCard className="p-4 md:p-8 overflow-x-auto">
            <div
              ref={containerRef}
              className="relative min-w-[700px] h-[380px] md:h-[420px]"
            >
              {/* SVG layer for connections */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ overflow: 'visible' }}
              >
                <defs>
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {mounted && flowConnections.map((conn, index) => (
                  <ConnectionLine
                    key={`${conn.from}-${conn.to}`}
                    fromId={conn.from}
                    toId={conn.to}
                    index={index}
                    isInView={isInView}
                    containerRef={containerRef}
                  />
                ))}
              </svg>

              {/* Nodes */}
              {flowNodes.map((node) => {
                const sizeClasses = {
                  sm: 'px-2.5 py-1 text-[10px]',
                  md: 'px-3 py-1.5 text-xs',
                  lg: 'px-4 py-2 text-sm',
                }

                const isQuestion = node.isQuestion

                return (
                  <motion.div
                    key={node.id}
                    data-node-id={node.id}
                    className="absolute -translate-y-1/2"
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    variants={nodeVariants}
                    initial="hidden"
                    animate={isInView ? 'visible' : 'hidden'}
                    custom={0.4 + (node.x / 100) * 1.2}
                    whileHover={{ scale: 1.12, zIndex: 10 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  >
                    {isQuestion ? (
                      <motion.div
                        className="w-11 h-11 rounded-full bg-white/[0.03] border border-white/[0.15] flex items-center justify-center"
                        animate={{
                          boxShadow: [
                            '0 0 0 0 rgba(59, 130, 246, 0)',
                            '0 0 0 8px rgba(59, 130, 246, 0.1)',
                            '0 0 0 0 rgba(59, 130, 246, 0)',
                          ],
                        }}
                        transition={{ duration: 2.5, repeat: Infinity, delay: 2.5 }}
                      >
                        <span className="text-lg text-[#8A8F98]">?</span>
                      </motion.div>
                    ) : (
                      <div
                        className={`rounded-full font-medium whitespace-nowrap cursor-default ${sizeClasses[node.size as keyof typeof sizeClasses]}`}
                        style={{
                          backgroundColor: `color-mix(in srgb, ${node.color} 25%, #0a0a0c)`,
                          color: node.color,
                        }}
                      >
                        {node.label}
                      </div>
                    )}
                  </motion.div>
                )
              })}

              {/* Animated flowing particles along some paths */}
              {isInView && mounted && flowConnections.slice(0, 8).map((conn, index) => {
                const fromNode = getNode(conn.from)
                const toNode = getNode(conn.to)
                if (!fromNode || !toNode) return null

                return (
                  <motion.div
                    key={`particle-${index}`}
                    className="absolute w-1.5 h-1.5 rounded-full pointer-events-none -translate-y-1/2"
                    style={{
                      backgroundColor: fromNode.color,
                      boxShadow: `0 0 8px ${fromNode.color}`,
                    }}
                    initial={{
                      left: `${fromNode.x + 4}%`,
                      top: `${fromNode.y}%`,
                      opacity: 0,
                    }}
                    animate={{
                      left: [`${fromNode.x + 4}%`, `${toNode.x}%`],
                      top: [`${fromNode.y}%`, `${toNode.y}%`],
                      opacity: [0, 0.9, 0],
                    }}
                    transition={{
                      duration: 1.8,
                      delay: 2.5 + index * 0.5,
                      repeat: Infinity,
                      repeatDelay: 4,
                      ease: 'easeInOut',
                    }}
                  />
                )
              })}
            </div>

            {/* Bottom text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 2.2, duration: 0.8 }}
              className="text-center mt-6 pt-6 border-t border-white/[0.06]"
            >
              <p className="text-sm text-[#8A8F98]">
                And this is just <span className="text-blue-400 font-medium">one possible path</span>.
                What if you change jobs? Have another child? Markets crash?
              </p>
            </motion.div>
          </SpotlightCard>
        </motion.div>

        {/* Pain points */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Too many variables',
              description: 'Every decision affects dozens of others. Change one thing, and the ripple effects are impossible to track mentally.',
            },
            {
              title: 'Constantly shifting',
              description: 'Policies change. Markets move. Life happens. What worked yesterday might not work tomorrow.',
            },
            {
              title: 'High stakes',
              description: 'The difference between good and bad financial decisions can mean hundreds of thousands over a lifetime.',
            },
          ].map((point, index) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 1.5 + index * 0.1 }}
            >
              <SpotlightCard className="p-6 h-full">
                <h3 className="text-lg font-semibold text-[#EDEDEF] mb-2">
                  {point.title}
                </h3>
                <p className="text-sm text-[#8A8F98] leading-relaxed">
                  {point.description}
                </p>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>

        {/* Transition text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 2 }}
          className="text-center mt-12 text-lg text-[#8A8F98]"
        >
          You need a way to see how it all{' '}
          <span className="text-blue-400">connects</span>.
        </motion.p>
      </div>
    </section>
  )
}
