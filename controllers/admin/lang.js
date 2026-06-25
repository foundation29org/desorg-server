// functions for each call of the api on admin. Use the user model

'use strict'

// add the user model
const User = require('../../models/user')
const Lang = require('../../models/lang')
const crypt = require('../../services/crypt')
const fs = require('fs');
const serviceEmail = require('../../services/email')

/**
 * @api {post} https://health29.org/api/admin/lang/ Request new translation file
 * @apiName requestLangFile
 * @apiPrivate
 * @apiDescription This method request by email a new translation. Only admins could make this request.
 * @apiGroup Languages
 * @apiVersion 1.0.0
 * @apiExample {js} Example usage:
 *   var params = <userId>
 *   var body = { lang: <lang_code>, jsonData: <json assets format> }
 *   this.http.post('https://health29.org/api/admin/lang'+params,body)
 *    .subscribe( (res : any) => {
 *      console.log('Request new translation ok');
 *     }, (err) => {
 *      ...
 *     }
 * // -----------------------------------------------------------------------
 * // Example Json assets format
 * {
 *   "menu":{
 *     "Dashboard": "Home"
 *     "Login": "Login",
 *     "Register": "Register",
 *     "Forgot Password": "Forgot password",
 *     "New Password": "New password",
 *   },
 *   "profile":{
 * 	  "Save the changes": "Please, save the changes",
 *   }
 * }
 * 
 * @apiHeader {String} authorization Users unique access-key. For this, go to  [Get token](#api-Access_token-signIn)
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciPgDIUzI1NiJ9.eyJzdWIiOiI1M2ZlYWQ3YjY1YjM0ZTQ0MGE4YzRhNmUyMzVhNDFjNjEyOThiMWZjYTZjMjXkZTUxMTA9OGVkN2NlODMxYWY3IiwiaWF0IjoxNTIwMzUzMDMwLCJleHAiOjE1NTE4ODkwMzAsInJvbGUiOiJVc2VyIiwiZ3JvdDEiOiJEdWNoZW5uZSBQYXJlbnQgUHJfrmVjdCBOZXRoZXJsYW5kcyJ9.MloW8eeJ857FY7-vwxJaMDajFmmVStGDcnfHfGJx05k"
 *     }
 * 
 * @apiParam {String} patientId Patient unique ID. More info here:  [Get patientId](#api-Patients-getPatientsUser)
 * @apiParam {Object} userId The user unique id.
 * @apiParam (body) {String} code The language code, i.e "en" or "nl".
 * @apiParam (body) {Object} jsonData A json object like assets/i18n/en.json.
 * @apiSuccess {Object} Result Returns a message with information about the execution
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 *  {
 * 		"message":'Request for new translation sent'
 * 	}
 * 
 * 
 */
async function requestLangFile (req, res){
	try {
		let userId= crypt.decrypt(req.params.userId);
		let lang = req.body.lang;
		let jsonData = req.body.jsonData;
		const user = await User.findById(userId).select("-password -__v -confirmationCode -loginAttempts -confirmed -lastLogin");
		if(!user) return res.status(404).send({code: 208, message: 'The user does not exist'})

		if(user.role == 'Admin'){
			try {
				await serviceEmail.sendMailRequestNewTranslation(user, lang, JSON.stringify(jsonData))
				return res.status(200).send({message: 'Request for new translation sent'})
			} catch (response) {
				res.status(500).send({ message: 'Fail sending email'})
			}
		}else{
			res.status(401).send({message: 'without permission'})
		}
	} catch (err) {
		return res.status(500).send({message: 'Error making the request:'})
	}
}
/**
 * @api {put} https://health29.org/api/admin/lang/ Request new language for the platform texts
 * @apiName requestaddlang
 * @apiDescription This method request by email a new language for the platform texts. Only admins could make this request.
 * @apiGroup Languages
 * @apiVersion 1.0.0
 * @apiExample {js} Example usage:
 *   var params = userId
 *   var body = { code: <lang_code>, name: <lang_name> }
 *   this.http.put('https://health29.org/api/admin/lang'+params,body)
 *    .subscribe( (res : any) => {
 *      console.log('Request new language ok');
 *     }, (err) => {
 *      ...
 *     }
 * 
 * @apiHeader {String} authorization Users unique access-key. For this, go to  [Get token](#api-Access_token-signIn)
 * @apiHeaderExample {json} Header-Example:
 *     {
 *       "authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciPgDIUzI1NiJ9.eyJzdWIiOiI1M2ZlYWQ3YjY1YjM0ZTQ0MGE4YzRhNmUyMzVhNDFjNjEyOThiMWZjYTZjMjXkZTUxMTA9OGVkN2NlODMxYWY3IiwiaWF0IjoxNTIwMzUzMDMwLCJleHAiOjE1NTE4ODkwMzAsInJvbGUiOiJVc2VyIiwiZ3JvdDEiOiJEdWNoZW5uZSBQYXJlbnQgUHJfrmVjdCBOZXRoZXJsYW5kcyJ9.MloW8eeJ857FY7-vwxJaMDajFmmVStGDcnfHfGJx05k"
 *     }
 * @apiParam {Object} userId The user unique id.
 * @apiParam (body) {String} code The language code, i.e "en" or "nl".
 * @apiParam (body) {String} name The language name, i.e "English".
 * @apiSuccess {Object} Result Returns a message with information about the execution
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 *  {
 * 		"message":'request for new language sent'
 * 	}
 * 
 * 
 */
async function requestaddlang (req, res){
	try {
		let userId= crypt.decrypt(req.params.userId);
		const user = await User.findById(userId).select("-password -__v -confirmationCode -loginAttempts -confirmed -lastLogin");
		if(!user) return res.status(404).send({code: 208, message: 'The user does not exist'})

		if(user.role == 'Admin'){
			let code = req.body.code;
			const langfound = await Lang.findOne({ 'code': code });
			if(langfound) return res.status(200).send({message: 'already exists'})

			let name = req.body.name;
			try {
				await serviceEmail.sendMailRequestNewLanguage(user, name, code)
				return res.status(200).send({message: 'request for new language sent'})
			} catch (response) {
				res.status(500).send({ message: 'Fail sending email'})
			}
		}else{
			res.status(401).send({message: 'without permission'})
		}
	} catch (err) {
		return res.status(500).send({message: 'Error making the request:'})
	}
}

module.exports = {
	requestLangFile,
	requestaddlang
}
