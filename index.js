/*
* MAIN FILE, REQUESTS INFORMATION OF THE CONFIG (CONFIG.JS WHERE TO ESTABLISH IF IT IS DEVELOPMENT OR PROD)
* AND CONFIGURATION WITH EXPRESS (APP.JS), AND ESTABLISH THE CONNECTION WITH THE BD MONGO AND BEGINS TO LISTEN
*/

'use strict'

const app = require('./app')
const config = require('./config')
const dbConnect = require('./db_connect')

dbConnect.ensureConnections(['accounts']).finally(function () {
	app.listen(config.port, function () {
		console.log('API REST corriendo en http://localhost:' + config.port)
		console.log('DB status', JSON.stringify(dbConnect.getDbStatus()))
	})
})
