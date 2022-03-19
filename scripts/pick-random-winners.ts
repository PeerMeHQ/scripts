import path, { dirname } from 'path'
import fs from 'fs'
import collect from 'collect.js'
import { fileURLToPath } from 'url'

const InputFile = 'snapshot.json'
const OutputFile = 'snapshot.json'
const WinnerAmount = 10

const __dirname = dirname(fileURLToPath(import.meta.url))

const main = async () => {
  const candidates = await getCandidates()

  const winners = collect(candidates)
    .unique()
    .shuffle()
    .take(WinnerAmount)
    .all()

  await saveSnapshotAddresses(winners)

  console.log(`done! saved ${winners.length} addresses to '${OutputFile}'`)
}

const getCandidates = async () => {
  const inputPath = path.join(__dirname, '..', 'data', InputFile)
  const inputContents = await fs.promises.readFile(inputPath, { encoding: 'utf8' })
  return JSON.parse(inputContents) as string[]
}

const saveSnapshotAddresses = async (addresses: string[]) => {
  const output = path.join(__dirname, '..', 'data', OutputFile)
  const jsoned = JSON.stringify(addresses)
  await fs.promises.writeFile(output, jsoned, { encoding: 'utf8' })
}

const onlyUniqueFilter = (value: any, index: any, self: any) => self.indexOf(value) === index

main()
