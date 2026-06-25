'use strict'

const mongoose = require('mongoose')
const config = require('./config')

mongoose.set('bufferCommands', false)
mongoose.set('autoIndex', false)

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
