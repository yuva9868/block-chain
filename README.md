# MedLedger - Web3 Medical Records Platform

A blockchain-powered medical records management system built with Next.js 16, TypeScript, and Tailwind CSS. MedLedger allows patients to securely upload, manage, and verify their medical records on the blockchain while maintaining complete control over who can access their data.

## Features

- **Immutable Records**: Medical records are hashed using SHA-256 and stored on the blockchain, making them tamper-proof
- **Patient Control**: Grant or revoke access to healthcare providers with a single click
- **Transparent Access Logs**: Every access to your medical records is logged and visible to you
- **Record Verification**: Verify that your medical records haven't been tampered with
- **Responsive Design**: Fully responsive UI that works on mobile, tablet, and desktop
- **Dark Mode Support**: Built-in dark mode support with next-themes

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Blockchain Simulation**: Mock Web3 utilities (localStorage-based)
- **File Hashing**: Web Crypto API (SHA-256)
- **Notifications**: Sonner
- **Icons**: Lucide React
- **Date Formatting**: date-fns
- **Form Validation**: react-hook-form + zod

## Project Structure

```
/app
  /dashboard
    /upload      # Upload medical records
    /records     # View and manage records
    /logs        # Access logs
    /verify      # Verify record integrity
    layout.tsx   # Dashboard layout with sidebar
    page.tsx     # Dashboard overview
  layout.tsx     # Root layout with providers
  page.tsx       # Landing page
  globals.css    # Theme colors and styles

/components
  /dashboard
    sidebar.tsx           # Navigation sidebar
  /ui                     # shadcn/ui components
  theme-provider.tsx      # Next-themes provider

/lib
  web3.ts                 # Web3 utilities (mock blockchain)
  web3-context.tsx        # Web3 context provider
  records-context.tsx     # Records context provider
  hash.ts                 # SHA-256 hashing utilities
  mock-data.ts            # Mock data and contract ABI
  utils.ts                # Utility functions (cn)

/types
  index.ts                # TypeScript types and interfaces
```

## Getting Started

### Prerequisites

- Node.js 18+ with pnpm

### Installation

1. Clone the repository and install dependencies:

```bash
pnpm install
```

2. Start the development server:

```bash
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Landing Page

1. Visit the landing page to learn about MedLedger
2. Click "Connect Wallet" to initialize your session
3. You'll be assigned a mock wallet address

### Upload Records

1. Navigate to "Upload Record" from the dashboard
2. Select a file (PDF, DOCX, etc.)
3. Add a description of the record
4. Submit to store on the blockchain
5. The system generates a SHA-256 hash automatically

### Manage Access

1. Go to "My Records"
2. Click "Grant Access" on a record
3. Enter a doctor's wallet address
4. Access is logged and visible in "Access Logs"

### Verify Records

1. Navigate to "Verify Record"
2. Upload the original file
3. Paste the hash from the blockchain
4. The system verifies if the file matches the stored hash

### Access Logs

1. View all access history in "Access Logs"
2. Filter by record ID or doctor name
3. See when and who accessed your records

## Color System

The app uses a professional healthcare color palette:

- **Primary**: Blue (#2563EB / hsl(217, 92%, 51%))
- **Neutral**: Soft grays for backgrounds
- **White**: Clean card backgrounds
- **Dark Mode**: Automatic support with next-themes

## How It Works

### Mock Blockchain

This is a hackathon-ready prototype that simulates blockchain interactions using localStorage:

- Records are stored in `localStorage` with key `medledger_records`
- Access logs are stored with key `medledger_access_logs`
- Wallet state is stored with key `medledger_wallet_state`

### File Hashing

The app uses the Web Crypto API (SubtleCrypto) for SHA-256 hashing:

- Files are hashed client-side using the browser's native Web Crypto API
- No external dependencies or server calls required
- Hashes are displayed in full and shortened formats

### Context Providers

- **Web3Context**: Manages wallet connection and state
- **RecordsContext**: Manages records and access logs

## Development

### Adding New Features

1. Create new pages in the appropriate `/app` directory
2. Use the existing contexts for state management
3. Follow the component structure and styling patterns

### Styling

All styles are done with Tailwind CSS using semantic design tokens defined in `globals.css`. Use the CSS variables instead of hardcoded colors:

```tsx
<div className="bg-background text-foreground">
  <Button className="bg-primary text-primary-foreground">Primary Button</Button>
</div>
```

### Form Validation

Use react-hook-form with zod schemas:

```tsx
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
});

export function MyForm() {
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(schema),
  });
  // ...
}
```

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

Requires support for Web Crypto API (SHA-256)

## Limitations

This is a prototype/hackathon version with the following limitations:

- No actual blockchain integration (uses localStorage)
- No real wallet connection (mock implementation)
- Data is stored locally and lost on cache clear
- Single-browser only (not shared across devices)

## Future Enhancements

- Actual blockchain integration (Ethereum mainnet/testnet)
- Real wallet connection (MetaMask, WalletConnect)
- IPFS integration for file storage
- Smart contract deployment
- Multi-wallet support
- Role-based access control (Patient/Doctor/Hospital)
- Record sharing with expiration dates
- Audit trails with timestamps
- File encryption

## License

MIT

## Support

For issues or questions, please create a GitHub issue or contact the development team.
