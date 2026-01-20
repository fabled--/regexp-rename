import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const nextVersion = process.argv[2]

if (!nextVersion) {
  console.error('Usage: node scripts/bump-version.mjs <version>')
  process.exit(1)
}

const updateJsonVersion = (filePath, key) => {
  const json = JSON.parse(readFileSync(filePath, 'utf-8'))
  json[key] = nextVersion
  writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf-8')
}

const replaceLine = (filePath, pattern, replacement) => {
  const text = readFileSync(filePath, 'utf-8')
  const next = text.replace(pattern, replacement)
  if (next === text) {
    throw new Error(`Failed to update version in ${filePath}`)
  }
  writeFileSync(filePath, next, 'utf-8')
}

const packageJsonPath = path.join(root, 'package.json')
const cargoTomlPath = path.join(root, 'src-tauri', 'Cargo.toml')
const tauriConfPath = path.join(root, 'src-tauri', 'tauri.conf.json')

updateJsonVersion(packageJsonPath, 'version')

replaceLine(
  cargoTomlPath,
  /^version\s*=\s*"[^"]+"\s*$/m,
  `version = "${nextVersion}"`
)

replaceLine(
  tauriConfPath,
  /"version"\s*:\s*"[^"]+"/,
  `"version": "${nextVersion}"`
)

console.log(`Updated version to ${nextVersion}`)
