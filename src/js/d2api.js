const dhisDevConfig = DHIS_CONFIG;  
const isDev = "baseUrl" in dhisDevConfig;
const baseUrl = isDev ? dhisDevConfig.baseUrl : "../../..";

// Helper function to set headers for development mode
const getHeaders = () => {
    let headers = new Headers();
    if (isDev && dhisDevConfig.authorization) {
        headers.set("Authorization", dhisDevConfig.authorization);
    }
    return headers;
};

// Helper function to standardize endpoint format
const formatEndpoint = (endpoint) => {
    // Remove any leading slashes
    if (endpoint.startsWith("/")) {
        endpoint = endpoint.slice(1);
    }

    // Remove any leading 'api/'
    if (endpoint.startsWith("api/")) {
        endpoint = endpoint.slice(4);
    }

    // Ensure the final format is /api/...
    return `/api/${endpoint}`;
};

// Helper function to validate endpoint UID (11 characters, alphanumeric)
const validateUID = (endpoint) => {
    const path = endpoint.split(/[?#]/)[0];
    const uid = path.split("/").pop();
    return /^[A-Za-z0-9]{11}$/.test(uid);
};


// Helper function to handle API errors and throw detailed error messages
const handleApiError = async (response) => {
    let errorMessage = "Network response was not ok";
    try {
        const errorDetail = await response.json();
        errorMessage = errorDetail.message || errorMessage;
    } catch {
        errorMessage = response.statusText || errorMessage;
    }
    throw new Error(`${response.status} ${response.statusText} - ${errorMessage}`);
};

// GET from API async
export const d2Get = async (endpoint) => {
    try {
        endpoint = formatEndpoint(endpoint);
        let headers = getHeaders();
        let response = await fetch(baseUrl + endpoint, {
            method: "GET",
            headers: headers
        });
        if (!response.ok) {
            await handleApiError(response); // Handle the error response
        }
        let data = await response.json();
        return data;
    } catch (error) {
        console.log("ERROR in GET:");
        console.log(error);
        throw error;
    }
};

// POST to API async
export const d2PostJson = async (endpoint, body) => {
    try {
        endpoint = formatEndpoint(endpoint);
        let headers = getHeaders();
        headers.set("Content-Type", "application/json");
        let response = await fetch(baseUrl + endpoint, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            await handleApiError(response); // Handle the error response
        }
        let data = await response.json();
        return data;
    } catch (error) {
        console.log("ERROR in POST:");
        console.log(error);
        throw error;
    }
};

// PUT to API async
export const d2PutJson = async (endpoint, body) => {
    try {
        endpoint = formatEndpoint(endpoint);

        if (!validateUID(endpoint)) {
            console.warn("Warning: The endpoint does not end with a valid 11-character UID");
        }

        let headers = getHeaders();
        headers.set("Content-Type", "application/json");
        let response = await fetch(baseUrl + endpoint, {
            method: "PUT",
            headers: headers,
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            await handleApiError(response); // Handle the error response
        }
        let data = await response.json();
        return data;
    } catch (error) {
        console.log("ERROR in PUT:");
        console.log(error);
        throw error;
    }
};

// DELETE from API async
export const d2Delete = async (endpoint) => {
    try {
        endpoint = formatEndpoint(endpoint);

        if (!validateUID(endpoint)) {
            console.warn("Warning: The endpoint does not end with a valid 11-character UID");
        }

        let headers = getHeaders();
        let response = await fetch(baseUrl + endpoint, {
            method: "DELETE",
            headers: headers
        });
        if (!response.ok) {
            await handleApiError(response); // Handle the error response
        }
        return { status: "success" };
    } catch (error) {
        console.log("ERROR in DELETE:");
        console.log(error);
        throw error;
    }
};

// Perform a POST (optionally with a JSON body), then poll an endpoint with GET
// until it returns a non-empty response. Polls the POST endpoint itself unless
// a separate getEndpoint is given. Rejects if nothing arrives within maxTries.
// Used primarily with the data integrity checks API.
export const d2PostThenGet = async (endpoint, body = null, getEndpoint = null, maxTries = 10, intervalMs = 1000) => {
    try {
        const postEndpoint = formatEndpoint(endpoint);
        const pollEndpoint = formatEndpoint(getEndpoint || endpoint);

        let headers = getHeaders();
        const options = { method: "POST", headers: headers };
        if (body !== null) {
            headers.set("Content-Type", "application/json");
            options.body = JSON.stringify(body);
        }
        const postResponse = await fetch(baseUrl + postEndpoint, options);
        if (!postResponse.ok) {
            await handleApiError(postResponse);
        }

        for (let tries = 0; tries < maxTries; tries++) {
            const getResponse = await fetch(baseUrl + pollEndpoint, {
                method: "GET",
                headers: getHeaders()
            });
            if (!getResponse.ok) {
                await handleApiError(getResponse);
            }
            const data = await getResponse.json();
            if (Object.keys(data).length > 0) {
                return data;
            }
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
        throw new Error(`Timed out waiting for a response from ${pollEndpoint}`);
    } catch (error) {
        console.log("ERROR in POST-then-GET:");
        console.log(error);
        throw error;
    }
};
