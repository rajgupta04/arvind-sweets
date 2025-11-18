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
  if (!content.includes("next/link")) continue
  const nextImport = /import\s+Link\s+from\s+['"]next\/link['"];?/g
  if (!nextImport.test(content)) continue
  content = content.replace(nextImport, "import { Link } from 'react-router-dom';")
  content = content.replace(/<Link([^>]*?)href=/g, '<Link$1to=')
  content = content.replace(/\s+legacyBehavior/g, '')
  content = content.replace(/\s+passHref/g, '')
  fs.writeFileSync(file, content)
  count++
}

console.log(`Updated ${count} files with react-router Link`)
