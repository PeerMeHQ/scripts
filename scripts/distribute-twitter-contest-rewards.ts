import path, { dirname } from 'path'
import fs from 'fs'
import fetch from 'node-fetch'
import { fileURLToPath } from 'url'
import {
  ProxyProvider,
  UserSigner,
  Account,
  Transaction,
  Address,
  EsdtHelpers,
  Balance,
  TransactionPayload,
  GasLimit,
} from '@elrondnetwork/erdjs'

const ContestTweetId = 'TWITTER CONTEST TWEET ID'
const RewardTokenIdentifier = 'TOKEN ID'
const RewardTokenAmount = 0
const PemFile = 'distributor.pem'
const IsTestnet = true
const ControlPanelApiBaseUrl = IsTestnet ? 'http://superciety--cp.test/api' : 'https://cp.superciety.com/api'
const ControlPanelApiAuthToken = 'SECRET API KEY - IF YOU CHEK THIS IN YOU ARE A LOSER'

type ApiContestDistributionInfo = {
  finished: boolean
  addresses: string[]
}

const __dirname = dirname(fileURLToPath(import.meta.url))

const main = async () => {
  const proxyUrl = IsTestnet ? 'https://testnet-gateway.elrond.com' : 'https://gateway.elrond.com'
  const provider = new ProxyProvider(proxyUrl, { timeout: 5000 })
  const signer = await getSigner()
  const account = new Account(signer.getAddress())
  const distributionInfo = await fetchContestDistributionInfo()

  if (!distributionInfo) {
    console.error('failed to get contest distribution info')
    return
  }

  if (!distributionInfo.finished) {
    console.error('contest has not finished yet.')
    return
  }

  console.log(`distributing to ${distributionInfo.addresses.length} receivers`)

  await account.sync(provider)

  for (let receiver of distributionInfo.addresses) {
    account.incrementNonce()
    const tx = await buildRewardTransactionFor(receiver)
    tx.setNonce(account.nonce)
    await signer.sign(tx)
    await tx.send(provider)
    console.log(`sent rewards ${RewardTokenAmount} ${RewardTokenIdentifier} to ${receiver}: ${tx.getHash()}`)
    await new Promise(r => setTimeout(r, 2 * 1000))
  }
}

const getSigner = async () => {
  const pemWalletPath = path.join(__dirname, '..', 'wallets', PemFile)
  const pemWalletContents = await fs.promises.readFile(pemWalletPath, { encoding: 'utf8' })
  return UserSigner.fromPem(pemWalletContents)
}

const fetchContestDistributionInfo = async () => {
  const res = await fetch(`${ControlPanelApiBaseUrl}/twitter/contests/${ContestTweetId}/distribution`, {
    headers: { Authorization: `Bearer ${ControlPanelApiAuthToken}` },
  })
  if (!res.ok) return null
  const body = (await res.json()) as any
  return body.data as ApiContestDistributionInfo
}

const buildRewardTransactionFor = async (receiverAddress: string) => {
  const esdtTxFields = EsdtHelpers.getTxFieldsForEsdtTransfer(RewardTokenIdentifier, RewardTokenAmount.toString())

  return new Transaction({
    data: new TransactionPayload(esdtTxFields.data),
    gasLimit: new GasLimit(esdtTxFields.gasLimit),
    receiver: new Address(receiverAddress),
    value: Balance.Zero(),
  })
}

main()
