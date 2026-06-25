// functions for each call of the api on admin. Use the user model

'use strict'

// add the user model
const User = require('../../models/user')
const Lang = require('../../models/lang')
const crypt = require('../../services/crypt')
const fs = require('fs');
const translate = require('@iamtraction/google-translate');

async function updateLangFile (req, res){
	try {
		let userId= crypt.decrypt(req.params.userId);
		let lang = req.body.lang;
		let jsonData = req.body.jsonData;
		const user = await User.findById(userId).select("-password -__v -confirmationCode -loginAttempts -lastLogin");
		if(!user) return res.status(404).send({code: 208, message: 'The user does not exist'})

		if(user.role == 'SuperAdmin'){
			fs.writeFile('./dist/assets/i18n/'+lang+'.json', JSON.stringify(jsonData), (err) => {
				if (err) {
					res.status(403).send({message: 'not uploaded'})
				}

				res.status(200).send({message: 'uploaded'})
			});
		}else{
			res.status(401).send({message: 'without permission'})
		}
	} catch (err) {
		return res.status(500).send({message: 'Error making the request:'})
	}
}

async function addlang (req, res){
	try {
		let userId= crypt.decrypt(req.params.userId);
		const user = await User.findById(userId).select("-password -__v -confirmationCode -loginAttempts -lastLogin");
		if(!user) return res.status(404).send({code: 208, message: 'The user does not exist'})

		if(user.role == 'SuperAdmin'){
			let code = req.body.code;
			let name = req.body.name;
			const langfound = await Lang.findOne({ 'code': code });
			if(langfound) return res.status(200).send({message: 'already exists'})

			var objToTranslate = JSON.parse(fs.readFileSync('./dist/assets/i18n/en.json', 'utf8'));
			await processObj(objToTranslate, code, name, res);
		}else{
			res.status(401).send({message: 'without permission'})
		}
	} catch (err) {
		return res.status(500).send({message: 'Error making the request:'})
	}
}


async function processObj(obj, code, name, res){

	var keys=Object.keys(obj);
	var result = {};
	for (var i = 0; i < keys.length; i++) {
		var keysLevel2 = Object.keys(obj[keys[i]]);
		result = await processObj2(obj, keys, keysLevel2, i, code);
	}

	fs.writeFile('./dist/assets/i18n/'+code+'.json', JSON.stringify(result.data), async (err) => {
		if (err) {
			return res.status(403).send({message: 'not added'})
		}

		try {
			let lang = new Lang()
			lang.name = name
			lang.code = code
			await lang.save()
			res.status(200).send({message: 'added', isSupported: result.isSupported})
		} catch (saveErr) {
			res.status(500).send({message: `Failed to save in the database: ${saveErr} `})
		}
	});
}

async function processObj2(obj2, keys, keysLevel2, i, code){
	var supported = true;
	for (var j = 0; j < keysLevel2.length && supported; j++) {
		var keysLevel3 = Object.keys(obj2[keys[i]][keysLevel2[j]]);
		console.log(typeof(obj2[keys[i]][keysLevel2[j]]));
		if(typeof(obj2[keys[i]][keysLevel2[j]]) == 'string'){
			await translate(obj2[keys[i]][keysLevel2[j]], {from: 'en', to: code }).then(res => {
					obj2[keys[i]][keysLevel2[j]]= res.text;
			}).catch(err => {
				console.error(err);
				supported = false;

			});
		}else{
			var keysLevel3 = Object.keys(obj2[keys[i]][keysLevel2[j]]);
			obj2 = await processObj3(obj2, keys, keysLevel2, keysLevel3, i,  j, code);

		}

	}
	return {data:obj2, isSupported: supported };
}


async function processObj3(obj3, keys, keysLevel2, keysLevel3, i, j, code){
	for (var k = 0; k < keysLevel3.length; k++) {
		if(typeof(obj3[keys[i]][keysLevel2[j]][keysLevel3[k]]) == 'string'){
			await translate(obj3[keys[i]][keysLevel2[j]][keysLevel3[k]], {from: 'en', to: code }).then(res => {
				obj3[keys[i]][keysLevel2[j]][keysLevel3[k]]= res.text;
			}).catch(err => {
					console.error(err);
			});
		}else{
			var keysLevel4 = Object.keys(obj3[keys[i]][keysLevel2[j]][keysLevel3[k]]);
			obj3 = await processObj4(obj3, keys, keysLevel2, keysLevel3, keysLevel4, i,  j, k, code);
		}
	}
	return obj3;
}

async function processObj4(obj4, keys, keysLevel2, keysLevel3, keysLevel4,  i, j,k, code){
	for (var l = 0; l < keysLevel4.length; l++) {
			await translate(obj4[keys[i]][keysLevel2[j]][keysLevel3[k]][keysLevel4[l]], {from: 'en', to: code }).then(res => {
				obj4[keys[i]][keysLevel2[j]][keysLevel3[k]][keysLevel4[l]]= res.text;
			}).catch(err => {
					console.error(err);
			});
	}
	return obj4;
}


async function deletelang (req, res){
	try {
		var params= req.params.userIdAndLang;
		params = params.split("-code-");
		let userId= crypt.decrypt(params[0]);
		const user = await User.findById(userId).select("-password -__v -confirmationCode -loginAttempts -lastLogin");
		if(!user) return res.status(404).send({code: 208, message: 'The user does not exist'})

		if(user.role == 'SuperAdmin'){
			let code = params[1];

			fs.unlink('./dist/assets/i18n/'+code+'.json', async function(err){
				if(err) return res.status(403).send({message: 'fail'});

				try {
					const langFound = await Lang.findOne({code: code});
					if(langFound){
						await langFound.deleteOne();
						res.status(200).send({message: 'deleted'})
					}else{
						res.status(202).send({message: 'error, not found'})
					}
				} catch (deleteErr) {
					return res.status(500).send({message: `Error deleting the lang: ${deleteErr}`})
				}
			});
		}else{
			res.status(401).send({message: 'without permission'})
		}
	} catch (err) {
		return res.status(500).send({message: 'Error making the request:'})
	}
}

module.exports = {
	updateLangFile,
	addlang,
	deletelang
}
