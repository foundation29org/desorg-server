'use strict'

const mongoose = require('mongoose')
const config = require('./config')

mongoose.set('bufferCommands', false)
mongoose.set('autoIndex', false)
mongoose.set('strictQuery', false)
// Mongoose 8.22.1+: Cosmos DB MongoDB 4.2+ (wire v8). Do not downgrade below 8.16 on Cosmos 4.0.

const connectionOptions = {
	connectTimeoutMS: 30000,
	socketTimeoutMS: 45000,
	maxPoolSize: 10,
	serverSelectionTimeoutMS: 30000,
	retryWrites: false
}

const connectionState = {}

function createConnection(name, url) {
	const connection = mongoose.createConnection(url, connectionOptions)

	connectionState[name] = {
		name: name,
		event: 'created',
		message: null,
		at: new Date().toISOString()
	}

	connection.on('connected', function () {
		updateConnectionState(name, 'connected')
	})

	connection.on('open', function () {
		updateConnectionState(name, 'open')
	})

	connection.on('reconnected', function () {
		updateConnectionState(name, 'reconnected')
	})

	connection.on('disconnected', function () {
		updateConnectionState(name, 'disconnected')
	})

	connection.on('error', function (err) {
		updateConnectionState(name, 'error', err && err.message ? err.message : String(err))
	})

	return connection
}

function updateConnectionState(name, event, message) {
	connectionState[name] = {
		name: name,
		event: event,
		message: message || null,
		at: new Date().toISOString()
	}

	if (message) {
		console.error('[mongo:' + name + '] ' + event + ' - ' + message)
	} else {
		console.log('[mongo:' + name + '] ' + event)
	}
}

function getReadyStateName(readyState) {
	switch (readyState) {
		case 0:
			return 'disconnected'
		case 1:
			return 'connected'
		case 2:
			return 'connecting'
		case 3:
			return 'disconnecting'
		default:
			return 'unknown'
	}
}

function getConnectionStatus(name, connection) {
	return {
		name: name,
		readyState: connection.readyState,
		readyStateName: getReadyStateName(connection.readyState),
		host: connection.host,
		port: connection.port,
		database: connection.name,
		lastEvent: connectionState[name] || null
	}
}

const conndbaccounts = createConnection('accounts', config.dbaccounts)

const connections = {
	accounts: conndbaccounts
}

function ensureConnection(name) {
	const connection = connections[name]
	const url = config.dbaccounts
	if (!connection) {
		return Promise.resolve(false)
	}
	if (connection.readyState === 1) {
		return Promise.resolve(true)
	}

	return connection.asPromise().then(function () {
		return true
	}).catch(function () {
		return connection.openUri(url, connectionOptions).then(function () {
			return true
		}).catch(function (err) {
			updateConnectionState(name, 'error', err && err.message ? err.message : String(err))
			return false
		})
	})
}

function ensureConnections(names) {
	return Promise.all(names.map(function (name) {
		return ensureConnection(name)
	}))
}

;[5000, 15000, 30000, 60000].forEach(function (delay) {
	setTimeout(function () {
		ensureConnections(['accounts'])
	}, delay)
})

setInterval(function () {
	ensureConnections(['accounts'])
}, 60000)

function getDbStatus() {
	return {
		accounts: getConnectionStatus('accounts', conndbaccounts)
	}
}

module.exports = {
	conndbaccounts,
	getDbStatus,
	ensureConnections
}
