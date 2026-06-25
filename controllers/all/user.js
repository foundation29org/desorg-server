// functions for each call of the api on user. Use the user model

'use strict'

// add the user model
const User = require('../../models/user')
const Support = require('../../models/support')
const serviceAuth = require('../../services/auth')
const serviceEmail = require('../../services/email')
const crypt = require('../../services/crypt')
const bcrypt = require('bcryptjs')

async function activateUser(req, res) {
	req.body.email = (req.body.email).toLowerCase();
	try {
		const user2 = await User.findOne({ 'email': req.body.email });
		if (user2) {
			if (user2.confirmationCode == req.body.key) {
				user2.confirmed = true;
				let update = user2;
				let userId = user2._id
				await User.findByIdAndUpdate(userId, update);
				res.status(200).send({ message: 'activated' })
			} else {
				return res.status(200).send({ message: 'error' })
			}
		} else {
			return res.status(500).send({ message: `user not exists` })
		}
	} catch (err) {
		return res.status(500).send({ message: `Error activating account: ${err}` })
	}
}


/**
 * @api {post} https://health29.org/api/api/recoverpass Request password change
 * @apiName recoverPass
 * @apiVersion 1.0.0
 * @apiGroup Account
 * @apiDescription This method allows you to send a request to change the password. At the end of this call, you need to check the email account to call [update password](#api-Account-updatePass).
 * @apiExample {js} Example usage:
 *   var formValue = { email: "example@ex.com"};
 *   this.http.post('https://health29.org/api/recoverpass',formValue)
 *    .subscribe( (res : any) => {
 *      if(res.message == "Email sent"){
 *        console.log("Account recovery email sent. Check the email to change the password");
 *      }
 *   }, (err) => {
 *     if(err.error.message == 'Fail sending email'){
 *        //contact with health29
 *      }else if(err.error.message == 'user not exists'){
 *       ...
 *      }else if(err.error.message == 'account not activated'){
 *       ...
 *      }
 *   }
 *
 * @apiParam (body) {String} email User email
 * @apiParamExample {json} Request-Example:
 *     {
 *       "email": "example@ex.com"
 *     }
 * @apiSuccess {String} message Information about the request. If everything went correctly, return 'Email sent'
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *  "message": "Email sent"
 * }
 *
 * @apiSuccess (Eror 500) {String} message Information about the request. The credentials are incorrect or something has gone wrong. One of the following answers will be obtained:
 * * Fail sending email
 * * user not exists
 * * account not activated
 */
async function recoverPass(req, res) {
	req.body.email = (req.body.email).toLowerCase();
	console.log(req.body.email);
	try {
		const user = await User.findOne({ 'email': req.body.email });
		if (user) {
			console.log(user.confirmed);
			if (user.confirmed) {
				let randomstring = Math.random().toString(36).slice(-12)
				user.randomCodeRecoverPass = randomstring;
				user.dateTimeRecoverPass = Date.now();

				await User.findByIdAndUpdate(user._id, user);

				try {
					await serviceEmail.sendMailRecoverPass(req.body.email, randomstring, user.lang)
					return res.status(200).send({ message: 'Email sent' })
				} catch (response) {
					res.status(500).send({ message: 'Fail sending email' })
				}
			} else {
				return res.status(500).send({ message: 'account not activated' })
			}
		} else {
			return res.status(500).send({ message: 'user not exists' })
		}
	} catch (err) {
		return res.status(500).send({ message: 'Error searching the user' })
	}
}

