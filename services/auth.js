'use strict'

const jwt = require('jwt-simple')
const moment = require('moment')
const config = require('../config')
const crypt = require('./crypt')
const User = require('../models/user')


function createToken (user){
	var id = user._id.toString();
	var idencrypt= crypt.encrypt(id);
	const payload = {
		//el id siguiente no debería de ser el id privado, así que habrá que cambiarlo
		sub: idencrypt,
		iat: moment().unix(),
		exp: moment().add(1, 'years').unix(),//years //minutes
		role: user.role,
		subrole: user.subrole,
		group: user.group
	}
	return jwt.encode(payload, config.SECRET_TOKEN)
}

function decodeToken(token, roles){
	return new Promise(async (resolve, reject) => {
		try{
			const payload = jwt.decode(token, config.SECRET_TOKEN)
			if(!roles.includes(payload.role)){
				return reject({
					status: 403,
					message: 'Access denied.'
				})
			}

			const userId = crypt.decrypt(payload.sub)
			const user = await User.findById(userId)
				.select('-password -__v -confirmationCode -loginAttempts -confirmed -lastLogin')

			if(!user){
				return reject({
					status: 403,
					message: 'Hacker!'
				})
			}

			if(user.role != payload.role || userId != user._id.toString()){
				return reject({
					status: 403,
					message: 'Hacker!'
				})
			}

			if (payload.exp <= moment().unix()){
				return reject({
					status: 401,
					message: 'Token expired'
				})
			}

			resolve(crypt.decrypt(payload.sub.toString()))
		}catch (err){
			var messageresult='Invalid Token';
			if(err.message == "Token expired"){
				messageresult = err.message;
			}
			reject({
				status: 401,
				message: messageresult
			})
		}
	})
}

module.exports = {
	createToken,
	decodeToken
}
