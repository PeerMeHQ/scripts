import path, { dirname } from 'path'
import fs from 'fs'
import fetch from 'node-fetch'
import BigNumber from 'bignumber.js'
import { fileURLToPath } from 'url'
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

const RewardTokenIdentifier = ''
const RewardTokenAmount = 0
const InputFile = 'in.json'
const PemFile = 'distributor.pem'
const IsTestnet = false // no practical usernames on testnet
const SimulateSending = true

const ProxyUrl = IsTestnet ? 'https://testnet-gateway.elrond.com' : 'https://gateway.elrond.com'
const ApiUrl = IsTestnet ? 'https://testnet-api.elrond.com' : 'https://api.elrond.com'

const __dirname = dirname(fileURLToPath(import.meta.url))

const main = async () => {
  const provider = new ProxyProvider(ProxyUrl, { timeout: 5000 })
  const signer = await getSigner()
  const account = new Account(signer.getAddress())
  const winners = await getWinnerIdentifiers()

  console.log(`distributing to ${winners.length} receivers ...`)
  console.log(`total distribution value: ${winners.length * RewardTokenAmount} ${RewardTokenIdentifier}`)

  await NetworkConfig.getDefault().sync(provider)
  await account.sync(provider)

  let count = 0

  for (let receiverIdentifier of winners) {
    count++
    const address = isAddress(receiverIdentifier) ? receiverIdentifier : await getAddressFromUsername(receiverIdentifier)

    if (!address) {
      console.error(`failed to fetch address for username '${receiverIdentifier}'`)
      continue
    }

    const tx = await buildRewardTransactionFor(address)
    tx.setNonce(account.nonce)
    await signer.sign(tx)
    account.incrementNonce()

    if (SimulateSending) {
      await tx.simulate(provider)
    } else {
      await tx.send(provider)
    }

    console.log(`${count}. sent ${RewardTokenAmount} ${RewardTokenIdentifier} to ${address}: ${tx.getHash()}`)

    await new Promise(r => setTimeout(r, 300)) // 3 txs / s = 18 txs / block, in a 6 second block
  }

  console.log('guess what? we are done!')
}

const getWinnerIdentifiers = async () => {
  const inputPath = path.join(__dirname, '..', 'data', InputFile)
  const inputContents = await fs.promises.readFile(inputPath, { encoding: 'utf8' })
  return JSON.parse(inputContents)
}

const getSigner = async () => {
  const pemWalletPath = path.join(__dirname, '..', 'wallets', PemFile)
  const pemWalletContents = await fs.promises.readFile(pemWalletPath, { encoding: 'utf8' })
  return UserSigner.fromPem(pemWalletContents)
}

const isAddress = (val: string) => val.startsWith('erd1') && val.length === 62

const getAddressFromUsername = async (username: string) => {
  const sanitizedUsername = username.replace('@', '').split('.')[0]
  const res = await fetch(`${ApiUrl}/usernames/${sanitizedUsername}`)
  if (!res.ok) return null
  const body = (await res.json()) as any
  return body.address || null
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