/**
 * @api {post} https://health29.org/api/api/updatepass Update password
 * @apiName updatePass
 * @apiVersion 1.0.0
 * @apiGroup Account
 * @apiDescription This method allows you to change the password of an account. Before changing the password, you previously had to make a [request for password change](#api-Account-recoverPass).
 * @apiExample {js} Example usage:
 *  var passwordsha512 = sha512("fjie76?vDh");
 *  var param = this.router.parseUrl(this.router.url).queryParams;
 *  var formValue = { email: param.email, password: passwordsha512, randomCodeRecoverPass: param.key };
 *   this.http.post('https://health29.org/api/updatepass',formValue)
 *    .subscribe( (res : any) => {
 *      if(res.message == "password changed"){
 *        console.log("Password changed successfully");
 *      }
 *   }, (err) => {
 *     if(err.error.message == 'invalid link'){
 *        ...
 *      }else if(err.error.message == 'link expired'){
 *        console.log('The link has expired after more than 15 minutes since you requested it. Re-request a password change.');
 *      }else if(err.error.message == 'Error saving the pass'){
 *        ...
 *      }
 *   }
 *
 * @apiParam (body) {String} email User email. In the link to request a change of password sent to the email, there is an email parameter. The value of this parameter will be the one to be assigned to email.
 * @apiParam (body) {String} password User password using hash <a href="https://es.wikipedia.org/wiki/SHA-2" target="_blank">sha512</a>
 * @apiParam (body) {String} randomCodeRecoverPass In the password change request link sent to the email, there is a key parameter. The value of this parameter will be the one that must be assigned to randomCodeRecoverPass.
 * @apiParamExample {json} Request-Example:
 *     {
 *       "email": "example@ex.com",
 *       "password": "f74f2603939a53656948480ce71f1ce46457b6654fd22c61c1f2ccd3e2c96d1cd02d162b560c4beaf1ae45f4574571dc5cbc1ce040701c0b5c38457988aa00fe97f",
 *       "randomCodeRecoverPass": "0.xkwta99hoy"
 *     }
 * @apiSuccess {String} message Information about the request. If everything went correctly, return 'password changed'
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *  "message": "password changed"
 * }
 *
 * @apiSuccess (Eror 500) {String} message Information about the request. The credentials are incorrect or something has gone wrong. One of the following answers will be obtained:
 * * invalid link
 * * link expired (The link has expired after more than 15 minutes since you requested it. Re-request a password change.)
 * * Account is temporarily locked
 * * Error saving the pass

 */
async function updatePass(req, res) {
	req.body.email = (req.body.email).toLowerCase();
	try {
		const user = await User.findOne({ 'email': req.body.email });
		if (user) {
			const userToSave = user;
			userToSave.password = req.body.password
			var limittime = new Date();
			var myTimeSpan = 15 * 60 * 1000;
			limittime.setTime(limittime.getTime() - myTimeSpan);

			if (limittime.getTime() < userToSave.dateTimeRecoverPass.getTime()) {
				if (userToSave.randomCodeRecoverPass == req.body.randomCodeRecoverPass) {
					bcrypt.genSalt(10, (err, salt) => {
						if (err) return res.status(500).send({ message: 'error salt' })
						bcrypt.hash(userToSave.password, salt, async (err, hash) => {
							if (err) return res.status(500).send({ message: 'error hash' })

							userToSave.password = hash
							try {
								const userUpdated = await User.findByIdAndUpdate(userToSave._id, userToSave);
								if (!userUpdated) return res.status(500).send({ message: 'not found' })
								return res.status(200).send({ message: 'password changed' })
							} catch (updateErr) {
								return res.status(500).send({ message: 'Error saving the pass' })
							}
						})
					})
				} else {
					return res.status(500).send({ message: 'invalid link' })
				}
			} else {
				return res.status(500).send({ message: 'link expired' })
			}
		} else {
			return res.status(500).send({ message: 'invalid link' })
		}
	} catch (err) {
		return res.status(500).send({ message: 'Error searching the user' })
	}
}

