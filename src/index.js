const express = require('express');
const bodyParser = require('body-parser');
const Redis = require('ioredis');

const app = express();
const redis = new Redis(); 

// Middleware
app.use(bodyParser.json());

// Rate Limiting Middleware
const rateLimiter = async (req, res, next) => {
    const userIP = req.ip;
    const maxRequests = 5;
    const timeWindow = 60; 

    try {
        const currentRequests = await redis.incr(userIP);
        if (currentRequests === 1) {
            await redis.expire(userIP, timeWindow);
        }
        if (currentRequests > maxRequests) {
            return res.status(429).json({ error: 'Too many requests. Try again later.' });
        }
        next();
    } catch (error) {
        console.error('Rate Limiter Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Apply rate limiter globally
app.use(rateLimiter);

// Simulated external API call
const fetchData = async (id) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ id, data: `Data for ID ${id}` });
        }, 2000); 
    });
};

// Caching Endpoint
app.get('/data/:id', async (req, res) => {
    const { id } = req.params;
    const cacheKey = `data:${id}`;

    try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            return res.json({ source: 'cache', data: JSON.parse(cachedData) });
        }

        const data = await fetchData(id);
        await redis.set(cacheKey, JSON.stringify(data), 'EX', 60); // Cache for 60 seconds

        res.json({ source: 'api', data });
    } catch (error) {
        console.error('Caching Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Real-time Notification Publisher
app.post('/notify', async (req, res) => {
    const { channel, message } = req.body;

    try {
        await redis.publish(channel, message);
        res.json({ success: true, message: `Message sent to channel: ${channel}` });
    } catch (error) {
        console.error('Notification Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
