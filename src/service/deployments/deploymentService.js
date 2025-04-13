export const getDeployments = async (jwt) => {
    try {
        const response = await fetch("https://backend-alpha.ongrid.run/deployments", {
            method: "GET",
            headers: {
                "Accept": "*/*",
                "Content-Type": "application/json",
                Authorization: `Bearer ${jwt}`,
            },
            
        });
        if (!response.ok) {
            throw new Error(`Error fetching repositories: ${response.statusText}`);
          }

        const data = await response.json();
        return data

    } catch (error) {
        console.error("Error fetching repositories:", error);
    }
}

export const getDeploymentById= async(jtw, id) =>{
    try {
        const response = await fetch(`https://backend-alpha.ongrid.run/deployments/${id}`, {
            method: "GET",
            headers: {
                "Accept": "*/*",
                "Content-Type": "application/json",
                Authorization: `Bearer ${jtw}`,
            },
            
        });
        if (!response.ok) {
            throw new Error(`Error fetching repositories: ${response.statusText}`);
          }

        const data = await response.json();
        console.log("Response:", data);
    } catch (error) {
        
    }
}