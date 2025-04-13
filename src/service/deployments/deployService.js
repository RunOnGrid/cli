export const deployFlux = async(jwt, config) =>{
    try {
        const response = await fetch("https://backend-alpha.ongrid.run/flux",{
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwt}`,
            },
            body: JSON.stringify(config)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

    } catch (error) {
        console.error("Error details:", error.message);
        throw error;
    }
}

export const deployAkash = async(jwt, config) =>{
    try {
        const response = await fetch("https://backend-alpha.ongrid.run/akash",{
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-type": "application/json",
                Authorization: `Bearer ${jwt}`,
            }
            
        })
    } catch (error) {
        
    }
}