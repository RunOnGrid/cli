<p align="center">
    <img src="https://imagedelivery.net/EXhaUxjEp-0lLrNJjhM2AA/d4e80dd3-61e5-4b44-2495-c2594875dc00/public" height="96" />
</p>

# Grid

Build. Connect. Deploy.

<p align="center">
  <a href="https://documentation.ongrid.run"><strong>Documentation</strong></a> ·
  <a href="https://documentation.ongrid.run/build-deploy/grid-cli"><strong>CLI</strong></a>
</p>
<br/>

## Grid

Grid Platform provides the developer access to decentralized infrastructure to build, scale, and secure faster deployments.

## How to install

Otherwise

```bash
npm i -g cli-grid
```
```bash
pnpm i -g cli-grid
```
```bash
yarn global add cli-grid
```
## Supported commands and options

### Usage

To display all supported commands and options -

```bash
grid help
```

### Available Commands


### login
The `login` command is used to access your Grid account. This command will store your access token in your system keychain.
```bash
grid login [options]
```                        
### Options
```bash
github
google
```  
### Logout
The `logout` command is used to logout your Grid account. This command will delete your access token from your system keychain.
```bash
grid logout 
```
## stripe
The `stripe` command launches a Stripe Checkout session to purchase credits for your Grid account.
```bash                                 
grid stripe
```

## git
The `git` command is used to manage GitHub repositories for Grid deployments. It enables connecting your account to the Grid GitHub App and supports building container images via GitHub Actions.
```bash                                 
grid git [options]
```

### options
```bash
connect                                 Connect your GitHub account to the Grid GitHub App.
repos                                   List available repositories linked to your account.
build                                   Select a repository and build it into a runnable container image.
```

### deployment
The `deployment` command is used to manage Grid deployments.
```bash                                 
grid deployment [options]
```
### options
```bash
list                                    List available deployments in your account.
id [deployment-id]                      List deployment by id.
delete [deployment-id]                  Delete deploymeny by id.
refund [deployment-id]                  Refund an akash deployment. For more information [documentation](https://documentation.ongrid.run/build-deploy/payments/akash)  
```
### deploy
The `deploy` command is used to launch database deployments on Akash.

```bash
grid deploy postgres                    Deploy PostgreSQL with optional integrations
```

#### Resource Tiers
```bash
--starter                  0.5 CPU, 1GB RAM, 5GB storage (~$0.89/month)
--standard                 1 CPU, 2GB RAM, 10GB storage (~$1.79/month)
--pro                      2 CPU, 4GB RAM, 20GB storage (~$3.39/month)
--production               2 CPU, 8GB RAM, 40GB storage (~$4.19/month)
```

#### PostgreSQL Options
```bash
--version <version>        PostgreSQL version 14, 15, 16, 17 (default: 16)
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
# Deploy with starter tier (interactive prompts)
grid deploy postgres --starter

# Deploy production tier with pgBouncer
grid deploy postgres --production --pgbouncer

# Deploy with S3 backups
grid deploy postgres --standard --s3-backup \
  --s3-access-key AKIAIOSFODNN7EXAMPLE \
  --s3-secret-key wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  --s3-bucket my-db-backups
```

### logs
Stream container logs from Akash deployments.
```bash
grid logs <dseq> [service] [providerUri]
```

#### Options
```bash
-g, --gseq <gseq>          Group sequence (default: 1)
-o, --oseq <oseq>          Order sequence (default: 1)
-t, --tail <lines>         Number of lines to show (default: 100)
-f, --follow               Follow log output (default: true)
--no-follow                Show logs and exit
```

#### Available Services
```bash
postgres                   PostgreSQL database logs
pgbouncer                  PgBouncer connection pooler logs
s3backup                   S3 backup service logs
```

### shell
Connect to container shell or execute commands.
```bash
grid shell <dseq> <service> <providerUri>   Configure connection
grid shell -c <command>                     Execute command
```

#### Options
```bash
-g, --gseq <gseq>          Group sequence (default: 1)
-o, --oseq <oseq>          Order sequence (default: 1)
-c, --command <command>    Command to execute
```

#### Examples
```bash
# Configure shell connection
grid shell 12345 postgres provider.akash-palmito.org

# Execute psql command
grid shell -c "psql -U admin -d mydb"

# Run SQL query
grid shell -c "psql -U admin -d mydb -c 'SELECT * FROM users;'"
```




## Documentation

For details on how to use Grid, check out our [documentation](https://documentation.ongrid.run).



## Reference

- [Code of Conduct](./.github/CODE_OF_CONDUCT.md)
- [Contributing Guidelines](./.github/CONTRIBUTING.md)
- [Apache 2.0 License](./LICENSE)
