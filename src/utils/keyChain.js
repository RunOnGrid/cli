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


export async function saveTarget(target,token) {
    await savePassword(target, token);
}

export async function getTarget(target) {
    return await getPassword(target);
}

export async function deleteTarget(target) {
    return await deletePassword(target);
}
