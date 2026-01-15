# Grid CLI - Technical Documentation

## Overview

**Grid CLI** is a command-line tool for deploying and managing PostgreSQL databases on the Akash decentralized cloud. Built with Node.js using Commander.js, it integrates with the Akash blockchain via CosmJS and Akash Chain SDK.

**Package**: `cli-grid` | **Version**: 3.0.0 | **Command**: `grid`

---

## Project Structure

```
src/
├── bin/
│   └── index.js              # Entry point (shebang: #!/usr/bin/env tsx)
├── cli.js                    # Command router (Commander.js)
├── commands/
│   ├── database/             # Database management commands
│   ├── deploy/               # PostgreSQL deployment
│   ├── jwt/                  # JWT token management
│   ├── login/                # Mnemonic authentication
│   ├── logout/               # Logout (disabled)
│   ├── logs/                 # Log streaming
│   └── shell/                # Container shell access
├── service/
│   ├── Websockets/           # WebSocket client for shell/logs
│   ├── database/             # Database blockchain queries
│   ├── deployments/          # Deployment management
│   └── validateMnemonic.js   # BIP39 mnemonic validation
├── helpers/
│   ├── akashHelper.js        # Time/cost calculations
│   └── sdlBuilder.js         # SDL manifest generation
├── utils/
│   └── keyChain.js           # Secure credential storage (OS keychain)
└── public/
    └── grid-logo.png         # Branding asset
```

---

## Commands

### `grid login <words...>`

Stores the user's Akash mnemonic securely in the OS keychain.

**Flow**:
1. Accepts 12 or 24-word mnemonic as arguments
2. Validates using `bip39.validateMnemonic()`
3. Stores in OS keychain via `keytar`

**File**: `src/commands/login/login.js`

---

### `grid jwt [options]`

Manages JWT tokens for provider authentication.

| Option | Description |
|--------|-------------|
| `-s, --status` | Check JWT status and expiration |
| `-r, --regenerate` | Force regenerate JWT |

**Flow**:
1. Derives wallet from stored mnemonic using `Secp256k1HdWallet`
2. Generates JWT with `JwtTokenManager` (1-hour expiry)
3. Auto-regenerates when < 5 minutes remaining

**File**: `src/commands/jwt/jwt.js`

---

### `grid create postgres [options]`

Deploys a PostgreSQL database on Akash.

**Resource Tiers**:

| Tier | CPU | RAM | Storage | Est. Cost |
|------|-----|-----|---------|-----------|
| starter | 0.5 | 1GB | 5GB | $0.89/mo |
| standard | 1 | 2GB | 10GB | $1.79/mo |
| pro | 2 | 4GB | 20GB | $3.39/mo |
| production | 2 | 8GB | 40GB | $4.19/mo |

**Options**:

| Option | Description |
|--------|-------------|
| `--version <v>` | PostgreSQL version (14, 15, 16, 17) |
| `--pgbouncer` | Enable PgBouncer connection pooler |
| `--pgbouncer-port <port>` | PgBouncer port (default: 6432) |
| `--s3-backup` | Enable S3 automated backups |
| `--s3-access-key` | AWS access key |
| `--s3-secret-key` | AWS secret key |
| `--s3-bucket` | S3 bucket name |
| `--s3-region` | S3 region |
| `--backup-schedule <cron>` | Backup schedule (default: "0 5 * * *") |
| `-y, --yes` | Auto-select first provider |

**Deployment Flow**:
1. **Configure**: Prompt for tier, password, options
2. **Build SDL**: Generate YAML manifest via `sdlBuilder.buildPostgresSDL()`
3. **Submit**: Create deployment on blockchain with 500,000 uAKT deposit
4. **Bid**: Poll for provider bids (max 12 attempts, 5s intervals)
5. **Select**: User chooses provider (sorted by uptime, min 98%)
6. **Lease**: Create lease with selected provider
7. **Deploy**: Send manifest to provider via HTTPS with JWT auth

**Default Credentials**: `admin` / `mydb` / port `5432`

**File**: `src/commands/deploy/deploy.js`

---

### `grid database [subcommand]`

Manages deployed databases.

| Subcommand | Description |
|------------|-------------|
| `grid database` | List all active databases |
| `grid database <id>` | Show details for specific database |
| `grid database ls` | List all databases with details |
| `grid database delete <id>` | Close deployment, return funds |
| `grid database delete failed` | Delete all failed deployments |
| `grid database refund <id>` | Close and refund deployment |
| `grid database bids <dseq>` | List bids for deployment |

**File**: `src/commands/database/database.js`

---

### `grid logs <dseq> [service] [providerUri]`

Streams real-time container logs.

| Argument | Description |
|----------|-------------|
| `dseq` | Deployment sequence number |
| `service` | Service name (postgres, pgbouncer, s3backup) |
| `providerUri` | Provider hostname (optional) |

| Option | Description |
|--------|-------------|
| `-t, --tail <lines>` | Lines from end (default: 100) |
| `-f, --follow` | Stream continuously (default: true) |
| `--no-follow` | Show once and exit |

**Implementation**: WebSocket connection to `wss://provider:8443/lease/{dseq}/{gseq}/{oseq}/logs`

**File**: `src/commands/logs/logs.js`

---

### `grid shell <dseq> [password] [options]`

Connects to container shell or PostgreSQL directly.

**Modes**:

| Mode | Command | Description |
|------|---------|-------------|
| Interactive | `grid shell <dseq>` | Full terminal session |
| Single command | `grid shell -c "<cmd>"` | Execute and exit |
| PostgreSQL | `grid shell <dseq> <pass> --psql` | Direct psql connection |

