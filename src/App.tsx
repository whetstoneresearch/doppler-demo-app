import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { config } from './lib/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AllPools from './pages/AllPools'
import CreatePool from './pages/CreatePool'
import PoolDetails from './pages/PoolDetails'
import QuoteDebug from './pages/QuoteDebug'
import SolanaMarkets from './pages/SolanaMarkets'
import CreateSolanaLaunch from './pages/CreateSolanaLaunch'
import SolanaLaunchDetails from './pages/SolanaLaunchDetails'
import SolanaPoolDetails from './pages/SolanaPoolDetails'
import { Navbar } from './components/ui/navbar'
import { SolanaWalletProvider } from './lib/solana/wallet'

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <SolanaWalletProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-background cyber-grid">
              <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
                <Navbar />
                <main className="container mx-auto">
                  <Routes>
                    <Route path="/" element={<AllPools />} />
                    <Route path="/create" element={<CreatePool />} />
                    <Route path="/pool/:address" element={<PoolDetails />} />
                    <Route path="/debug/quote" element={<QuoteDebug />} />
                    <Route path="/solana" element={<SolanaMarkets />} />
                    <Route path="/solana/create" element={<CreateSolanaLaunch />} />
                    <Route path="/solana/launch/:address" element={<SolanaLaunchDetails />} />
                    <Route path="/solana/pool/:address" element={<SolanaPoolDetails />} />
                  </Routes>
                </main>
              </div>
            </div>
          </BrowserRouter>
        </SolanaWalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
