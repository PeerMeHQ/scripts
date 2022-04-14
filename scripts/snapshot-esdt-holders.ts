import path, { dirname } from 'path'
import fs from 'fs'
import fetch from 'node-fetch'
import BigNumber from 'bignumber.js'
import { fileURLToPath } from 'url'

const TokenIdentifier = ''
const TokenDecimals = 18
const TokenMinAmount = 1
const OutputFile = 'snapshot.json'
const ApiUrl = 'https://api.elrond.com'

// api can return a max this number; this script only works as long as the nb. of holders is equal or below
const ApiMaxFetchSizeWithoutPagination = 10000

const IgnoredAccounts = [
  'erd1qqqqqqqqqqqqqpgqaqysetv6704mmktdyylzh08rtluquhpd27rsdkgh63', // distribution smart contract
]

type ApiTokenAccount = {
  address: string
  balance: string
}

const __dirname = dirname(fileURLToPath(import.meta.url))

const main = async () => {
  const candidates = await getCandidates()

  if (!candidates) {
    console.error('no token holders found')
    return
  }

  console.log(`scanning ${candidates.length} candidates ...`)

  const minRequiredBalance = new BigNumber(TokenMinAmount).shiftedBy(TokenDecimals)

  let count = 0
  let addressesPassed = []

  for (let candidate of candidates) {
    count++
    let passes = false
    const accountBalance = new BigNumber(candidate.balance)

    if (accountBalance.isGreaterThanOrEqualTo(minRequiredBalance) && !IgnoredAccounts.includes(candidate.address)) {
      passes = true
      addressesPassed.push(candidate.address)
    }

    console.log(`${count}. address '${candidate.address}' meets requirements: ${passes.toString()} (${candidate.balance})`)

    await new Promise(r => setTimeout(r, 20))
  }

  await saveSnapshotAddresses(addressesPassed)

  console.log(`done! snapshot of ${addressesPassed.length} accounts saved to '${OutputFile}'`)
}

const getCandidates = async () => {
  const res = await fetch(`${ApiUrl}/tokens/${TokenIdentifier}/accounts?size=${ApiMaxFetchSizeWithoutPagination}`)
  if (!res.ok) return null
  const body = (await res.json()) as ApiTokenAccount[]
  return body || []
}

const saveSnapshotAddresses = async (addresses: string[]) => {
  const output = path.join(__dirname, '..', 'data', OutputFile)
  const jsoned = JSON.stringify(addresses)
  await fs.promises.writeFile(output, jsoned, { encoding: 'utf8' })
}

main()
