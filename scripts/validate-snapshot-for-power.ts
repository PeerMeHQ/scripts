import path, { dirname } from 'path'
import fs from 'fs'
import fetch from 'node-fetch'
import { fileURLToPath } from 'url'
import collect from 'collect.js'

const InputFile = 'snapshot.json'
const OutputFile = 'snapshot.json'
const MinPowerRequired = 500
const ScyApiUrl = 'https://api.superciety.com'

const __dirname = dirname(fileURLToPath(import.meta.url))

const main = async () => {
  const candidates = collect(await getCandidates())
    .unique()
    .all()

  console.log(`scanning ${candidates.length} addresses for min. ${MinPowerRequired} POWER ...`)

  let count = 0
  let addressesPassed: string[] = []

  for (let candidateAddress of candidates) {
    count++
    const candidatePower = await getCandidatePower(candidateAddress)

    if (candidatePower >= MinPowerRequired) {
      addressesPassed.push(candidateAddress)
      console.log(`${count}. address '${candidateAddress}' meets requirements: ${candidatePower} Power`)
    } else {
      console.log(`${count}. address '${candidateAddress}' is not qualified: ${candidatePower} Power`)
    }

    await new Promise(r => setTimeout(r, 1000))
  }

  await saveSnapshotAddresses(addressesPassed)

  console.log(`done! saved ${addressesPassed.length} addresses to '${OutputFile}'`)
}

const getCandidates = async () => {
  const inputPath = path.join(__dirname, '..', 'data', InputFile)
  const inputContents = await fs.promises.readFile(inputPath, { encoding: 'utf8' })
  return JSON.parse(inputContents) as string[]
}

const getCandidatePower = async (address: string) => {
  const res = await fetch(`${ScyApiUrl}/users/${address}?with=power`)
  if (!res.ok) return 0
  const body = (await res.json()) as { data: { power: number } }
  return body.data.power || 0
}

const saveSnapshotAddresses = async (addresses: string[]) => {
  const output = path.join(__dirname, '..', 'data', OutputFile)
  const jsoned = JSON.stringify(addresses)
  await fs.promises.writeFile(output, jsoned, { encoding: 'utf8' })
}

main()