/**
 * @api {post} https://health29.org/api/api/newPass New password
 * @apiName newPass
 * @apiVersion 1.0.0
 * @apiGroup Account
 * @apiDescription This method allows you to change the password of an account. It is another way to change the password, but in this case, you need to provide the current and the new password, and it does not require validation through the mail account. In this case, it requires authentication in the header.
 * @apiExample {js} Example usage:
 *  var passwordsha512 = sha512("fjie76?vDh");
 *  var newpasswordsha512 = sha512("jisd?87Tg");
 *  var formValue = { email: example@ex.com, actualpassword: passwordsha512, newpassword: newpasswordsha512 };
 *   this.http.post('https://health29.org/api/newPass',formValue)
 *    .subscribe( (res : any) => {
 *      if(res.message == "password changed"){
 *        console.log("Password changed successfully");
 *      }else if(res.message == 'Login failed'){
 *        console.log('The current password is incorrect');
 *      }else if(res.message == 'Account is temporarily locked'){
 *        console.log('Account is temporarily locked');
 *      }else if(res.message == 'Account is unactivated'){
 *        ...
 *      }
 *   }, (err) => {
 *     ...
 *   }
 *
 * @apiHeader {String} authorization Users unique access-key. For this, go to  [Get token](#api-Access_token-signIn)
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciPgDIUzI1NiJ9.eyJzdWIiOiI1M2ZlYWQ3YjY1YjM0ZTQ0MGE4YzRhNmUyMzVhNDFjNjEyOThiMWZjYTZjMjXkZTUxMTA9OGVkN2NlODMxYWY3IiwiaWF0IjoxNTIwMzUzMDMwLCJlcHAiOjE1NTE4ODkwMzAsInJvbGUiOiJVc2VyIiwiZ3JvdDEiOiJEdWNoZW5uZSBQYXJlbnQgUHJfrmVjdCBOZXRoZXJsYW5kcyJ9.MloW8eeJ857FY7-vwxJaMDajFmmVStGDcnfHfGJx05k"
 *     }
 * @apiParam (body) {String} email User email. In the link to request a change of password sent to the email, there is an email parameter. The value of this parameter will be the one to be assigned to email.
 * @apiParam (body) {String} actualpassword Actual password using hash <a href="https://es.wikipedia.org/wiki/SHA-2" target="_blank">sha512</a>
 * @apiParam (body) {String} newpassword New password using hash <a href="https://es.wikipedia.org/wiki/SHA-2" target="_blank">sha512</a>
 * @apiParamExample {json} Request-Example:
 *     {
 *       "email": "example@ex.com",
 *       "actualpassword": "f74f2603939a53656948480ce71f1ce46457b6654fd22c61c1f2ccd3e2c96d1cd02d162b560c4beaf1ae45f4574571dc5cbc1ce040701c0b5c38457988aa00fe97f",
 *       "newpassword": "k847y603939a53656948480ce71f1ce46457b4745fd22c61c1f2ccd3e2c96d1cd02d162b560c4beaf1ae45f4574571dc5cbc1ce040701c0b5c38457988aa00fe45t"
 *     }
 * @apiSuccess {String} message Information about the request. If everything went correctly, return 'password changed'
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *  "message": "password changed"
 * }
 *
 * @apiSuccess (Success 202) {String} message Information about the request. The credentials are incorrect or something has gone wrong. One of the following answers will be obtained:
 * * Not found
 * * Login failed (if the current password is incorrect)
 * * Account is temporarily locked
 * * Account is unactivated
 */

function newPass(req, res) {
	req.body.email = (req.body.email).toLowerCase();
	User.getAuthenticated(req.body.email, req.body.actualpassword, function (err, userToUpdate, reason) {
		if (err) return res.status(500).send({ message: err })

		// login was successful if we have a user
		if (userToUpdate) {
			bcrypt.genSalt(10, (err, salt) => {
				if (err) return res.status(500).send({ message: 'error salt' })
				bcrypt.hash(req.body.newpassword, salt, async (err, hash) => {
					if (err) return res.status(500).send({ message: 'error hash' })

					userToUpdate.password = hash
					try {
						const userUpdated = await User.findByIdAndUpdate(userToUpdate._id, userToUpdate);
						if (!userUpdated) return res.status(500).send({ message: 'not found' })
						return res.status(200).send({ message: 'password changed' })
					} catch (updateErr) {
						return res.status(500).send({ message: 'Error saving the pass' })
					}
				})
			})
		} else {
			// otherwise we can determine why we failed
			var reasons = User.failedLogin;
			switch (reason) {
				case reasons.NOT_FOUND:
					return res.status(202).send({
						message: 'Login failed'
					})
				case reasons.PASSWORD_INCORRECT:
					// note: these cases are usually treated the same - don't tell
					// the user *why* the login failed, only that it did
					return res.status(202).send({
						message: 'Login failed'
					})
					break;
				case reasons.MAX_ATTEMPTS:
					// send email or otherwise notify user that account is
					// temporarily locked
					return res.status(202).send({
						message: 'Account is temporarily locked'
					})
					break;
				case reasons.UNACTIVATED:
					return res.status(202).send({
						message: 'Account is unactivated'
					})
					break;
				case reasons.BLOCKED:
					return res.status(202).send({
						message: 'Account is blocked'
					})
					break;
				case reasons.WRONG_PLATFORM:
					return res.status(202).send({
						message: 'This is not your platform'
					})
					break;

			}
		}



	})

}

