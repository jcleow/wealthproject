#!/usr/bin/env node

/**
 * Groups long Tailwind class strings into multiline template literals for readability.
 * - Targets className attributes and string literal arguments to cn/clsx/classNames calls.
 * - Leaves short strings untouched to avoid noisy diffs.
 *
 * Grouping order roughly follows Figma's properties panel: position → layout → spacing/size →
 * borders → background → typography → effects/interaction → other.
 */

const fs = require('fs')
const path = require('path')
let ts
try {
  ts = require('typescript')
} catch (error) {
  ts = require(path.join(process.cwd(), 'frontend', 'node_modules', 'typescript'))
}

const ROOT_DIR = path.join(process.cwd(), 'frontend', 'src')
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])
const MIN_TOKEN_COUNT = 7
const MIN_LENGTH = 60

const CATEGORY_ORDER = [
  'position',
  'layout',
  'size',
  'spacing',
  'border',
  'background',
  'typography',
  'effects',
  'interaction',
  'other',
]

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(fullPath)
    return EXTENSIONS.has(path.extname(fullPath)) ? [fullPath] : []
  })
}

function sanitizeTemplateText(text) {
  return text.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

function baseClassName(token) {
  const parts = token.split(':')
  return parts[parts.length - 1]
}

function getCategory(token) {
  const base = baseClassName(token)

  if (/^(absolute|relative|fixed|sticky|top-|right-|bottom-|left-|inset|z-)/.test(base)) {
    return 'position'
  }

  if (
    /^(grid|flex|inline-flex|inline-grid|inline-block|block|contents|table|hidden|overflow-|overscroll-)/.test(base) ||
    /^(items-|justify-|content-|self-|place-|object-|col-|row-|order-|aspect-)/.test(base)
  ) {
    return 'layout'
  }

  if (/^(w|h|min-w|min-h|max-w|max-h|size)-/.test(base)) {
    return 'size'
  }

  if (/^(m|mt|mr|mb|ml|mx|my|p|pt|pr|pb|pl|px|py|gap-|space-)/.test(base)) {
    return 'spacing'
  }

  if (/^(border|rounded|divide-|ring-|outline-|stroke)/.test(base)) {
    return 'border'
  }

  if (/^(bg-|from-|via-|to-|gradient|fill-)/.test(base)) {
    return 'background'
  }

  if (
    /^(text-|font-|leading-|tracking-|whitespace-|break-|list-|truncate|italic|not-italic|underline|decoration|placeholder|subpixel-antialiased|antialiased)/.test(
      base
    )
  ) {
    return 'typography'
  }

  if (
    /^(shadow|drop-shadow|opacity-|blur|backdrop-|brightness|contrast|grayscale|hue-rotate|invert|saturate|sepia)/.test(
      base
    )
  ) {
    return 'effects'
  }

  if (
    /^(transition|duration|ease-|motion-|transform|scale-|rotate-|translate-|skew-|origin-|animate-|will-change|cursor-|select-|pointer-events|touch-|scroll-|snap-|isolation)/.test(
      base
    )
  ) {
    return 'interaction'
  }

  return 'other'
}

function groupClasses(raw) {
  const tokens = raw.split(/\s+/).map((token) => token.trim()).filter(Boolean)
  if (tokens.length < MIN_TOKEN_COUNT && raw.length < MIN_LENGTH) return null

  const buckets = new Map(CATEGORY_ORDER.map((category) => [category, []]))

  tokens.forEach((token) => {
    const category = getCategory(token)
    buckets.get(category).push(token)
  })

  const lines = CATEGORY_ORDER.flatMap((category) => {
    const values = buckets.get(category)
    return values.length ? [values.join(' ')] : []
  })

  return lines.join('\n')
}

function addReplacement(replacements, start, end, text) {
  replacements.push({ start, end, text })
}

function processFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8')
  const scriptKind = filePath.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : filePath.endsWith('.jsx')
    ? ts.ScriptKind.JSX
    : ts.ScriptKind.TS
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind)
  const replacements = []

  const visit = (node) => {
    if (ts.isJsxAttribute(node) && node.name?.text === 'className' && node.initializer) {
      if (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer)) {
        const grouped = groupClasses(node.initializer.text)
        if (grouped) {
          const template = '{`' + sanitizeTemplateText(grouped) + '`}'
          addReplacement(replacements, node.initializer.getStart(sourceFile), node.initializer.getEnd(), template)
        }
      } else if (
        ts.isJsxExpression(node.initializer) &&
        node.initializer.expression &&
        (ts.isStringLiteral(node.initializer.expression) ||
          ts.isNoSubstitutionTemplateLiteral(node.initializer.expression))
      ) {
        const grouped = groupClasses(node.initializer.expression.text)
        if (grouped) {
          const template = '{`' + sanitizeTemplateText(grouped) + '`}'
          addReplacement(replacements, node.initializer.getStart(sourceFile), node.initializer.getEnd(), template)
        }
      }
    }

    if (ts.isCallExpression(node)) {
      const callee = node.expression
      const calleeName = ts.isIdentifier(callee)
        ? callee.text
        : ts.isPropertyAccessExpression(callee)
        ? callee.name?.text
        : ''

      if (calleeName === 'cn' || calleeName === 'clsx' || calleeName === 'classNames') {
        node.arguments.forEach((arg) => {
          if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
            const grouped = groupClasses(arg.text)
            if (grouped) {
              const template = '`' + sanitizeTemplateText(grouped) + '`'
              addReplacement(replacements, arg.getStart(sourceFile), arg.getEnd(), template)
            }
          }
        })
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  if (!replacements.length) return false

  replacements.sort((a, b) => b.start - a.start)
  let updated = source
  for (const replacement of replacements) {
    updated = `${updated.slice(0, replacement.start)}${replacement.text}${updated.slice(replacement.end)}`
  }

  if (updated !== source) {
    fs.writeFileSync(filePath, updated)
    return true
  }

  return false
}

function main() {
  const files = walk(ROOT_DIR)
  let changed = 0

  files.forEach((filePath) => {
    if (processFile(filePath)) {
      changed += 1
    }
  })

  console.log(`Processed ${files.length} files; grouped classes in ${changed} file(s).`)
}

main()
