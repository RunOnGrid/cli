<p align="center">
  <a href="https://ongrid.run">
    <img src="src/public/grid-logo.png" height="96">
    <h3 align="center">Grid</h3>
  </a>
</p>

<p align="center">
  Build. Connect. Deploy.
</p>

<p align="center">
  <a href="https://documentation.ongrid.run"><strong>Documentation</strong></a> ·
  <a href="https://documentation.ongrid.run/build-deploy/grid-cli"><strong>CLI</strong></a>
</p>
<br/>

## Vercel

Grid Platform provides the developer access to decentralized infrastructure to build, scale, and secure faster deployments.

## How to install

Otherwise

```bash
npm i -g grid
```
```bash
pnpm i -g grid
```
```bash
yarn global add grid
```
## Supported commands and options

### Usage

To display all supported commands and options -

```bash
grid help
```

### Available Commands


##login
The `login` command is used to access your Grid account. This command will store your access token in your system keychain.
```
grid login [options]
```
```                                  
###options
```
--github
--google
```  
##Logout
The `logout` command is used to logout your Grid account. This command will delete your access token from your system keychain.
```
grid logout 
```  
## git
The `git` command is used to manage GitHub repositories for Grid deployments. It enables connecting your account to the Grid GitHub App and supports building container images via GitHub Actions.
```                                     
grid git [options]
```

###options
```
--connect           Connect your GitHub account to the Grid GitHub App.
--repos             List available repositories linked to your account.
--build             Select a repository and build it into a runnable container image.
```

## deployment
The `deploy` command is used to manage GitHub repositories for Grid deployments. It enables connecting your account to the Grid GitHub App and supports building container images via GitHub Actions.
```                                 
grid deployment [options]
```
    ###options
                            
  deploy [options] [config-path]                   Start a new deployment on Grid.
```

## Documentation

For details on how to use Vercel, check out our [documentation](https://documentation.ongrid.run).



## Reference

- [Code of Conduct](./.github/CODE_OF_CONDUCT.md)
- [Contributing Guidelines](./.github/CONTRIBUTING.md)
- [Apache 2.0 License](./LICENSE)
