'use strict'

const mongoose = require('mongoose')
const config = require('./config')

mongoose.set('bufferCommands', false)
mongoose.set('autoIndex', false)
mongoose.set('strictQuery', false)
// Mongoose 8.22.1+: Cosmos DB MongoDB 4.2+ (wire v8). Do not downgrade below 8.16 on Cosmos 4.0.

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
