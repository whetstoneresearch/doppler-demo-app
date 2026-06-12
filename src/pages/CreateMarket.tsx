import { useSearchParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CreatePool from './CreatePool'
import CreateSolanaLaunch from './CreateSolanaLaunch'

export default function CreateMarket() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('chain') === 'solana' ? 'solana' : 'evm'

  const handleTabChange = (value: string) => {
    if (value === 'solana') {
      setSearchParams({ chain: 'solana' })
      return
    }
    setSearchParams({})
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary">Create Launch</h1>
          <p className="mt-2 text-muted-foreground">
            Configure an EVM pool or a Solana devnet launch from one flow.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-6 grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="evm">EVM</TabsTrigger>
            <TabsTrigger value="solana">Solana</TabsTrigger>
          </TabsList>
          <TabsContent value="evm">
            <CreatePool embedded />
          </TabsContent>
          <TabsContent value="solana">
            <CreateSolanaLaunch embedded />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
