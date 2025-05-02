



export const deployAkash = async (jwt, config) => {
    try {
        const response = await fetch("https://backend-dev.ongrid.run/akash", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-type": "application/json",
                Authorization: `Bearer ${jwt}`,
            },
            body: yamlFile,
        })
    } catch (error) {

    }
}