| Option | Description |
|--------|-------------|
| `-c, --command <cmd>` | Execute single command |
| `--psql` | Connect directly to PostgreSQL |
| `-u, --user <user>` | DB user (default: admin) |
| `-d, --database <db>` | Database name (default: mydb) |

**Terminal Controls**:
- `Ctrl+C` - Send interrupt
- `Ctrl+D` - Exit shell
- `Ctrl+V` - Paste from clipboard

**File**: `src/commands/shell/shell.js`

---

## Services

### DatabaseManager (`src/service/database/databaseAdmin.js`)

Core service for blockchain interactions.

**Methods**:
- `initChainSdk()` - Initialize blockchain connection
- `getAllDatabases()` - Query all active deployments
- `getDatabaseById(id)` - Get specific deployment
- `deleteDatabase(id)` - Close deployment
- `refundDatabase(id)` - Close and refund
- `getProviderUriFromLease()` - Find hosting provider
- `getLeaseStatus()` - Query provider for lease info

---

### WebSocketClient (`src/service/Websockets/websocketsService.js`)

Handles shell and log streaming.

**Channel Protocol** (Akash shell):
```javascript
STDIN: 104    // User input
STDOUT: 100   // Container output
STDERR: 101   // Container errors
RESULT: 102   // Command completion
FAILURE: 103  // Command failure
RESIZE: 105   // Terminal resize
```

**Methods**:
- `startInteractiveShell()` - Full terminal session
- `executeCommand()` - Single command execution
- `sendStdinData()` - Send user input
- `sendResize()` - Send terminal dimensions

---

### SDL Builder (`src/helpers/sdlBuilder.js`)

Generates Akash deployment manifests.

**Function**: `buildPostgresSDL(params)`

**Generated Services**:
1. **postgres** - Main PostgreSQL container
2. **pgbouncer** (optional) - Connection pooler
3. **s3backup** (optional) - Automated backups

**Output**: YAML string for Akash deployment

---

### KeyChain (`src/utils/keyChain.js`)

Secure credential storage using OS keychain.

**Stored Keys**:
- `mnemonic` - Akash recovery phrase
- `jwt` - Current JWT token (auto-managed)
- `shell_config` - Saved shell configuration

**JWT Management**:
- Auto-generates when missing/expired
- 5-minute buffer before expiration triggers regeneration
- Validates format and expiration

---

### Akash Helper (`src/helpers/akashHelper.js`)

Calculates deployment metrics.

**Functions**:
- `calculateDeploymentMetrics()` - Full metrics (deposit, spent, remaining, expiration)
- `calculateTimeLeft()` - Human-readable time remaining

**Constants**:
- Block time: 6.098 seconds
- Denom: uakt (1 AKT = 1,000,000 uakt)

---

## Data Flow

```
User Input
    ↓
Command Handler (src/commands/)
    ↓
Service Layer (src/service/)
    ├── DatabaseManager → Akash Blockchain
    ├── WebSocketClient → Provider WebSocket
    └── KeyChain → OS Keychain
    ↓
Helper Layer (src/helpers/)
    ├── sdlBuilder → YAML Manifest
    └── akashHelper → Calculations
    ↓
External Systems
    ├── Akash RPC: https://rpc.akashnet.net:443
    ├── Akash gRPC: https://akash-grpc.publicnode.com/
    ├── Provider API: https://console-api.akash.network/v1/providers
    └── Provider: wss://{provider}:8443/lease/...
```

---

## Deployment Flow Diagram

```
1. LOGIN
   grid login <mnemonic>
        ↓
   Validate (bip39) → Store in OS Keychain

2. CREATE DEPLOYMENT
   grid create postgres
        ↓
   Build SDL → Submit to Blockchain → Poll Bids → Select Provider → Create Lease → Send Manifest

3. MONITOR
   grid database ls     → Query blockchain + provider status
   grid logs <dseq>     → WebSocket log stream
   grid shell <dseq>    → WebSocket interactive shell

4. CLEANUP
   grid database delete <dseq>
        ↓
   Close deployment → Refund remaining funds
```

---

## Configuration Constants

| Constant | Value |
|----------|-------|
| RPC Endpoint | `https://rpc.akashnet.net:443` |
| gRPC Endpoint | `https://akash-grpc.publicnode.com/` |
| Default Deposit | 500,000 uakt |
| Min Provider Uptime | 98% |
| Bid Poll Interval | 5 seconds |
| Max Bid Attempts | 12 |
| JWT Expiry | 1 hour |
| JWT Buffer | 5 minutes |
| WebSocket Timeout | 15 seconds |

---

## Usage Examples

```bash
# Login with mnemonic
grid login word1 word2 word3 ... word12

# Check JWT status
grid jwt -s

# Deploy PostgreSQL (interactive)
grid create postgres

# Deploy with options (non-interactive)
grid create postgres --production --pgbouncer --s3-backup \
  --s3-access-key AKIA... --s3-secret-key ... --s3-bucket backups -y

# List databases
grid database ls

# View logs
grid logs 23981433 postgres

# Interactive shell
grid shell 23981433

# Direct PostgreSQL connection
grid shell 23981433 mypassword --psql -u admin -d mydb

# Delete deployment
grid database delete 23981433
```

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @akashnetwork/chain-sdk | 1.0.0-alpha.17 | Blockchain SDK |
| commander | ^13.1.0 | CLI framework |
| keytar | ^7.9.0 | OS keychain |
| bip39 | ^3.1.0 | Mnemonic validation |
| ws | ^8.18.3 | WebSocket client |
| axios | ^1.9.0 | HTTP client |
| js-yaml | ^4.1.0 | YAML processing |
| @inquirer/prompts | ^7.9.0 | Interactive prompts |
| nanospinner | ^1.2.2 | Loading spinners |
| gradient-string | ^3.0.0 | Terminal colors |
