# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Swop Desktop Application is a comprehensive Next.js web3 platform that enables users to create digital identities ("SmartSites"), manage cryptocurrency assets across multiple blockchains, mint NFTs, and conduct e-commerce activities. The platform integrates blockchain technology with traditional web services to provide a unified experience for digital creators and businesses.

## Development Commands

### Core Development
- `npm run dev` - Start the development server at http://localhost:3000
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint to check for code style and type issues

### Key Technologies
- **Next.js 15** with App Router for routing and SSR
- **TypeScript** for type safety
- **TailwindCSS** with NextUI for styling
- **Privy** for authentication and wallet management
- **Solana Web3.js**, **Ethers**, **Wagmi** for blockchain integrations
- **Zustand** for state management
- **React Query (TanStack Query)** for server state management

## Architecture Overview

### Core Systems

**Authentication & Onboarding**
- Privy-based authentication with multi-wallet support
- Custom onboarding flow creating "SwopID" identities
- Key files: `app/(auth)/`, `components/onboard/`

**SmartSite System** 
- Customizable microsites with drag-and-drop components
- Icon-based interface for contact info, links, marketplace items
- Live preview functionality during editing
- Key files: `components/smartsite/`, `app/(pages)/smartsite/`

**Multi-Chain Wallet System**
- Supports Ethereum, Polygon, Base, and Solana networks
- Token management, NFT display, transaction history
- Integrated swapping via Jupiter (Solana) and LiFi (EVM chains)
- Key files: `components/wallet/`, `services/`, `providers/`

**NFT Minting & Marketplace**
- Multiple NFT types: collectibles, memberships, phygitals, coupons
- Template-based creation system
- Integrated payment processing (Stripe + crypto)
- Key files: `components/mint/`, `app/(public-profile)/`

**Analytics & Feed System**
- User engagement tracking and insights
- Social feed for connections and transactions
- Key files: `components/analytics/`, `components/feed/`

### Data Flow Patterns

**State Management**
- Zustand stores for UI state (`zustandStore/`)
- React Query for server state and caching
- Context providers for wallet connections and user data

**API Integration**
- Server actions in `actions/` directory for backend calls
- API routes in `app/api/` for webhooks and external integrations
- Type-safe data handling with TypeScript interfaces in `types/`

**Payment Flows**
- Orders must be saved to database BEFORE payment initiation
- Both Stripe (card) and cryptocurrency payment support
- Different NFT types have different shipping requirements (only "phygital" requires shipping)

### Important Architectural Considerations

**Wallet Connection Management**
- Privy `useSolanaWallets` hook loses connection during client-side navigation
- Expose wallet connections at app level through context providers
- Use `providers/SyncedWalletProvider.tsx` for consistent state

**XMTP Chat Integration**
- WebAssembly-based messaging system with complex webpack configuration
- Separate client/server handling due to WASM requirements
- Files: `lib/context/XmtpContext.tsx`, `next.config.ts` webpack config

**Image Handling**
- Cloudinary integration for file uploads
- Multiple image optimization patterns for different use cases
- Files: `lib/SendCloudinaryImage.tsx`, `lib/SendCloudinaryAnyFile.tsx`

## File Structure Patterns

```
app/                    # Next.js App Router pages
├── (auth)/            # Authentication routes
├── (pages)/           # Protected application pages  
├── (public-profile)/  # Public SmartSite pages
└── api/               # API endpoints

components/            # React components by feature
├── ui/               # Reusable UI components
├── wallet/           # Wallet-related components
├── smartsite/        # SmartSite creation/editing
├── mint/             # NFT minting components
└── [feature]/        # Feature-specific components

actions/              # Server actions for API calls
lib/                  # Shared utilities and contexts
services/             # Business logic services
types/                # TypeScript type definitions
zustandStore/         # Client state management
```

## Development Workflow

### Code Conventions
- Use kebab-case for file names
- Use PascalCase for React components
- Follow existing patterns for new features
- Maintain type safety with proper TypeScript usage
- Server-side functionality goes in `actions/` directory

### Testing & Validation
1. Run `npm run lint` for code style validation
2. Test wallet connections across multiple networks
3. Verify payment flows for both Stripe and crypto payments
4. Test responsive design and mobile compatibility
5. Validate blockchain interactions in testnet before mainnet

### Common Gotchas
- XMTP components must be client-side only due to WASM dependencies
- Wallet state can be lost during navigation - use global context
- Image uploads require Cloudinary configuration
- NFT type determines checkout flow requirements
- Payment orders must be created before payment UI is shown

## Key Integration Points

### Blockchain Networks
- **Solana**: Jupiter for swaps, SPL tokens, Metaplex NFTs
- **Ethereum/Polygon/Base**: Wagmi for connections, LiFi for swaps
- Network switching handled in `components/wallet/network-dock.tsx`

### External Services
- **Stripe**: Subscription and payment processing
- **Cloudinary**: Image and media storage
- **Socket.io**: Real-time chat and notifications
- **XMTP**: Decentralized messaging protocol

### Environment Configuration
- Blockchain RPC endpoints and API keys required
- Webhook endpoints for Stripe integration
- Socket server configuration for real-time features