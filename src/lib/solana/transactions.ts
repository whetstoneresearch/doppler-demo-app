import {
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  signTransactionMessageWithSigners,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  type Instruction,
  type TransactionSigner,
} from '@solana/kit'
import { solanaRpc } from './config'

export async function sendSolanaInstructions(
  signer: TransactionSigner,
  instructions: Instruction[],
): Promise<string> {
  const { value: latestBlockhash } = await solanaRpc
    .getLatestBlockhash({ commitment: 'confirmed' })
    .send()

  const message = appendTransactionMessageInstructions(
    instructions,
    setTransactionMessageLifetimeUsingBlockhash(
      latestBlockhash,
      setTransactionMessageFeePayerSigner(
        signer,
        createTransactionMessage({ version: 'legacy' }),
      ),
    ),
  )

  const signedTransaction = await signTransactionMessageWithSigners(message)
  const wireTransaction = getBase64EncodedWireTransaction(signedTransaction)
  const signature = await solanaRpc
    .sendTransaction(wireTransaction, {
      encoding: 'base64',
      preflightCommitment: 'confirmed',
    })
    .send()

  return signature.toString()
}
