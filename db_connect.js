'use strict'

const mongoose = require('mongoose')
const config = require('./config')

mongoose.set('bufferCommands', false)
mongoose.set('autoIndex', false)
mongoose.set('strictQuery', false)
// Pin mongoose 8.15.x: Cosmos DB wire v7 (MongoDB 4.0); driver in 8.16+ requires wire v8 (4.2+).

const connectionOptions = {
	connectTimeoutMS: 10000,
	socketTimeoutMS: 45000,
	maxPoolSize: 10,
	serverSelectionTimeoutMS: 10000
}

const conndbaccounts = mongoose.createConnection(config.dbaccounts, connectionOptions)

module.exports = {
	conndbaccounts
}
