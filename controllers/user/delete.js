// functions for each call of the api on social-info. Use the social-info model

'use strict'

const User = require('../../models/user')
const crypt = require('../../services/crypt')

function deleteAccount (req, res){
	console.log(req.body);
	req.body.email = (req.body.email).toLowerCase();
	User.getAuthenticated(req.body.email, req.body.password, function (err, user, reason) {
		if (err) return res.status(500).send({ message: err })

		// login was successful if we have a user
		if (user) {
			let userId= crypt.decrypt(req.params.userId);
			deleteUser(res, userId);
		}else{
			res.status(200).send({message: `fail`})
		}
	})
}


async function deleteUser (res, userId){
	try {
		const user = await User.findById(userId);
		if(user){
			await user.deleteOne();
			res.status(200).send({message: `The case has been eliminated`})
		}else{
			return res.status(202).send({message: 'The case has been eliminated'})
		}
	} catch (err) {
		return res.status(500).send({message: `Error deleting the case: ${err}`})
	}
}


module.exports = {
	deleteAccount
}
