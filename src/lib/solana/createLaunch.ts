import { TOKEN_PROGRAM_ADDRESS, findAssociatedTokenPda } from '@solana-program/token'
import { SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system'
import { SYSVAR_RENT_ADDRESS } from '@solana/sysvars'
import {
  appendTransactionMessageInstructions,
  assertAccountExists,
  createTransactionMessage,
  decodeAccount,
  fetchEncodedAccount,
  generateKeyPairSigner,
  getSignatureFromTransaction,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address,
  type Instruction,
  type TransactionSigner,
} from '@solana/kit'
import { cpmm, cpmmMigrator, initializer } from '@whetstone-research/doppler-sdk/solana'
import {
  parseSolanaAmount,
  SOLANA_TOKEN_DECIMALS,
  solanaDeploymentPromise,
  solanaRpc,
  solanaRpcSubscriptions,
  toSolanaAddress,
  WSOL_MINT,
} from './config'

const QUOTE_DECIMALS = 9
const CPMM_FEE_SPLIT_BPS = 10_000
const DISABLED_REMAINING_ACCOUNTS_HASH = new Uint8Array(32)

export interface SolanaSwapFeeBounds {
  minSwapFeeBps: number
  maxSwapFeeBps: number
}

export interface SolanaCreateLaunchFeeBeneficiary {
  address: string
  sharePercent: string
}

export interface SolanaCreateLaunchAllocationRecipient {
  address: string
  amount: string
}

export interface SolanaCreateLaunchForm {
  quoteMint: string
  migrateToCpmm: boolean
  minimumQuoteRaise: string
  tokenName: string
  tokenSymbol: string
  tokenURI: string
  totalSupply: string
  baseForDistribution: string
  baseForLiquidity: string
  marketCapStartUsd: string
  marketCapEndUsd: string
  numerairePriceUsd: string
  swapFeeBps: string
  allocationRecipients: SolanaCreateLaunchAllocationRecipient[]
  feeBeneficiaries: SolanaCreateLaunchFeeBeneficiary[]
}

export interface SolanaSdkLaunchResult {
  launchAddress: string
  baseMint: string
  txHash: string
  lookupTableAddress: string
  lookupTableTxHash: string
}

function parsePositiveNumber(value: string, fieldName: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be greater than zero`)
  }
  return parsed
}

function parsePercentToBps(value: string, fieldName: string): number {
  const trimmed = value.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error(`${fieldName} must be a percentage with at most two decimal places`)
  }

  const [whole, fraction = ''] = trimmed.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

export function formatBpsAsPercent(value: number): string {
  return (value / 100).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 100 === 0 ? 0 : 2,
  })
}

export async function getSolanaSwapFeeBounds(): Promise<SolanaSwapFeeBounds> {
  const [configAddress] = await initializer.getConfigAddress()
  const encodedAccount = await fetchEncodedAccount(solanaRpc, configAddress, {
    commitment: 'confirmed',
  })
  const decodedAccount = decodeAccount(encodedAccount, initializer.getInitConfigDecoder())
  assertAccountExists(decodedAccount)

  return {
    minSwapFeeBps: decodedAccount.data.minSwapFeeBps,
    maxSwapFeeBps: decodedAccount.data.maxSwapFeeBps,
  }
}

function parseFeeBeneficiaries(
  form: SolanaCreateLaunchForm,
  payerAddress: Address,
): { wallet: Address; shareBps: number }[] {
  const feeBeneficiaries = form.feeBeneficiaries
    .map((beneficiary) => ({
      wallet: beneficiary.address.trim()
        ? toSolanaAddress(beneficiary.address.trim())
        : null,
      shareBps: beneficiary.sharePercent.trim()
        ? parsePercentToBps(beneficiary.sharePercent, 'Fee beneficiary share')
        : 0,
    }))
    .filter((beneficiary) => beneficiary.wallet || beneficiary.shareBps)

  if (feeBeneficiaries.length === 0) {
    return [{ wallet: payerAddress, shareBps: 10_000 }]
  }

  if (feeBeneficiaries.some((beneficiary) => !beneficiary.wallet)) {
    throw new Error('Each fee beneficiary needs a Solana address')
  }

  if (
    feeBeneficiaries.some(
      (beneficiary) =>
        beneficiary.shareBps <= 0 ||
        beneficiary.shareBps > 10_000,
    )
  ) {
    throw new Error('Fee beneficiary shares must be percentages greater than 0 and up to 100')
  }

  if (feeBeneficiaries.reduce((sum, beneficiary) => sum + beneficiary.shareBps, 0) !== 10_000) {
    throw new Error('Fee beneficiary shares must total 100%')
  }

  return feeBeneficiaries.map((beneficiary) => ({
    wallet: beneficiary.wallet as Address,
    shareBps: beneficiary.shareBps,
  }))
}

function parseAllocationRecipients(
  form: SolanaCreateLaunchForm,
  payerAddress: Address,
  baseForDistribution: bigint,
): { wallet: Address; amount: bigint }[] {
  const allocationRecipients = form.allocationRecipients
    .map((recipient) => ({
      wallet: recipient.address.trim()
        ? toSolanaAddress(recipient.address.trim())
        : null,
      amountText: recipient.amount.trim(),
    }))
    .filter((recipient) => recipient.wallet || recipient.amountText)

  if (baseForDistribution === 0n) {
    if (allocationRecipients.length > 0) {
      throw new Error('Base for Distribution must be greater than zero when allocation recipients are set')
    }
    return []
  }

  if (allocationRecipients.length === 0) {
    return [{ wallet: payerAddress, amount: baseForDistribution }]
  }

  if (allocationRecipients.length > 2) {
    throw new Error('Distribution allocations support at most 2 recipients')
  }
  if (allocationRecipients.some((recipient) => !recipient.wallet || !recipient.amountText)) {
    throw new Error('Each distribution allocation needs a Solana address and amount')
  }

  const recipients = allocationRecipients.map((recipient) => ({
    wallet: recipient.wallet as Address,
    amount: parseSolanaAmount(recipient.amountText),
  }))

  if (recipients.some((recipient) => recipient.amount <= 0n)) {
    throw new Error('Distribution allocation amounts must be greater than zero')
  }
  if (recipients.reduce((sum, recipient) => sum + recipient.amount, 0n) !== baseForDistribution) {
    throw new Error('Distribution allocation amounts must equal Base for Distribution')
  }

  return recipients
}

async function waitForSlotAfter(slot: number | bigint): Promise<void> {
  const minSlot = BigInt(slot)
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const currentSlot = await solanaRpc.getSlot({ commitment: 'confirmed' }).send()
    if (BigInt(currentSlot) > minSlot) return
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error('Timed out waiting for address lookup table warmup slot')
}

async function sendTransactionMessage(
  transactionMessage: Parameters<typeof signTransactionMessageWithSigners>[0],
): Promise<string> {
  const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
  const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
    rpc: solanaRpc,
    rpcSubscriptions: solanaRpcSubscriptions,
  })

  await sendAndConfirmTransaction(
    signedTransaction as Parameters<typeof sendAndConfirmTransaction>[0],
    { commitment: 'confirmed' },
  )

  return getSignatureFromTransaction(signedTransaction).toString()
}

async function createLookupTableForInstruction({
  payer,
  instruction,
}: {
  payer: TransactionSigner
  instruction: Instruction
}) {
  const recentSlot = await solanaRpc.getSlot({ commitment: 'finalized' }).send()
  const authority = await generateKeyPairSigner()
  const lookupTable = await initializer.buildAddressLookupTableSetupInstructions({
    authority,
    payer,
    recentSlot,
    addresses: initializer.getInstructionLookupTableAddresses(instruction),
  })
  const { value: latestBlockhash } = await solanaRpc.getLatestBlockhash().send()
  const setupMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (transactionMessage) => setTransactionMessageFeePayerSigner(payer, transactionMessage),
    (transactionMessage) =>
      setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, transactionMessage),
    (transactionMessage) =>
      appendTransactionMessageInstructions(
        [lookupTable.createInstruction, ...lookupTable.extendInstructions],
        transactionMessage,
      ),
  )

  const lookupTableTxHash = await sendTransactionMessage(setupMessage)
  const setupSlot = await solanaRpc.getSlot({ commitment: 'confirmed' }).send()
  await waitForSlotAfter(setupSlot)

  return {
    ...lookupTable,
    txHash: lookupTableTxHash,
  }
}

export async function createSolanaLaunchWithSdk(
  form: SolanaCreateLaunchForm,
  payer: TransactionSigner,
): Promise<SolanaSdkLaunchResult> {
  const deployment = await solanaDeploymentPromise
  const quoteMint = form.quoteMint ? toSolanaAddress(form.quoteMint) : WSOL_MINT
  const totalSupply = parseSolanaAmount(form.totalSupply)
  const baseForDistribution = parseSolanaAmount(form.baseForDistribution)
  const baseForLiquidity = parseSolanaAmount(form.baseForLiquidity)
  const baseForCurve = totalSupply - baseForDistribution - baseForLiquidity
  const minimumQuoteRaise = form.migrateToCpmm
    ? parseSolanaAmount(form.minimumQuoteRaise, QUOTE_DECIMALS)
    : 0n
  const swapFeeBps = parsePercentToBps(form.swapFeeBps, 'Swap fee')
  const feeBounds = await getSolanaSwapFeeBounds()
  const feeBeneficiaries = parseFeeBeneficiaries(form, payer.address)
  const recipients = form.migrateToCpmm
    ? parseAllocationRecipients(form, payer.address, baseForDistribution)
    : []

  if (totalSupply <= 0n) {
    throw new Error('Total token supply must be greater than zero')
  }
  if (baseForCurve <= 0n) {
    throw new Error('Total supply must exceed base allocations')
  }
  if (form.migrateToCpmm && minimumQuoteRaise <= 0n) {
    throw new Error('Minimum Quote Raise must be greater than zero')
  }
  if (swapFeeBps < feeBounds.minSwapFeeBps || swapFeeBps > feeBounds.maxSwapFeeBps) {
    throw new Error(
      `Swap fee must be between ${formatBpsAsPercent(
        feeBounds.minSwapFeeBps,
      )}% and ${formatBpsAsPercent(feeBounds.maxSwapFeeBps)}%`,
    )
  }
  if (!form.migrateToCpmm && (baseForDistribution > 0n || baseForLiquidity > 0n)) {
    throw new Error('Enable CPMM migration to use base distribution or liquidity allocations')
  }
  if (!form.tokenName.trim() || !form.tokenSymbol.trim()) {
    throw new Error('Token name and symbol are required')
  }

  const marketCapStartUsd = parsePositiveNumber(form.marketCapStartUsd, 'Market Cap Start')
  const marketCapEndUsd = parsePositiveNumber(form.marketCapEndUsd, 'Market Cap End')
  const numerairePriceUsd = parsePositiveNumber(form.numerairePriceUsd, 'SOL Price')

  const { start } = cpmm.marketCapToCurveParams({
    startMarketCapUSD: marketCapStartUsd,
    endMarketCapUSD: marketCapEndUsd,
    baseTotalSupply: totalSupply,
    baseForCurve,
    baseDecimals: SOLANA_TOKEN_DECIMALS,
    quoteDecimals: QUOTE_DECIMALS,
    numerairePriceUSD: numerairePriceUsd,
  })

  const baseMint = await generateKeyPairSigner()
  const baseVault = await generateKeyPairSigner()
  const quoteVault = await generateKeyPairSigner()
  const metadataAccount = await initializer.getTokenMetadataAddress(baseMint.address)
  const launchId = initializer.launchIdFromU64(BigInt(Date.now()))
  const namespace = payer.address
  const [launch] = await initializer.getLaunchAddress(
    namespace,
    launchId,
    deployment.initializerProgram,
  )
  const [launchAuthority] = await initializer.getLaunchAuthorityAddress(
    launch,
    deployment.initializerProgram,
  )
  const [launchFeeState] = await initializer.getLaunchFeeStateAddress(
    launch,
    deployment.initializerProgram,
  )
  const [payerBaseAta] = await findAssociatedTokenPda({
    owner: payer.address,
    mint: baseMint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  })
  const [payerQuoteAta] = await findAssociatedTokenPda({
    owner: payer.address,
    mint: quoteMint,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  })
  const recipientAtas = await Promise.all(
    recipients.map(async (recipient) => {
      const [recipientBaseAta] = await findAssociatedTokenPda({
        owner: recipient.wallet,
        mint: baseMint.address,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      })
      return recipientBaseAta
    }),
  )
  const migrationAccounts = form.migrateToCpmm
    ? await cpmmMigrator.buildCpmmMigrationRemainingAccounts({
        launch,
        baseMint: baseMint.address,
        quoteMint,
        launchAuthority,
        adminBaseAta: payerBaseAta,
        adminQuoteAta: payerQuoteAta,
        recipientAtas,
        cpmmProgram: deployment.cpmmProgram,
        cpmmMigratorProgram: deployment.cpmmMigratorProgram,
      })
    : null
  const migratorInitPayload =
    form.migrateToCpmm && migrationAccounts
      ? cpmmMigrator.encodeRegisterLaunchPayload({
          cpmmConfig: migrationAccounts.cpmmConfig,
          initialSwapFeeBps: swapFeeBps,
          initialFeeSplitBps: CPMM_FEE_SPLIT_BPS,
          recipients,
          minRaiseQuote: minimumQuoteRaise,
          minMigrationPriceQ64Opt: null,
          migratedPoolHookConfig: null,
        })
      : new Uint8Array()
  const migratorMigratePayload = form.migrateToCpmm
    ? cpmmMigrator.encodeMigratePayload({
        baseForDistribution,
        baseForLiquidity,
      })
    : new Uint8Array()

  const instruction = await initializer.createInitializeLaunchInstruction(
    {
      config: deployment.initializerConfig,
      launch,
      launchAuthority,
      baseMint,
      quoteMint,
      baseVault,
      quoteVault,
      launchFeeState,
      payer,
      authority: payer,
      hookProgram: form.migrateToCpmm ? deployment.cpmmHookProgram : SYSTEM_PROGRAM_ADDRESS,
      migratorProgram: form.migrateToCpmm
        ? deployment.cpmmMigratorProgram
        : SYSTEM_PROGRAM_ADDRESS,
      ...(form.migrateToCpmm &&
        migrationAccounts && {
          cpmmConfig: migrationAccounts.cpmmConfig,
        }),
      baseTokenProgram: TOKEN_PROGRAM_ADDRESS,
      quoteTokenProgram: TOKEN_PROGRAM_ADDRESS,
      systemProgram: SYSTEM_PROGRAM_ADDRESS,
      rent: SYSVAR_RENT_ADDRESS,
      metadataAccount,
    },
    {
      namespace,
      launchId,
      baseDecimals: SOLANA_TOKEN_DECIMALS,
      baseTotalSupply: totalSupply,
      baseForDistribution,
      baseForLiquidity,
      curveVirtualBase: start.curveVirtualBase,
      curveVirtualQuote: start.curveVirtualQuote,
      swapFeeBps,
      curveKind: initializer.CURVE_KIND_XYK,
      curveParams: new Uint8Array([initializer.CURVE_PARAMS_FORMAT_XYK_V0]),
      allowBuy: true,
      allowSell: true,
      hookFlags: form.migrateToCpmm ? initializer.HF_BEFORE_SWAP : 0,
      hookPayload: new Uint8Array(),
      migratorInitPayload,
      migratorMigratePayload,
      hookCreateRemainingAccountsLen: 0,
      hookCreateRemainingAccountsHash: new Uint8Array(DISABLED_REMAINING_ACCOUNTS_HASH),
      hookRemainingAccountsHash: new Uint8Array(DISABLED_REMAINING_ACCOUNTS_HASH),
      migratorInitRemainingAccountsHash:
        form.migrateToCpmm && migrationAccounts
          ? initializer.computeRemainingAccountsHash([
              migrationAccounts.cpmmMigrationState,
              migrationAccounts.cpmmConfig,
            ])
          : new Uint8Array(DISABLED_REMAINING_ACCOUNTS_HASH),
      migratorRemainingAccountsHash:
        form.migrateToCpmm && migrationAccounts
          ? migrationAccounts.hash
          : new Uint8Array(DISABLED_REMAINING_ACCOUNTS_HASH),
      feeBeneficiaries,
      metadataName: form.tokenName.trim(),
      metadataSymbol: form.tokenSymbol.trim(),
      metadataUri: form.tokenURI.trim(),
    },
    deployment.initializerProgram,
  )
  const lookupTable = await createLookupTableForInstruction({ payer, instruction })
  const { value: latestBlockhash } = await solanaRpc.getLatestBlockhash().send()
  const launchMessage = initializer.compressTransactionMessageWithLookupTable(
    pipe(
      createTransactionMessage({ version: 0 }),
      (transactionMessage) => setTransactionMessageFeePayerSigner(payer, transactionMessage),
      (transactionMessage) =>
        setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, transactionMessage),
      (transactionMessage) => appendTransactionMessageInstructions([instruction], transactionMessage),
    ),
    lookupTable,
  )
  const txHash = await sendTransactionMessage(launchMessage)

  return {
    launchAddress: launch,
    baseMint: baseMint.address,
    txHash,
    lookupTableAddress: lookupTable.lookupTableAddress,
    lookupTableTxHash: lookupTable.txHash,
  }
}
