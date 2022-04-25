import fs from 'fs'
import { User } from './types'
import fetch from 'node-fetch'
import collect from 'collect.js'
import { fileURLToPath } from 'url'
import path, { dirname } from 'path'

const WithApiInfo = ['power']

const InputFile = 'twitter-collected.json'
const OutputFile = 'validated.json'
const ScyApiUrl = 'https://api.superciety.com'

// Adapt this logic to fit the conditions
const qualifies = (user: User) => user.power > 20 && Object.keys(user?.connections || {}).length >= 2
//

const __dirname = dirname(fileURLToPath(import.meta.url))

const main = async () => {
  const candidates = collect(await getCandidates())
    .unique()
    .all()

  console.log(`scanning ${candidates.length} addresses ...`)

  let count = 0
  let addressesPassed: string[] = []

  for (let candidateAddress of candidates) {
    count++
    const candidate = await getCandidate(candidateAddress)

    if (candidate && qualifies(candidate)) {
      addressesPassed.push(candidateAddress)
      console.log(`${count}. address '${candidateAddress}' meets requirements`)
    } else {
      console.log(`${count}. address '${candidateAddress}' is not qualified`)
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

const getCandidate = async (address: string) => {
  const res = await fetch(`${ScyApiUrl}/users/${address}?with=${WithApiInfo.join(',')}`)
  if (!res.ok) return null
  const body = (await res.json()) as { data: User }
  return body.data
}

const saveSnapshotAddresses = async (addresses: string[]) => {
  const output = path.join(__dirname, '..', 'data', OutputFile)
  const jsoned = JSON.stringify(addresses)
  await fs.promises.writeFile(output, jsoned, { encoding: 'utf8' })
}

main()
