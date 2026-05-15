// api.js
const API = (() => {
    // Configuration
    // Update this to your deployed Vercel domain once available
    const VERCEL_BASE_URL = 'https://your-vercel-project-name.vercel.app';
    const LOCAL_PROXY_URL = 'http://localhost:3001';

    /**
     * Intelligent Environment Routing
     * Determines the correct base URL depending on where the widget is hosted.
     */
    function getBaseUrl() {
        const hostname = window.location.hostname;
        const isLocalZet = hostname === '127.0.0.1' || hostname === 'localhost';

        if (isLocalZet) {
            // Local ZET testing: Route through the local proxy to bypass CORS
            return LOCAL_PROXY_URL;
        } else {
            // Production/Zoho Sandbox: Route through the deployed Vercel serverless functions
            return VERCEL_BASE_URL;
        }
    }

    /**
     * Constructs the final URL based on the environment.
     * @param {string} endpoint - The Vercel endpoint (e.g., '/api/fetch_dancer')
     * @param {string} originalZohoUrl - The original Zoho URL for the local proxy query parameter
     */
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
            // The local proxy needs the direct Zoho API URL
            const zohoUrl = `https://www.zohoapis.ca/creator/custom/dean_ca/fetch_dancer_details?publickey=y54WKSexXFZv561bwQ0uTmXVa&parentCode=${encodeURIComponent(parentCode)}`;
            
            const finalUrl = buildUrl(endpoint, zohoUrl);

            const response = await fetch(finalUrl);
            return await response.json();
        },

        /**
         * Submit parent registration payload.
         * @param {Object} payload 
         * @returns {Promise<any>}
         */
        submitRegistration: async function(payload) {
            const endpoint = `/api/submit_registration`;
            const zohoUrl = `https://www.zohoapis.ca/creator/custom/dean_ca/submit_parent_registration?publickey=BJgxx2dUj0wYfOffS4XG4kU67`;
            
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
