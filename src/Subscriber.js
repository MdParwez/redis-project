const Redis = require('ioredis');
const redis = new Redis();

const CHANNEL = 'notifications';

redis.subscribe(CHANNEL, (error, count) => {
    if (error) {
        console.error('Error subscribing:', error);
        process.exit(1);
    }
    console.log(`Subscribed to ${CHANNEL}. Waiting for messages...`);
});

redis.on('message', (channel, message) => {
    console.log(`Received message on channel "${channel}": ${message}`);
});
