import fs from 'fs'
import collect from 'collect.js'
import { fileURLToPath } from 'url'
import path, { dirname } from 'path'

const BaseFile = 'base.json'
const SubtractFile = 'subtract.json'
const OutputFile = 'result.json'

const __dirname = dirname(fileURLToPath(import.meta.url))

const main = async () => {
  const baseSnapshot = await loadSnapshot(BaseFile)
  const subtractSnapshot = await loadSnapshot(SubtractFile)

  const result = collect(baseSnapshot)
    .diff(subtractSnapshot)
    .unique()
    .all()

  await saveSnapshotAddresses(result)

  console.log(`done! saved ${result.length} addresses to '${OutputFile}'`)
}

const loadSnapshot = async (snapshotFile: string): Promise<string[]> => {
  const inputPath = path.join(__dirname, '..', 'data', snapshotFile)
  const inputContents = await fs.promises.readFile(inputPath, { encoding: 'utf8' })
  return JSON.parse(inputContents)
}

const saveSnapshotAddresses = async (addresses: string[]) => {
  const output = path.join(__dirname, '..', 'data', OutputFile)
  const jsoned = JSON.stringify(addresses)
  await fs.promises.writeFile(output, jsoned, { encoding: 'utf8' })
}

main()
