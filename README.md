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
The `deploy` command is used to launch a new application deployment to the cloud provider of your choice using either public or private container images.
```bash                            
grid deploy [provider] [config-path]    Start a new deployment on Grid.  
                                        For more information, see the [documentation](https://documentation.ongrid.run/build-deploy/grid-cli/commands/deploy). 
```
### provider
```bash
flux                                    Deploy your container image to Flux.             
akash                                   Deploy your container image to Akash.
```
### App methods
The `app` command is used to  manage container instances on flux.
```bash                            
grid app [method]   
                                        For more information, see the [documentation](https://documentation.ongrid.run/build-deploy/grid-cli/commands/appMethods). 
```
### method
```bash
restart                            Restarts a specific instance.            
pause                              Temporarily stops a specific instance without terminating it.
start                              Starts a specific instance that is currently stopped.
unpause                            Resumes a paused instance.
gsoft                              Reinstalls your applications on all instances from your container repo.
```




## Documentation

For details on how to use Grid, check out our [documentation](https://documentation.ongrid.run).



## Reference

- [Code of Conduct](./.github/CODE_OF_CONDUCT.md)
- [Contributing Guidelines](./.github/CONTRIBUTING.md)
- [Apache 2.0 License](./LICENSE)
