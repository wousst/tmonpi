const fs = require('fs');
var mqtt = require('mqtt');
var shell = require('shelljs');
var mqtt = require('mqtt');

// Simple Temperature Monitoring on Raspi
var tmp = shell.cat('/sys/class/thermal/thermal_zone0/temp');
var val = parseInt(tmp.stdout/1000);
console.log("raspi-temp: " + val);

const projectId = 'watchmen-mqtt';
const deviceId = 'raspiModB';
const registryId = 'tmonpi-registry';
const region = 'asia-east1';
const algorithm = 'RS256';
const privateKeyFile = './ca_private.pem';
const mqttBridgeHostname = 'mqtt.googleapis.com';

const mqttBridgePort = 443;
const messageType = 'events';

let publishChainInProgress = false;

const mqttClientId = `projects/${projectId}/locations/${region}/registries/${registryId}/devices/${deviceId}`;

const createJwt = (projectId, privateKeyFile, algorithm) => {
	const token = {
		iat: parseInt(Date.now() / 1000),
		exp: parseInt(Date.now() / 1000) + 20 * 60,
		aud: projectId,
	};

	const privateKey = fs.readFileSync(privateKeyFile);
	return jwt.sign(token, privateKey, {algorithm: algorithm});
};

const publishAsync = function(mqttTopic, client, iatTime, messageSent, connectionArgs) {
	var payload = `payload/${messageSent}`;
	console.log("debug: " + payload);

	client.publish(mqttTopic, payload, {qos: 0}, function(err) {
		if(!err) {
			console.log("payload published.");

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
		// Publish to Google IoT-Core
		publishAsync(mqttTopic, client, iatTime, reply, numMessages, connectionArgs);
	}
});


client.on('close', function() {
	console.log('close');
});

client.on('error', function(err) {
	console.log("err: " + err);
});