/**
 * @api {post} https://health29.org/api/api/signUp New account
 * @apiName signUp
 * @apiVersion 1.0.0
 * @apiGroup Account
 * @apiDescription This method allows you to create a user account in Raito
 * @apiExample {js} Example usage:
 *  var passwordsha512 = sha512("fjie76?vDh");
 *  var formValue = { email: "example@ex.com", userName: "Peter", password: passwordsha512, lang: "en", group: "None"};
 *   this.http.post('https://health29.org/api/signup',formValue)
 *    .subscribe( (res : any) => {
 *      if(res.message == "Account created"){
 *        console.log("Check the email to activate the account");
 *      }else if(res.message == 'Fail sending email'){
 *        //contact with health29
 *      }else if(res.message == 'user exists'){
 *       ...
 *      }
 *   }, (err) => {
 *     ...
 *   }
 *
 * @apiParam (body) {String} email User email
 * @apiParam (body) {String} userName User name
 * @apiParam (body) {String} password User password using hash <a href="https://es.wikipedia.org/wiki/SHA-2" target="_blank">sha512</a>
 * @apiParam (body) {String} lang Lang of the User. For this, go to  [Get the available languages](#api-Languages-getLangs).
 * We currently have 5 languages, but we will include more. The current languages are:
 * * English: en
 * * Spanish: es
 * * German: de
 * * Dutch: nl
 * * Portuguese: pt
 * @apiParam (body) {String} [group] Group to which the user belongs, if it does not have a group or do not know the group to which belongs, it will be 'None'. If the group is not set, it will be set to 'None' by default.
 * @apiParamExample {json} Request-Example:
 *     {
 *       "email": "example@ex.com",
 *       "userName": "Peter",
 *       "password": "f74f2603939a53656948480ce71f1ce46457b6654fd22c61c1f2ccd3e2c96d1cd02d162b560c4beaf1ae45f4574571dc5cbc1ce040701c0b5c38457988aa00fe97f",
 *       "group": "None",
 *       "lang": "en"
 *     }
 * @apiSuccess {String} message Information about the request. One of the following answers will be obtained:
 * * Account created (The user should check the email to activate the account)
 * * Fail sending email
 * * user exists
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *  "message": "Account created"
 * }
 *
 */


async function signUp(req, res) {
	req.body.email = (req.body.email).toLowerCase();
	let randomstring = Math.random().toString(36).slice(-12);
	const user = new User({
		email: req.body.email,
		role: req.body.role,
		subrole: req.body.subrole,
		userName: req.body.userName,
		lastName: req.body.lastName,
		password: req.body.password,
		confirmationCode: randomstring,
		lang: req.body.lang,
		group: req.body.group,
		permissions: req.body.permissions,
		platform: 'Raito'
	})
	try {
		const user2 = await User.findOne({ 'email': req.body.email });
		if (!user2) {
			await user.save();
			try {
				await serviceEmail.sendMailVerifyEmail(req.body.email, randomstring, req.body.lang, req.body.group)
				res.status(200).send({ message: 'Account created' })
			} catch (response) {
				res.status(200).send({ message: 'Fail sending email' })
			}
		} else {
			return res.status(202).send({ message: 'user exists' })
		}
	} catch (err) {
		return res.status(500).send({ message: `Error creating the user: ${err}` })
	}
}


