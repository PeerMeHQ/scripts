import path, { dirname } from 'path'
import fs from 'fs'
import fetch from 'node-fetch'
import { fileURLToPath } from 'url'

const TokenIdentifier = 'SUPER-764d8d'
const OutputFile = 'snapshot-holders.json'
const ApiUrl = 'https://api.elrond.com'
const ApiMaxFetchSizeWithoutPagination = 10000

type ApiTokenAccount = {
  address: string
  balance: string
}

const IgnoredAccounts = [
  'erd1qqqqqqqqqqqqqpgq33a5u0szqcnheazacemez3tvvwp957lg2jps5r20dj', // dex pool address
]

const __dirname = dirname(fileURLToPath(import.meta.url))

const main = async () => {
  const holders = await getHolders()
  if (!holders) return []
  let count = 0
  let entries: ApiTokenAccount[] = []
  let totalValue = 0

  console.log(`scanning ${holders.length} holders ...`)

  for (let holder of holders) {
    if (IgnoredAccounts.includes(holder.address)) {
      continue
    }
    count++
    entries.push(holder)
    totalValue += +holder.balance
    console.log(`${count}. address '${holder.address}': ${holder.balance}. total: ${totalValue}`)
    await new Promise(r => setTimeout(r, 5))
  }

  await saveSnapshotEntries(entries)

  console.log(`done! snapshot of ${entries.length} accounts saved to '${OutputFile}'`)
}

const getHolders = async () => {
  const res = await fetch(`${ApiUrl}/tokens/${TokenIdentifier}/accounts?size=${ApiMaxFetchSizeWithoutPagination}`)
  if (!res.ok) return null
  const body = (await res.json()) as ApiTokenAccount[]
  return body || []
}

const saveSnapshotEntries = async (accounts: ApiTokenAccount[]) => {
  const output = path.join(__dirname, '..', '..', 'data', OutputFile)
  const jsoned = JSON.stringify(accounts)
  await fs.promises.writeFile(output, jsoned, { encoding: 'utf8' })
}

main()
