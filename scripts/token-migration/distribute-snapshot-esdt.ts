import path, { dirname } from 'path'
import fs from 'fs'
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

type ApiTokenAccount = {
  address: string
  balance: string
}

const SnapshotFile = ''
const V2TokenIdentifier = ''
const DistributorPem = 'distributor.pem'
const IsTestnet = false
const SimulateSending = false

const ProxyUrl = IsTestnet ? 'https://testnet-gateway.elrond.com' : 'https://gateway.elrond.com'

const __dirname = dirname(fileURLToPath(import.meta.url))

const main = async () => {
  const provider = new ProxyProvider(ProxyUrl, { timeout: 5000 })
  const signer = await getSigner()
  const account = new Account(signer.getAddress())
  const snapshotAccounts = await getSnapshotAccounts()

  console.log(`distributing to ${snapshotAccounts.length} receivers ...`)

  await NetworkConfig.getDefault().sync(provider)
  await account.sync(provider)

  let count = 0

  for (let snapshotAccount of snapshotAccounts) {
    count++

    const tx = await buildTransactionFor(snapshotAccount)
    tx.setNonce(account.nonce)
    await signer.sign(tx)
    account.incrementNonce()

    if (SimulateSending) {
      await tx.simulate(provider)
    } else {
      await tx.send(provider)
    }

    console.log(
      `${count}. sent ${snapshotAccount.balance} ${V2TokenIdentifier} to ${snapshotAccount.address}: ${tx.getHash()}`
    )

    await new Promise(r => setTimeout(r, 300)) // ~ 3 txs / s = 18 txs / block, in 6 second block
  }

  console.log('done!')
}

const getSnapshotAccounts = async () => {
  const inputPath = path.join(__dirname, '..', '..', 'data', SnapshotFile)
  const inputContents = await fs.promises.readFile(inputPath, { encoding: 'utf8' })
  return JSON.parse(inputContents)
}

const getSigner = async () => {
  const pemWalletPath = path.join(__dirname, '..', '..', 'wallets', DistributorPem)
  const pemWalletContents = await fs.promises.readFile(pemWalletPath, { encoding: 'utf8' })
  return UserSigner.fromPem(pemWalletContents)
}

const buildTransactionFor = async (account: ApiTokenAccount) =>
  new Transaction({
    data: TransactionPayload.contractCall()
      .setFunction(new ContractFunction('ESDTTransfer'))
      .addArg(BytesValue.fromUTF8(V2TokenIdentifier))
      .addArg(new BigUIntValue(new BigNumber(account.balance)))
      .build(),
    gasLimit: new GasLimit(500000),
    receiver: new Address(account.address),
    value: Balance.Zero(),
  })

main()
