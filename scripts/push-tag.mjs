import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const pkgPath = path.join(root, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))

const version = pkg.version
if (!version || typeof version !== 'string') {
  throw new Error('package.json の version を読み取れません')
}

const tag = `v${version}`

const run = (cmd) => {
  console.log(`> ${cmd}`)
  execSync(cmd, { stdio: 'inherit' })
}

run('git fetch --tags')

try {
  run(`git tag ${tag}`)
} catch (e) {
  console.log(`tag ${tag} は既に存在するため付け直します`)
  run(`git tag -d ${tag}`)
  run(`git tag ${tag}`)
}

run(`git push origin ${tag}`)