async function sendEmail(req, res) {
	req.body.email = (req.body.email).toLowerCase();
	let randomstring = Math.random().toString(36).slice(-12);
	try {
		const user = await User.findOne({ 'email': req.body.email });
		if (user) {
			if (req.body.type == "resendEmail") {
				try {
					await serviceEmail.sendMailVerifyEmail(req.body.email, randomstring, req.body.lang, user.group)
					res.status(200).send({ message: 'Email resent' })
				} catch (response) {
					res.status(200).send({ message: 'Fail sending email' })
				}
			}
			else if (req.body.type == "contactSupport") {
				let support = new Support()
				support.type = ''
				support.subject = 'Help with account activation'
				support.description = 'Please, help me with my account activation. I did not receive any confirmation email.'
				support.files = []
				support.createdBy = user.userId
				try {
					await serviceEmail.sendMailSupport(req.body.email, req.body.lang, null, support)
					res.status(200).send({ message: 'Support contacted' })
				} catch (response) {
					res.status(200).send({ message: 'Fail sending email' })
				}
			}
		}
	} catch (err) {
		return res.status(500).send({ message: `Error finding the user: ${err}` })
	}
}
/**
 * @api {post} https://health29.org/api/api/signin Get the token (and the userId)
 * @apiName signIn
 * @apiVersion 1.0.0
 * @apiGroup Access token
 * @apiDescription This method gets the token and the language for the user. This token includes the encrypt id of the user, token expiration date, role, and the group to which it belongs.
 * The token are encoded using <a href="https://en.wikipedia.org/wiki/JSON_Web_Token" target="_blank">jwt</a>
 * @apiExample {js} Example usage:
 *  var passwordsha512 = sha512("fjie76?vDh");
 *  var formValue = { email: "aa@aa.com", password: passwordsha512 };
 *   this.http.post('https://health29.org/api/signin',formValue)
 *    .subscribe( (res : any) => {
 *      if(res.message == "You have successfully logged in"){
 *        console.log(res.lang);
 *        console.log(res.token);
 *      }else{
 *        this.isloggedIn = false;
 *      }
 *   }, (err) => {
 *     this.isloggedIn = false;
 *   }
 *
 * @apiParam (body) {String} email User email
 * @apiParam (body) {String} password User password using hash <a href="https://es.wikipedia.org/wiki/SHA-2" target="_blank">sha512</a>
 * @apiParamExample {json} Request-Example:
 *     {
 *       "email": "example@ex.com",
 *       "password": "f74f2603939a53656948480ce71f1ce46457b6654fd22c61c1f2ccd3e2c96d1cd02d162b560c4beaf1ae45f4574571dc5cbc1ce040701c0b5c38457988aa00fe97f"
 *     }
 * @apiSuccess {String} message If all goes well, the system should return 'You have successfully logged in'
 * @apiSuccess {String} token You will need this <strong>token</strong> in the header of almost all requests to the API. Whenever the user wants to access a protected route or resource, the user agent should send the JWT, in the Authorization header using the Bearer schema.
 * <p>The data contained in the token are: encrypted <strong>userId</strong>, expiration token, group, and role.
 * To decode them, you you must use some jwt decoder <a href="https://en.wikipedia.org/wiki/JSON_Web_Token" target="_blank">jwt</a>. There are multiple options to do it, for example for javascript: <a href="https://github.com/hokaccha/node-jwt-simple" target="_blank">Option 1</a> <a href="https://github.com/auth0/jwt-decode" target="_blank">Option 2</a>
 * When you decode, you will see that it has several values, these are:</p>
 * <p>
 * <ul>
 *  <li>sub: the encrypted userId. This value will also be used in many API queries. It is recommended to store only the token, and each time the userId is required, decode the token.</li>
 *  <li>exp: The expiration time claim identifies the expiration time on or after which the JWT must not be accepted for processing.</li>
 *  <li>group: Group to which the user belongs, if it does not have a group, it will be 'None'. </li>
 *  <li>role: Role of the user. Normally it will be 'User'.</li>
 * </ul>
 * </p>
 *

 * @apiSuccess {String} lang Lang of the User.
 * @apiSuccess (Success 202) {String} message Information about the request. The credentials are incorrect or something has gone wrong. One of the following answers will be obtained:
 * * Not found
 * * Login failed
 * * Account is temporarily locked
 * * Account is unactivated
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *  "message": "You have successfully logged in",
 *  "token": "eyJ0eXAiOiJKV1QiLCJhbGciPgDIUzI1NiJ9.eyJzdWIiOiI1M2ZlYWQ3YjY1YjM0ZTQ0MGE4YzRhNmUyMzVhNDFjNjEyOThiMWZjYTZjMjXkZTUxMTA9OGVkN2NlODMxYWY3IiwiaWF0IjoxNTIwMzUzMDMwLCJlcHAiOjE1NTE4ODkwMzAsInJvbGUiOiJVc2VyIiwiZ3JvdDEiOiJEdWNoZW5uZSBQYXJlbnQgUHJfrmVjdCBOZXRoZXJsYW5kcyJ9.MloW8eeJ857FY7-vwxJaMDajFmmVStGDcnfHfGJx05k",
 *  "lang": "en"
 * }
 *
 */
