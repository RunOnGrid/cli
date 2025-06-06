import keytar from "keytar";

const SERVICE = "cligrid-cli";

export async function savePassword(account, password) {
    await keytar.setPassword(SERVICE, account, password);
}

export async function getPassword(account) {
    return await keytar.getPassword(SERVICE, account);
}

export async function deletePassword(account) {
    return await keytar.deletePassword(SERVICE, account);
}

// Funciones específicas para el token de autenticación (manteniendo compatibilidad)
export async function saveToken(token) {
    await savePassword("user", token);
}

export async function getToken() {
    return await getPassword("user");
}

export async function deleteToken() {
    return await deletePassword("user");
}