import { getToken } from "../../../utils/keyChain"
import appDataFlux from "../../../utils/getappData";

class appMethodService {

    constructor() {
        this.backurl = process.env.BACKEND_URL_DEV || 'https://backend.ongrid.run/'
        this.appData = new appDataFlux();
    }
    async startApp() {
        try {
            const jwt = await getToken();
            const deployData = await this.appData.getAppData()

            const ip = await this.appData.getAppips(deployData.composeName)
            const response = await fetch(`${this.backurl}app/start?composeName=${deployData.composeName}&ip=${ip}`, {
                method: "GET",
                headers: {
                    "Accept": "*/*",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                }
            });
            if (response.status === 409) {
                return { status: 'error', error: 'App already started or in conflict' };
            }
            if (response.status === 404) {
                return { status: 'error', error: 'Unable to start instance' };
            }
            if (!response.ok) {
                const text = await response.text();
                return { status: 'error', error: text };
            }
            const data = await response.json();
            console.log(data);
            return;
        } catch (error) {
            return { status: 'error', error: error.message };
        }
    }
    async restartApp() {
        try {
            const jwt = await getToken();
            const deployData = await this.appData.getAppData()
            const ip = await this.appData.getAppips(deployData.composeName)

            const response = await fetch(`${this.backurl}app/restart?composeName=${deployData.composeName}&ip=${ip}`, {
                method: "GET",
                headers: {
                    "Accept": "*/*",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                }
            });

            if (response.status === 409) {
                return { status: 'error', error: 'App already restarting or in conflict' };
            }
            if (response.status === 404) {
                return { status: 'error', error: 'Unable to restart instance' };
            }
            if (!response.ok) {
                const text = await response.text();
                return { status: 'error', error: text };
            }
            const data = await response.json();
            console.log(data);
            return;
        } catch (error) {
            return { status: 'error' };
        }
    }
    async pauseApp() {
        try {
            const jwt = await getToken();
            const deployData = await this.appData.getAppData()
    
            
            const ip = await this.appData.getAppips(deployData.composeName)
            const response = await fetch(`${this.backurl}app/pause?composeName=${deployData.composeName}&ip=${ip}`, {
                method: "GET",
                headers: {
                    "Accept": "*/*",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                }
            });
            if (response.status === 409) {
                return { status: 'error', error: 'App already paused' };
            }
            if (response.status === 404) {
                return { status: 'error', error: 'Unable to pause instance' };
            }
            if (!response.ok) {
                const text = await response.text();
                return { status: 'error', error: text };
            }
            const data = await response.json();
            console.log(data);
            return;
        } catch (error) {
            return { status: 'error'};
        }
    }
    async unPauseApp() {
        try {
            const jwt = await getToken();
            const deployData = await this.appData.getAppData()
            const ip = await this.appData.getAppips(deployData.composeName)
            const response = await fetch(`${this.backurl}app/unpause?composeName=${deployData.composeName}&ip=${ip}`, {
                method: "GET",
                headers: {
                    "Accept": "*/*",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                }
            });
            if (response.status === 409) {
                return { status: 'error', error: 'App already unpaused or in conflict' };
            }
            if (response.status === 404) {
                return { status: 'error', error: 'Unable to unpause instance' };
            }
            const data = await response.json();
            console.log(data);
            return;
        } catch (error) {
            return { status: 'error', error: error.message };
        }
    }
    async gSoftReDeploy() {
        try {
            const jwt = await getToken();
            const deployData = await this.appData.getAppData()
            const response = await fetch(`${this.backurl}app/gsoft/?composeName=${deployData.composeName}`, {
                method: "GET",
                headers: {
                    "Accept": "*/*",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                }
            });
            if (response.status === 404) {
                return { status: 'error', error: 'Unable to perform soft redeploy' };
            }
            const data = await response.json();
            console.log(data);
            return;
        } catch (error) {
            return { status: 'error' };
        }
    }
}


export default appMethodService;

