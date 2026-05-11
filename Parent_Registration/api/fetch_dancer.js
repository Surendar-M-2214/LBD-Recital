export default async function handler(req, res) {
    // Enable CORS for the frontend
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { parentCode, lastName } = req.query;

    if (!parentCode || !lastName) {
        return res.status(400).json({ error: 'Missing parentCode or lastName' });
    }

    const fetchUrl = `https://www.zohoapis.ca/creator/custom/dean_ca/fetch_dancer_details?publickey=y54WKSexXFZv561bwQ0uTmXVa&parentCode=${encodeURIComponent(parentCode)}&lastName=${encodeURIComponent(lastName)}`;

    try {
        const response = await fetch(fetchUrl);
        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching dancer details:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
