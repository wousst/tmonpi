/*
 * file: offline-unit-test.js
 * description: This code serves as offline unit test. It generates random 
 * 				numbers and store publishes into Google Pub/Sub. 
 * 
 **/

const fs = require('fs');
var mqtt = require('mqtt');
var shell = require('shelljs');
var jwt = require('jsonwebtoken');
var timestamp = require('date-time');
var sizeof = require('object-sizeof'); // [Debug] Module to calculate the size of object

var handler; // [Debug] Interval handler
var counter = 0; // [Debug] payload counter

const projectId = 'watchmen-mqtt';
const deviceId = 't430'; // Raspberry Pi = raspiModB
const registryId = 'tmonpi-registry';
const region = 'asia-east1';
const algorithm = 'RS256';
const privateKeyFile = './device-credentials/ca_private.pem';
const mqttBridgeHostname = 'mqtt.googleapis.com';

const mqttBridgePort = 443;
const messageType = 'events';
const numMessages = 5;

let publishChainInProgress = false;

const mqttClientId = `projects/${projectId}/locations/${region}/registries/${registryId}/devices/${deviceId}`;

const createJwt = (projectId, privateKeyFile, algorithm, function() {
	const token = {
		iat: parseInt(Date.now() / 1000),
		exp: parseInt(Date.now() / 1000) + 20 * 60, // 20 minutes
		aud: projectId,
	};

	const privateKey = fs.readFileSync(privateKeyFile);
	return jwt.sign(token, privateKey, {algorithm: algorithm});
});

const publishAsync = function(mqttTopic, client, iatTime, messageSent, connectionArgs) {
	var payload = `/raspi/temperature/celcius/${messageSent}`;
	console.log("debug: " + payload);

	client.publish(mqttTopic, payload, {qos: 0}, function(err) {
		if(!err) {
			counter += 1;
			console.log(`(${counter}); status: payload published; size:${sizeof(payload)} bytes.`);

		} else {
			console.log("payload-publish err: " + err);
		}
	});
};

const connectionArgs = {
	host: mqttBridgeHostname,
	port: mqttBridgePort,
	clientId: mqttClientId,
	username: 'unused',
	password: createJwt(projectId, privateKeyFile, algorithm),
	protocol: 'mqtts',
	secureProtocol: 'TLSv1_2_method',
};

// Create a client, and connect to the Google IoT-Core
const iatTime = parseInt(Date.now() / 1000);
const client = mqtt.connect(connectionArgs);

// Subscribe to /devices/${deviceId}/config topic to receive
// config updates. Config updates are recommended to use QoS
// 1 (at least one delivery).
client.subscribe(`/devices/${deviceId}/config`, {qos: 0});

const mqttTopic = `/devices/${deviceId}/${messageType}`;

client.on('connect', function(success) {
	console.log("connected.");
	publishChainInProgress = true;

	if(!success) {
		console.log("client not connected.");
	} else if(publishChainInProgress) {
		handler = setInterval(function() {
		var val = Math.random() * 99;
		// Publish to Google IoT-Core
		publishAsync(mqttTopic, client, iatTime, val, numMessages, connectionArgs);
		}, 1000 * 3); // interval: 60 secs (a minute)
	}
});

// Close gcp connection
client.on('close', function() {
	console.log('close');
});

// Error handling
client.on('error', function(err) {
	console.log("err: " + err);

	client.end(); // close gcp connection
	clearInterval(handler); // clear setInterval handler
});
