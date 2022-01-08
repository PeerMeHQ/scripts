import path, { dirname } from 'path'
import fs from 'fs'
import fetch from 'node-fetch'
import { fileURLToPath } from 'url'
import BigNumber from 'bignumber.js'
import {
  ProxyProvider,
  UserSigner,
  Account,
  Transaction,
  Address,
  Balance,
  TransactionPayload,
  GasLimit,
  NetworkConfig,
  ContractFunction,
  BigUIntValue,
  BytesValue,
} from '@elrondnetwork/erdjs'

const ContestTweetId = ''
const RewardTokenIdentifier = ''
const RewardTokenAmount = 0
const PemFile = 'distributor.pem'
const IsTestnet = true
const SimulateSending = true
const ControlPanelApiBaseUrl = IsTestnet ? 'http://superciety--cp.test/api' : 'https://cp.superciety.com/api'
const ControlPanelApiAuthToken = 'IF YOU CHECK THIS IN YOU ARE A NOOB'

type ApiContestDistributionInfo = {
  finished: boolean
  count: number
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

  console.log(`distributing to ${distributionInfo.count} receivers ...`)
  console.log(`total distribution value: ${distributionInfo.count * RewardTokenAmount} ${RewardTokenIdentifier}`)

  await NetworkConfig.getDefault().sync(provider)
  await account.sync(provider)

  let count = 0

  for (let receiver of distributionInfo.addresses) {
    count++
    const tx = await buildRewardTransactionFor(receiver)
    tx.setNonce(account.nonce)
    await signer.sign(tx)
    account.incrementNonce()

    if (SimulateSending) {
      await tx.simulate(provider)
    } else {
      await tx.send(provider)
    }

    console.log(`${count}. sent ${RewardTokenAmount} ${RewardTokenIdentifier} to ${receiver}: ${tx.getHash()}`)

    await new Promise(r => setTimeout(r, 300)) // 3 txs / s = 18 txs / block, in a 6 second block
  }

  console.log('guess what? we are done!')
}

const getSigner = async () => {
  const pemWalletPath = path.join(__dirname, '..', 'wallets', PemFile)
  const pemWalletContents = await fs.promises.readFile(pemWalletPath, { encoding: 'utf8' })
  return UserSigner.fromPem(pemWalletContents)
}

const fetchContestDistributionInfo = async () => {
  const res = await fetch(`${ControlPanelApiBaseUrl}/twitter/contests/${ContestTweetId}/distribution/all`, {
    headers: { Authorization: `Bearer ${ControlPanelApiAuthToken}` },
  })
  if (!res.ok) return null
  const body = (await res.json()) as any
  return body.data as ApiContestDistributionInfo
}

const buildRewardTransactionFor = async (receiverAddress: string) =>
  new Transaction({
    data: TransactionPayload.contractCall()
      .setFunction(new ContractFunction('ESDTTransfer'))
      .addArg(BytesValue.fromUTF8(RewardTokenIdentifier))
      .addArg(new BigUIntValue(new BigNumber(RewardTokenAmount)))
      .build(),
    gasLimit: new GasLimit(500000),
    receiver: new Address(receiverAddress),
    value: Balance.Zero(),
  })

main()
