const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);
const db = admin.database();

exports.cfPubSub = functions.pubsub.topic('tmonpi-topic').onPublish((message) => {
    const payload = null;
    try {
        payload = message.json;
        const data = {
            val: message.json,
            timestamp: data.timestamp
        };

        // validate and do nothing
        if(payload.temp < 0) return;

        return db.ref(`/devices/${data.deviceId}`).set({
            temp: data.temp,
            lastTimestamp: data.timestamp
        });
    } catch (e) {
        console.error('PubSub message was not JSON', e);
    }
});