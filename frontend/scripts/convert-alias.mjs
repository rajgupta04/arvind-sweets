import fs from "fs"
import path from "path"

const workspaceRoot = process.cwd()
const srcRoot = path.join(workspaceRoot, "src")
const targets = []

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath)
    } else if (/\.(jsx|js|ts)$/i.test(entry.name)) {
      targets.push(fullPath)
    }
  }
}

walk(path.join(srcRoot, "components"))

function toRelative(fromFile, targetSpecifier) {
  const cleaned = targetSpecifier.replace(/\\/g, "/").replace(/^\/+/, "")
  const targetBase = path.join(srcRoot, cleaned)
  let relative = path.relative(path.dirname(fromFile), targetBase)
  if (!relative) relative = "."
  relative = relative.replace(/\\/g, "/")
  if (!relative.startsWith(".")) {
    relative = "./" + relative
  }
  return relative
}

let updates = 0
for (const file of targets) {
  let content = fs.readFileSync(file, "utf8")
  const updated = content.replace(/(["'])@\/([^"']+?)\1/g, (match, quote, spec) => {
    const rel = toRelative(file, spec)
    return `${quote}${rel}${quote}`
  })
  if (updated !== content) {
    fs.writeFileSync(file, updated)
    updates++
  }
}

console.log(`Updated ${updates} files`)
