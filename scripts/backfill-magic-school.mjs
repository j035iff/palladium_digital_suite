import fs from 'node:fs'
import path from 'node:path'

function schoolFromId(id) {
  if (!id.startsWith('magic_')) return 'wizard'
  const rest = id.slice('magic_'.length)
  const i = rest.indexOf('_')
  return i > 0 ? rest.slice(0, i) : 'wizard'
}

function insertSchoolAfterSources(obj, school) {
  const out = {}
  for (const [key, value] of Object.entries(obj)) {
    out[key] = value
    if (key === 'sources') out.school = school
  }
  if (!out.school) out.school = school
  return out
}

const wizardPath = 'src/data/content/magic/wizard.json'
const wizard = JSON.parse(fs.readFileSync(wizardPath, 'utf8'))
for (const row of wizard) {
  if (!row.school) row.school = schoolFromId(row.id)
}
fs.writeFileSync(wizardPath, `${JSON.stringify(wizard, null, 2)}\n`)
console.log(`wizard.json: ${wizard.length} spells`)

const examplesDir = 'src/data/schemas/examples'
for (const file of fs.readdirSync(examplesDir)) {
  if (!file.startsWith('palladium-magic.example-') || !file.endsWith('.json')) continue
  const fp = path.join(examplesDir, file)
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'))
  if (data.school) continue
  const school = schoolFromId(data.id ?? 'magic_wizard_example')
  const updated = insertSchoolAfterSources(data, school)
  fs.writeFileSync(fp, `${JSON.stringify(updated, null, 2)}\n`)
  console.log(`updated ${file}`)
}
