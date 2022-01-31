import path, { dirname } from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { Mnemonic } from '@elrondnetwork/erdjs'

const OutputFile = 'snapshot.json'
const AddressAmount = 20

const __dirname = dirname(fileURLToPath(import.meta.url))

const main = async () => {
  const generatePubKey = () =>
    Mnemonic.generate()
      .deriveKey(0)
      .generatePublicKey()

  const randomAddresses = Array.from({ length: AddressAmount })
    .map(generatePubKey)
    .map(key => key.toAddress().bech32())

  await saveSnapshotAddresses(randomAddresses)

  console.log(`done! saved ${AddressAmount} random addresses to '${OutputFile}'`)
}

const saveSnapshotAddresses = async (addresses: string[]) => {
  const output = path.join(__dirname, '..', 'data', OutputFile)
  const jsoned = JSON.stringify(addresses)
  await fs.promises.writeFile(output, jsoned, { encoding: 'utf8' })
}

main()
