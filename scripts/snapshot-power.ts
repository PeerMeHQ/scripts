import path, { dirname } from 'path'
import fs from 'fs'
import fetch from 'node-fetch'
import { fileURLToPath } from 'url'

const MinPowerRequired = 500
const OutputFile = 'snapshot.json'
const ScyApiUrl = 'https://api.superciety.com'

const __dirname = dirname(fileURLToPath(import.meta.url))

const main = async () => {
  const candidates = await getAllCandidates()

  if (!candidates) {
    console.error('no token holders found')
    return
  }

  console.log(`scanning ${candidates.length} candidates ...`)

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

    await new Promise(r => setTimeout(r, 500))
  }

  await saveSnapshotAddresses(addressesPassed)

  console.log(`done! snapshot of ${addressesPassed.length} accounts saved to '${OutputFile}'`)
}

const getAllCandidates = async () => {
  const res = await fetch(`${ScyApiUrl}/addresses/all`)
  if (!res.ok) return null
  const body = (await res.json()) as { data: string[] }
  return body.data || []
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
