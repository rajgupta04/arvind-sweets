import fs from "fs"
import path from "path"

const root = path.join(process.cwd(), "src", "components")
const targets = []

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath)
    } else if (entry.isFile() && /\.(jsx|js)$/i.test(entry.name)) {
      targets.push(fullPath)
    }
  }
}

walk(root)
let count = 0
for (const file of targets) {
  const content = fs.readFileSync(file, "utf8")
  if (!content.includes("'use client'")) continue
  const updated = content.replace(/'use client';?\s*/g, '')
  if (updated !== content) {
    fs.writeFileSync(file, updated)
    count++
  }
}

console.log(`Removed 'use client' from ${count} files`)