function signIn(req, res) {
	// attempt to authenticate user
	req.body.email = (req.body.email).toLowerCase();
	User.getAuthenticated(req.body.email, req.body.password, function (err, user, reason) {
		if (err) return res.status(500).send({ message: err })

		// login was successful if we have a user
		if (user) {
			// handle login success
			return res.status(200).send({
				message: 'You have successfully logged in',
				token: serviceAuth.createToken(user),
				lang: user.lang,
				platform: user.platform
			})
		} else {
			// otherwise we can determine why we failed
			var reasons = User.failedLogin;
			switch (reason) {
				case reasons.NOT_FOUND:
					return res.status(202).send({
						message: 'Not found'
					})
				case reasons.PASSWORD_INCORRECT:
					// note: these cases are usually treated the same - don't tell
					// the user *why* the login failed, only that it did
					return res.status(202).send({
						message: 'Login failed'
					})
					break;
				case reasons.MAX_ATTEMPTS:
					// send email or otherwise notify user that account is
					// temporarily locked
					return res.status(202).send({
						message: 'Account is temporarily locked'
					})
					break;
				case reasons.UNACTIVATED:
					return res.status(202).send({
						message: 'Account is unactivated'
					})
					break;
				case reasons.BLOCKED:
					return res.status(202).send({
						message: 'Account is blocked'
					})
					break;
				case reasons.WRONG_PLATFORM:
					return res.status(202).send({
						message: 'This is not your platform'
					})
					break;
			}
		}

	})
}

/**
 * @api {get} https://health29.org/api/users/:id Get user
 * @apiName getUser
 * @apiVersion 1.0.0
 * @apiGroup Users
 * @apiDescription This methods read data of a User
 * @apiExample {js} Example usage:
 *   this.http.get('https://health29.org/api/users/'+userId)
 *    .subscribe( (res : any) => {
 *      console.log(res.userName);
 *   }, (err) => {
 *     ...
 *   }
 *
 * @apiHeader {String} authorization Users unique access-key. For this, go to  [Get token](#api-Access_token-signIn)
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciPgDIUzI1NiJ9.eyJzdWIiOiI1M2ZlYWQ3YjY1YjM0ZTQ0MGE4YzRhNmUyMzVhNDFjNjEyOThiMWZjYTZjMjXkZTUxMTA9OGVkN2NlODMxYWY3IiwiaWF0IjoxNTIwMzUzMDMwLCJlcHAiOjE1NTE4ODkwMzAsInJvbGUiOiJVc2VyIiwiZ3JvdDEiOiJEdWNoZW5uZSBQYXJlbnQgUHJfrmVjdCBOZXRoZXJsYW5kcyJ9.MloW8eeJ857FY7-vwxJaMDajFmmVStGDcnfHfGJx05k"
 *     }
 * @apiParam {String} userId User unique ID. More info here:  [Get token and userId](#api-Access_token-signIn)
 * @apiSuccess {String} email Email of the User.
 * @apiSuccess {String} userName UserName of the User.
 * @apiSuccess {String} lang lang of the User.
 * @apiSuccess {String} group Group of the User.
 * @apiSuccess {Date} signupDate Signup date of the User.
 * @apiError UserNotFound The <code>id</code> of the User was not found.
 * @apiErrorExample {json} Error-Response:
 * HTTP/1.1 404 Not Found
 *     {
 *       "error": "UserNotFound"
 *     }
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {"user":
 *  {
 *   "email": "John@example.com",
 *   "userName": "Doe",
 *   "lang": "en",
 *   "group": "nameGroup",
 *   "signupDate": "2018-01-26T13:25:31.077Z"
 *  }
 * }
 *
 */

async function getUser(req, res) {
	let userId = crypt.decrypt(req.params.userId);
	try {
		const user = await User.findById(userId, { "_id": false, "password": false, "__v": false, "confirmationCode": false, "loginAttempts": false, "confirmed": false, "role": false, "lastLogin": false });
		if (!user) return res.status(404).send({ code: 208, message: `The user does not exist` })
		res.status(200).send({ user })
	} catch (err) {
		return res.status(500).send({ message: `Error making the request: ${err}` })
	}
}

async function getSettings(req, res) {
	let userId = crypt.decrypt(req.params.userId);
	try {
		const user = await User.findById(userId, { "userName": false, "lang": false, "email": false, "signupDate": false, "_id": false, "password": false, "__v": false, "confirmationCode": false, "loginAttempts": false, "randomCodeRecoverPass": false, "dateTimeRecoverPass": false, "confirmed": false, "role": false, "lastLogin": false });
		if (!user) return res.status(404).send({ code: 208, message: `The user does not exist` })
		res.status(200).send({ user })
	} catch (err) {
		return res.status(500).send({ message: `Error making the request: ${err}` })
	}
}


