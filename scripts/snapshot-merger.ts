import path, { dirname } from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const InputDir = 'mergeable'
const OutputFile = 'snapshot.json'

const __dirname = dirname(fileURLToPath(import.meta.url))

const main = async () => {
  const inputDirPath = path.join(__dirname, '..', 'data', InputDir)
  const mergeableFiles = await fs.promises.readdir(inputDirPath, { encoding: 'utf8' })
  let merged: string[] = []

  for (let snapshotFile of mergeableFiles) {
    const snapshot = await loadSnapshot(snapshotFile)
    merged = merged.concat(snapshot)
  }

  const sanitized = merged.filter(onlyUniqueFilter)

  await saveSnapshotAddresses(sanitized)

  console.log(`done! saved ${sanitized.length} addresses to '${OutputFile}'`)
}

const loadSnapshot = async (snapshotFile: string) => {
  const inputPath = path.join(__dirname, '..', 'data', InputDir, snapshotFile)
  const inputContents = await fs.promises.readFile(inputPath, { encoding: 'utf8' })
  return JSON.parse(inputContents)
}

const saveSnapshotAddresses = async (addresses: string[]) => {
  const output = path.join(__dirname, '..', 'data', InputDir, OutputFile)
  const jsoned = JSON.stringify(addresses)
  await fs.promises.writeFile(output, jsoned, { encoding: 'utf8' })
}

const onlyUniqueFilter = (value: any, index: any, self: any) => self.indexOf(value) === index

main()
