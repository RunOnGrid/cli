


export const gridLogin = async (email, password) => {
    try {
        const response = await fetch("http://localhost:8087/auth/login", {
            method: "POST",
            headers: {
                "Accept": "*/*",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: email,
                password: password,
            }),
        });
        const data = await response.json();
        console.log("Response:", data);
        return data.token
    } catch (error) {
        console.error("Error:", error);
    }
}

// export const logInGoogle = async () => {
//     try {
//       const response = await fetch("https://backend-alpha.ongrid.run/oauth/google", {
//         method: "GET",
//         redirect: "manual", // <- Muy importante
//         headers: {
//           "Accept": "*/*"
//         }
//       });
  
//       if (response.status === 302) {
//         const redirectUrl = response.headers.get("location");
//         console.log("Opening browser to authenticate with Google...");
//         await open(redirectUrl);
//       } else {
//         console.error("Unexpected response:", response.status);
//       }
//     } catch (error) {
//       console.error("Error:", error);
//     }
//   };



