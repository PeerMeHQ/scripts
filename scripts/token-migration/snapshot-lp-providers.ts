import path, { dirname } from 'path'
import fs from 'fs'
import fetch from 'node-fetch'
import { fileURLToPath } from 'url'

const OutputFile = ''
const ApiUrl = 'https://api.elrond.com'
const LpContractAddress = ''
const LpTokenId = ''
const ApiMaxFetchSizeWithoutPagination = 10000

type ApiTokenAccount = {
  address: string
  balance: string
}

type ApiAccountToken = {
  ticker: string
  balance: string
}

type ApiSmartContractResult = {
  sender: string
  receiver: string
}

const __dirname = dirname(fileURLToPath(import.meta.url))

const main = async () => {
  const lpPairInteractors = await getPairInteractors()
  if (!lpPairInteractors) return 'failed'
  let count = 0
  let entries: ApiTokenAccount[] = []
  let totalValue = 0

  console.log(`scanning ${lpPairInteractors.length} lp providers ...`)

  for (let provider of lpPairInteractors) {
    count++
    const wantedTokenAmount = await getLpProviderWantedTokenAmount(provider)
    if (!wantedTokenAmount) {
      console.error(`-- failed to lp get token amount of ${provider}`)
      continue
    }
    entries.push({ address: provider, balance: wantedTokenAmount })
    totalValue += +wantedTokenAmount
    console.log(`${count}. address '${provider}' provided ${wantedTokenAmount}. total: ${totalValue}`)
    await new Promise(r => setTimeout(r, 500))
  }

  await saveSnapshotEntries(entries)

  console.log(`done! snapshot of ${entries.length} accounts saved to '${OutputFile}'`)
}

const getLpProviderWantedTokenAmount = async (address: string) => {
  const res = await fetch(`${ApiUrl}/accounts/${address}/tokens`)
  if (!res.ok) return null
  const body = (await res.json()) as ApiAccountToken[]
  return body.filter(t => t.ticker === LpTokenId)[0]?.balance
}

const getPairInteractors = async () => {
  const res = await fetch(`${ApiUrl}/accounts/${LpContractAddress}/sc-results?size=${ApiMaxFetchSizeWithoutPagination}`)
  if (!res.ok) return null
  const results = ((await res.json()) || []) as ApiSmartContractResult[]
  return results.map(scr => (scr.receiver === LpContractAddress ? scr.sender : scr.receiver)).filter(onlyUnique)
}

const saveSnapshotEntries = async (addresses: ApiTokenAccount[]) => {
  const output = path.join(__dirname, '..', '..', 'data', OutputFile)
  const jsoned = JSON.stringify(addresses)
  await fs.promises.writeFile(output, jsoned, { encoding: 'utf8' })
}

function onlyUnique(value: any, index: any, self: any) {
  return self.indexOf(value) === index
}

main()
