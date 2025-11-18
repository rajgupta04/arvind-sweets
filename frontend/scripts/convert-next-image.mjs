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
    } else if (entry.isFile() && entry.name.endsWith(".jsx")) {
      targets.push(fullPath)
    }
  }
}

walk(root)
let count = 0
for (const file of targets) {
  let content = fs.readFileSync(file, "utf8")
  if (!content.includes("next/image")) continue
  content = content.replace(/import\s+Image\s+from\s+['"]next\/image['"];?\s*/g, "")
  const replaced = content
    .replace(/<Image/g, '<img')
    .replace(/\s+fill(?=\s|>)/g, '')
    .replace(/\s+priority(?=\s|>)/g, '')
    .replace(/\s+unoptimized(?=\s|>)/g, '')
  if (replaced !== content) {
    fs.writeFileSync(file, replaced)
    count++
  }
}

console.log(`Converted next/image usage in ${count} files`)
