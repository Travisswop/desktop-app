# AGENTS.md - Swop Desktop Application

This document provides guidelines and context for working effectively in the Swop Desktop Application codebase.

## Repository Overview

The Swop Desktop Application is a comprehensive web3 platform built with Next.js that enables users to create digital identities, manage cryptocurrency assets, mint NFTs, and conduct e-commerce activities in a unified interface. The platform serves users who want to establish and monetize their online presence through customizable "SmartSites" (personal microsites).

### Key Features
- **SmartSite Creation**: Customizable microsites with various components (icons, contact info, marketplace items)
- **Wallet Management**: Managing tokens and NFTs across multiple blockchains (Ethereum, Polygon, Base, Solana)
- **NFT Minting**: Creating different types of NFTs (collectibles, memberships, phygitals)
- **Payment Processing**: Handling transactions through both traditional (Stripe) and cryptocurrency methods
- **QR Code Generation**: Creating and customizing QR codes for SmartSites
- **Analytics**: Tracking user engagement and visitor statistics

## Directory Structure

The repository follows a feature-based organization structure:

```
desktop-app/
├── app/                  # Next.js App Router pages and routing
│   ├── (auth)/           # Authentication routes
│   ├── (pages)/          # Main application pages
│   ├── (public-profile)/ # Public profile and marketplace pages
│   └── api/              # API routes
├── actions/              # Server actions for backend API interactions
├── components/           # React components organized by feature
│   ├── analytics/        # Analytics-related components
│   ├── feed/             # Social feed components
│   ├── mint/             # NFT minting components
│   ├── onboard/          # User onboarding components
│   ├── order/            # Order management components
│   ├── publicProfile/    # Public profile components
│   ├── smartsite/        # SmartSite customization components
│   ├── ui/               # UI components and primitives
│   └── wallet/           # Wallet-related components
├── docs/                 # Documentation files
├── hooks/                # Custom React hooks
├── lib/                  # Shared libraries and utilities
├── public/               # Static assets
├── services/             # Service classes for complex operations
├── types/                # TypeScript type definitions
├── utils/                # Utility functions
└── zustandStore/         # Zustand state management stores
```

## Core Systems

The application is built around several interconnected systems:

### 1. Authentication System
- Handles user login/registration and wallet creation
- Uses Privy for authentication while creating on-chain identity (SwopID)
- Key files: `app/(auth)/login/page.tsx`, `app/(auth)/onboard/page.tsx`, `components/onboard/Registration.tsx`

### 2. SmartSite System
- Manages user profiles and customizable microsites
- Includes various component types (contact cards, social links, marketplace, etc.)
- Key files: `components/smartsite/SmartsiteIconLivePreview.tsx`, `components/smartsite/EditMicrosite/mainContent.tsx`

### 3. Wallet System
- Provides cryptocurrency wallet functionality across multiple blockchains
- Handles token management, NFT display, and transactions
- Key files: `components/wallet/WalletContent.tsx`, `components/wallet/token/token-list.tsx`

### 4. NFT Minting System
- Creates and manages different types of NFT collections and templates
- Supports various NFT types (collectibles, memberships, phygitals)
- Key files: `app/(pages)/mint/page.tsx`, `components/mint/phygital.tsx`, `components/mint/membership.tsx`

### 5. Marketplace System
- Handles product listings, cart, and payment processing
- Key files: `app/(public-profile)/sp/[username]/ClientProfile.tsx`, `app/(public-profile)/sp/[username]/cart/CartCheckout.tsx`

### 6. Analytics System
- Tracks user engagement and provides insights
- Key files: `app/(pages)/analytics/page.tsx`, `components/analytics/smartsite-slider.tsx`

## Development Workflow

### Setup and Running the Application

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Access the application at http://localhost:3000

### Code Style and Conventions

The project uses:
- TypeScript for type safety
- ESLint for code linting with TypeScript-specific rules
- TailwindCSS for styling with custom theme configuration
- Next.js App Router for routing and page organization

Follow these conventions:
- Use kebab-case for file names
- Use PascalCase for component names
- Follow the existing component structure when adding new features
- Use Zustand for state management following existing patterns
- Implement server-side functionality using server actions in the `actions/` directory

### Important Considerations

#### Wallet Connections
The Privy useSolanaWallets hook loses wallet connection during client-side navigation. To prevent this issue, wallet connections should be exposed at the app level through a context provider or global state rather than invoking useSolanaWallets in individual components.

#### Payment Flows
For consistent order tracking across payment methods:
- Orders should be saved to the database before initiating the payment process
- This applies to both card (Stripe) and wallet payments
- For wallet payments specifically, create and save the order before opening the token list for selection

#### NFT Type Handling
Different NFT types have different requirements:
- Only "phygital" NFT types require shipping information during checkout
- Other NFT types (like "menu", "collectibles", etc.) don't require shipping information
- The NFT type is stored in the `nftTemplate.nftType` field of cart items
- Implement conditional shipping address collection based on cart content

## Testing and Validation

When making changes to the codebase:

1. Run ESLint to check for code style issues:
```bash
npm run lint
```

2. Verify changes locally by running the development server:
```bash
npm run dev
```

3. For UI changes, manually test the affected components in the browser

4. For data-related changes, verify that:
   - Data is correctly saved and retrieved
   - Error handling works as expected
   - User experience flows smoothly

5. For wallet-related changes, test across multiple blockchain networks

6. For payment-related changes, verify both Stripe and cryptocurrency payment flows

## Contribution Guidelines

- Make changes in feature-specific files/directories
- Follow existing coding patterns and styles
- Ensure backward compatibility when modifying APIs
- Document complex logic with clear comments
- Maintain type safety with proper TypeScript types
- Don't commit directly to main branch
