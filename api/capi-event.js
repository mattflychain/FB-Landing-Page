const crypto = require('crypto');

// ─── CONFIG ───────────────────────────────────────────────────
const PIXEL_ID = '897644829617517';
const ACCESS_TOKEN = 'EAAZC3ZAY3X3qABQzeLOAdlptJNoeCeNGzgh3MuixBUcQbxC9ctzCsrRTxOuNrIZAFyL1n2TSZC6YHQXm0ZCkcJrK2QAP3vfCW1cjolx0HQsEYVkFQDLjsAndmWcOaNzkmDc05eHI8q3EbBZBD0SfbzV5o0OI9UOZCeh22VTJFxakbaOt9FA01p9bMxejdRcrAZDZD';
const GRAPH_API_VERSION = 'v21.0';

/**
 * Vercel Serverless Function — Meta Conversions API
 * Receives lead data from the form and sends it server-side to Meta.
 */
module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const {
            email,
            phone,
            firstName,
            lastName,
            specialty,
            pain,
            revenue,
            eventId,
            sourceUrl,
            fbp,
            fbc
        } = req.body;

        // Hash user data using SHA-256 (required by Meta CAPI)
        const hash = (val) => {
            if (!val) return undefined;
            return crypto.createHash('sha256').update(val.trim().toLowerCase()).digest('hex');
        };

        // Strip phone to digits only before hashing
        const cleanPhone = phone ? phone.replace(/\D/g, '') : '';

        const eventData = {
            data: [
                {
                    event_name: 'Lead',
                    event_time: Math.floor(Date.now() / 1000),
                    event_id: eventId, // Used for deduplication with browser pixel
                    action_source: 'website',
                    event_source_url: sourceUrl || 'https://flychain.us',
                    user_data: {
                        em: hash(email) ? [hash(email)] : undefined,
                        ph: hash(cleanPhone) ? [hash(cleanPhone)] : undefined,
                        fn: hash(firstName) ? [hash(firstName)] : undefined,
                        ln: hash(lastName) ? [hash(lastName)] : undefined,
                        client_user_agent: req.headers['user-agent'],
                        fbp: fbp || undefined,
                        fbc: fbc || undefined
                    },
                    custom_data: {
                        content_name: 'Quiz Form Completed',
                        content_category: specialty || '',
                        pain_point: pain || '',
                        revenue_tier: revenue || ''
                    }
                }
            ],
            // Test mode — remove this line when going live with real ads
            // test_event_code: 'TEST67378'
        };

        // Send to Meta Conversions API
        const response = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData)
            }
        );

        const result = await response.json();

        if (!response.ok) {
            console.error('Meta CAPI Error:', result);
            return res.status(500).json({ error: 'Meta CAPI request failed', details: result });
        }

        return res.status(200).json({ success: true, events_received: result.events_received });
    } catch (error) {
        console.error('CAPI endpoint error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
