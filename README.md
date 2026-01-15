<p align="center">
    <img src="https://imagedelivery.net/EXhaUxjEp-0lLrNJjhM2AA/d4e80dd3-61e5-4b44-2495-c2594875dc00/public" height="96" />
</p>

# Grid CLI

Deploy databases on decentralized infrastructure.

<p align="center">
  <a href="https://documentation.ongrid.run"><strong>Documentation</strong></a> ·
  <a href="https://documentation.ongrid.run/build-deploy/grid-cli"><strong>CLI Guide</strong></a>
</p>
<br/>

## Installation

```bash
npm i -g cli-grid
```
```bash
pnpm i -g cli-grid
```
```bash
yarn global add cli-grid
```

## Quick Start

```bash
# 1. Login with your Akash mnemonic
grid login your twelve word mnemonic phrase here

# 2. Generate JWT for provider communication
grid jwt

# 3. Create a PostgreSQL database
grid create postgres --starter

# 4. List your databases
grid database ls
```

## Commands

### login

Store your Akash mnemonic securely in your system keychain.

```bash
grid login <mnemonic words...>
```

**Example:**
```bash
grid login word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12
```

### database

Manage your databases.

```bash
grid database [id]              Get database details by ID
grid database ls                List all databases
grid database delete <id>       Delete database by ID
grid database delete failed     Delete all failed databases
grid database refund <id>       Refund and close database deployment
grid database bids <dseq>       List bids for a database
```

### create postgres

Create a PostgreSQL database on Akash.

```bash
grid create postgres [options]
```

#### Resource Tiers
```bash
--starter       0.5 CPU, 1GB RAM, 5GB storage (~$0.89/month)
--standard      1 CPU, 2GB RAM, 10GB storage (~$1.79/month)
--pro           2 CPU, 4GB RAM, 20GB storage (~$3.39/month)
--production    2 CPU, 8GB RAM, 40GB storage (~$4.19/month)
```

#### PostgreSQL Options
```bash
--version <version>        PostgreSQL version: 14, 15, 16, 17 (default: 16)
--pgbouncer                Enable pgBouncer connection pooler
--pgbouncer-port <port>    PgBouncer port (default: 6432)
--s3-backup                Enable S3 backups
--s3-access-key <key>      AWS Access Key ID
--s3-secret-key <key>      AWS Secret Access Key
--s3-bucket <bucket>       S3 bucket name
--s3-region <region>       S3 region (default: us-east-2)
--backup-schedule <cron>   Backup cron schedule (default: "0 5 * * *")
-y, --yes                  Auto-select first provider
```

#### Examples
```bash
# Create with starter tier (interactive prompts)
grid create postgres --starter

# Create production tier with pgBouncer
grid create postgres --production --pgbouncer

# Create with S3 backups
grid create postgres --standard --s3-backup \
  --s3-access-key AKIAIOSFODNN7EXAMPLE \
  --s3-secret-key wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  --s3-bucket my-db-backups
```

### logs

Stream container logs from your database deployments.

```bash
grid logs <dseq> [service] [providerUri]
```

#### Options
```bash
-g, --gseq <gseq>       Group sequence (default: 1)
-o, --oseq <oseq>       Order sequence (default: 1)
-t, --tail <lines>      Number of lines to show (default: 100)
-f, --follow            Follow log output (default: true)
--no-follow             Show logs and exit
```

#### Available Services
```bash
postgres      PostgreSQL database logs
pgbouncer     PgBouncer connection pooler logs
s3backup      S3 backup service logs
```

### shell

Connect to container shell or execute commands.

```bash
grid shell <dseq>                           Connect to deployment
grid shell                                  Reconnect with saved config
grid shell -c <command>                     Execute single command
grid shell <dseq> <password> --psql         Connect directly to PostgreSQL
```

#### Options
```bash
--psql               Connect directly to PostgreSQL (requires psql client installed)
-u, --user <user>    Database user (default: admin)
-d, --database <db>  Database name (default: mydb)
```

#### Examples
```bash
# Connect directly to PostgreSQL database
grid shell 12345 mypassword --psql

# Connect with custom user/database
grid shell 12345 mypassword --psql -u postgres -d production

# Execute command in container shell
grid shell -c "ls -la"
```

### jwt

Manage JWT for secure provider communication. JWT is auto-generated when needed.

```bash
grid jwt                    Generate new JWT
grid jwt -s, --status       Check JWT status
grid jwt -r, --regenerate   Force regenerate JWT
```

## Documentation

For more details, check out our [documentation](https://documentation.ongrid.run).

## Reference

- [Code of Conduct](./.github/CODE_OF_CONDUCT.md)
- [Contributing Guidelines](./.github/CONTRIBUTING.md)
- [Apache 2.0 License](./LICENSE)
