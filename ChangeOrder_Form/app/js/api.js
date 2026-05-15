// api.js
const API = (() => {
    // Configuration
    const VERCEL_BASE_URL = 'https://creato-api-plum.vercel.app';
    const LOCAL_PROXY_URL = 'http://localhost:3001';

    function getBaseUrl() {
        return VERCEL_BASE_URL; // Force routing through Vercel
    }

    function buildUrl(endpoint, originalZohoUrl) {
        const baseUrl = getBaseUrl();
        if (baseUrl === LOCAL_PROXY_URL) {
            return `${LOCAL_PROXY_URL}/?url=${encodeURIComponent(originalZohoUrl)}`;
        }
        return `${baseUrl}${endpoint}`;
    }

    return {
        /**
         * Fetch children details by parent code.
         * @param {string} parentCode
         * @returns {Promise<any>}
         */
        fetchDancer: async function(parentCode) {
            const endpoint = `/api/fetch_dancer?parentCode=${encodeURIComponent(parentCode)}`;
            const zohoUrl = `https://www.zohoapis.ca/creator/custom/dean_ca/fetch_dancer_details?publickey=y54WKSexXFZv561bwQ0uTmXVa&parentCode=${encodeURIComponent(parentCode)}`;
            
            const finalUrl = buildUrl(endpoint, zohoUrl);

            const response = await fetch(finalUrl);
            return await response.json();
        },

        /**
         * Submit change order registration payload.
         * @param {Object} payload 
         * @returns {Promise<any>}
         */
        submitChangeOrder: async function(payload) {
            const endpoint = `/api/submit_change_order`;
            // Zoho Custom API Endpoint
            const zohoUrl = `https://www.zohoapis.ca/creator/custom/dean_ca/submit_change_order?publickey=pakRMDhq36jsSz9USTfn64Ryn`;
            
            const finalUrl = buildUrl(endpoint, zohoUrl);

            const response = await fetch(finalUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    payload: JSON.stringify(payload)
                })
            });
            return await response.json();
        }
    };
})();
