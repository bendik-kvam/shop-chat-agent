const getCatalogJWT = async()=>{
    try{
const id = process.env.CATALOG_API_ID;
const key = process.env.CATALOG_API_KEY;
const url = process.env.ACCESS_TOKEN_URL;
const body = JSON.stringify({
    "client_id": id,
    "client_secret": key,
    "grant_type": "client_credentials",
})
const response = await fetch(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: body
});
const data = await response.json();
return data.access_token;
}catch(error){
    console.error("Error fetching Catalog JWT:", error);
    return null;
}
}

export {getCatalogJWT}