/*
 * Background Cloud Function to be triggered by Pub/Sub.
 * This function is exported by index.js, and executed when
 * the trigger topic receives a message. 
 * 
 * @param {object} pubSubEvent - The event payload. 
 * @param {object} context - The event metadata. 
 * */

// Every time a message is published to a Cloud Pub/Sub topic, 
// the function is invoked, and a greeting using data derived 
// from the message is written. 
exports.bgcfPubSub = (pubSubEvent, context) => {
    const name = bgcfPubSub.data ? Buffer.from(bgcfPubSub.data, 'base64').toString() : 'World!';
    console.log(`message: ${name}, timestamp: ${context.timestamp}`);
};