/**
 * @api {put} https://health29.org/api/users/:id Update user
 * @apiName updateUser
 * @apiVersion 1.0.0
 * @apiDescription This method allows to change the user's data
 * @apiGroup Users
 * @apiExample {js} Example usage:
 *   this.http.put('https://health29.org/api/users/'+userId, this.user)
 *    .subscribe( (res : any) => {
 *      console.log('User update: '+ res.user);
 *     }, (err) => {
 *      ...
 *     }
 *
 * @apiHeader {String} authorization Users unique access-key. For this, go to  [Get token](#api-Access_token-signIn)
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciPgDIUzI1NiJ9.eyJzdWIiOiI1M2ZlYWQ3YjY1YjM0ZTQ0MGE4YzRhNmUyMzVhNDFjNjEyOThiMWZjYTZjMjXkZTUxMTA9OGVkN2NlODMxYWY3IiwiaWF0IjoxNTIwMzUzMDMwLCJlcHAiOjE1NTE4ODkwMzAsInJvbGUiOiJVc2VyIiwiZ3JvdDEiOiJEdWNoZW5uZSBQYXJlbnQgUHJfrmVjdCBOZXRoZXJsYW5kcyJ9.MloW8eeJ857FY7-vwxJaMDajFmmVStGDcnfHfGJx05k"
 *     }
 * @apiParam {String} userId User unique ID. More info here:  [Get token and userId](#api-Access_token-signIn)
 * @apiParam (body) {String} [userName] UserName of the User.
 * @apiParam (body) {String} [lang] lang of the User.
 * @apiSuccess {String} email Email of the User.
 * @apiSuccess {String} userName UserName of the User.
 * @apiSuccess {String} lang lang of the User.
 * @apiSuccess {String} group Group of the User.
 * @apiSuccess {Date} signupDate Signup date of the User.
 * @apiError UserNotFound The <code>id</code> of the User was not found.
 * @apiErrorExample {json} Error-Response:
 * HTTP/1.1 404 Not Found
 *     {
 *       "error": "UserNotFound"
 *     }
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {"user":
 *  {
 *   "email": "John@example.com",
 *   "userName": "Doe",
 *   "lang": "en",
 *   "group": "nameGroup",
 *   "signupDate": "2018-01-26T13:25:31.077Z"
 *  }
 * }
 *
 */

async function updateUser(req, res) {
	let userId = crypt.decrypt(req.params.userId);
	let update = req.body
	try {
		const userUpdated = await User.findByIdAndUpdate(userId, update, { select: '-_id userName lastName lang email signupDate massunit lengthunit', new: true });
		res.status(200).send({ user: userUpdated })
	} catch (err) {
		return res.status(500).send({ message: `Error making the request: ${err}` })
	}
}

async function deleteUser(req, res) {
	let userId = req.params.userId
	try {
		const user = await User.findById(userId);
		if (user) {
			await user.deleteOne();
			res.status(200).send({ message: `The user has been deleted.` })
		} else {
			return res.status(404).send({ code: 208, message: `Error deleting the user` })
		}
	} catch (err) {
		return res.status(500).send({ message: `Error deleting the user: ${err}` })
	}
}


async function getUserName(req, res) {
	let userId = crypt.decrypt(req.params.userId);
	try {
		const user = await User.findById(userId, { "_id": false, "password": false, "__v": false, "confirmationCode": false, "loginAttempts": false, "confirmed": false, "role": false, "lastLogin": false });
		if (user) {
			res.status(200).send({ userName: user.userName, lastName: user.lastName, isUser: req.params.userId, email: user.email })
		}else{
			res.status(200).send({ userName: '', lastName: '', isUser: req.params.userId})
		}
	} catch (err) {
		return res.status(500).send({ message: `Error making the request: ${err}` })
	}
}

async function getUserEmail(req, res) {
	let userId = crypt.decrypt(req.params.userId);
	try {
		const user = await User.findById(userId, { "_id": false, "password": false, "__v": false, "confirmationCode": false, "loginAttempts": false, "confirmed": false, "role": false, "lastLogin": false });
		var result = "Jhon";
		if (user) {
			result = user.email;
		}
		res.status(200).send({ email: result })
	} catch (err) {
		return res.status(500).send({ message: `Error making the request: ${err}` })
	}
}

module.exports = {
	activateUser,
	recoverPass,
	updatePass,
	newPass,
	signUp,
	signIn,
	getUser,
	getSettings,
	updateUser,
	deleteUser,
	sendEmail,
	getUserName,
	getUserEmail
}
