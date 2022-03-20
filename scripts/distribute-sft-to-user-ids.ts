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
  U64Value,
  AddressValue,
  TokenIdentifierValue,
} from '@elrondnetwork/erdjs'

const RewardTokenIdentifier = ''
const RewardTokenNonce = 0
const InputFile = 'snapshot.json'
const PemFile = 'distributor.pem'
const IsTestnet = true
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

  await NetworkConfig.getDefault().sync(provider)
  await account.sync(provider)

  let count = 0

  for (let receiverIdentifier of winners) {
    count++

    const receiverBech32 = isAddress(receiverIdentifier)
      ? receiverIdentifier
      : await getAddressFromUsername(receiverIdentifier)

    if (!receiverBech32) {
      console.error(`failed to fetch address for username '${receiverIdentifier}'`)
      continue
    }

    const receiverAddress = new Address(receiverBech32)
    const tx = await buildRewardTransactionFor(account.address, receiverAddress)
    tx.setNonce(account.nonce)
    await signer.sign(tx)
    account.incrementNonce()

    if (SimulateSending) {
      await tx.simulate(provider)
    } else {
      await tx.send(provider)
    }

    console.log(`${count}. sent ${RewardTokenIdentifier}-${RewardTokenNonce} to ${receiverBech32}: ${tx.getHash()}`)

    if (count === 1) {
      console.log('- - - - - - - - - - - - - - - - -')
      console.log('waiting 60s to verify first send')
      console.log('- - - - - - - - - - - - - - - - -')
      await new Promise(r => setTimeout(r, 60000))
    }

    await new Promise(r => setTimeout(r, 300)) // ~ 3 txs / s = 18 txs / block, in a 6 second block
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

const buildRewardTransactionFor = async (sender: Address, receiver: Address) =>
  new Transaction({
    data: TransactionPayload.contractCall()
      .setFunction(new ContractFunction('ESDTNFTTransfer'))
      .addArg(new TokenIdentifierValue(Buffer.from(RewardTokenIdentifier)))
      .addArg(new U64Value(new BigNumber(RewardTokenNonce)))
      .addArg(new BigUIntValue(new BigNumber(1)))
      .addArg(new AddressValue(receiver))
      .build(),
    gasLimit: new GasLimit(500000),
    receiver: sender,
    value: Balance.Zero(),
  })

main()
