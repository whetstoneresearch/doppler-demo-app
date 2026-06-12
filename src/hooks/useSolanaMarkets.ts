import { useQuery } from '@tanstack/react-query'
import { address, type Address } from '@solana/kit'
import { cpmm, initializer } from '@whetstone-research/doppler-sdk/solana'
import {
  solanaDeploymentPromise,
  solanaRpc,
  toSolanaAddress,
} from '@/lib/solana/config'
import {
  fetchSolanaIndexerPools,
  type SolanaIndexerPool,
} from '@/utils/solana-indexer'

export type SolanaLaunchListItem = Awaited<
  ReturnType<typeof initializer.fetchAllLaunches>
>[number]

export type SolanaPoolListItem = Awaited<ReturnType<typeof cpmm.fetchAllPools>>[number]

export function useSolanaMarkets() {
  return useQuery({
    queryKey: ['solana-markets'],
    queryFn: async () => {
      const deployment = await solanaDeploymentPromise
      const [launches, pools, indexerPools] = await Promise.all([
        initializer.fetchAllLaunches(solanaRpc, {
          programId: deployment.initializerProgram,
          commitment: 'confirmed',
        }),
        cpmm.fetchAllPools(solanaRpc, {
          programId: deployment.cpmmProgram,
          commitment: 'confirmed',
        }),
        fetchSolanaIndexerPools().catch(() => [] as SolanaIndexerPool[]),
      ])

      return {
        launches,
        pools,
        indexerPools,
      }
    },
    staleTime: 30_000,
  })
}

export function useSolanaLaunch(launchAddress: string | undefined) {
  return useQuery({
    queryKey: ['solana-launch', launchAddress],
    enabled: Boolean(launchAddress),
    queryFn: async () => {
      if (!launchAddress) throw new Error('Launch address is required')
      const deployment = await solanaDeploymentPromise
      const launch = await initializer.fetchLaunch(
        solanaRpc,
        toSolanaAddress(launchAddress),
        {
          programId: deployment.initializerProgram,
          commitment: 'confirmed',
        },
      )

      if (!launch) throw new Error('Launch not found')
      return {
        address: address(launchAddress),
        account: launch,
        deployment,
      }
    },
    staleTime: 15_000,
  })
}

export function useSolanaPool(poolAddress: string | undefined) {
  return useQuery({
    queryKey: ['solana-pool', poolAddress],
    enabled: Boolean(poolAddress),
    queryFn: async () => {
      if (!poolAddress) throw new Error('Pool address is required')
      const deployment = await solanaDeploymentPromise
      const pool = await cpmm.fetchPool(solanaRpc, toSolanaAddress(poolAddress), {
        programId: deployment.cpmmProgram,
        commitment: 'confirmed',
      })

      if (!pool) throw new Error('Pool not found')
      return {
        address: address(poolAddress) as Address,
        account: pool,
        deployment,
      }
    },
    staleTime: 15_000,
  })
}
