// file that contains the routes of the api
'use strict'

const express = require('express')

const userCtrl = require('../controllers/all/user')
const langCtrl = require('../controllers/all/lang')

const deleteAccountCtrl = require('../controllers/user/delete')


const superAdmninLangCtrl = require('../controllers/superadmin/lang')
const admninLangCtrl = require('../controllers/admin/lang')

const supportCtrl = require('../controllers/all/support')

const feedbackDevCtrl = require('../controllers/all/feedback_dev')


const auth = require('../middlewares/auth')
const roles = require('../middlewares/roles')
const api = express.Router()

// user routes, using the controller user, this controller has methods
//routes for login-logout
api.post('/signup', userCtrl.signUp)
api.post('/signin', userCtrl.signIn)

// activarcuenta
api.post('/activateuser', userCtrl.activateUser)
api.post('/sendEmail', userCtrl.sendEmail)

// recuperar password
api.post('/recoverpass', userCtrl.recoverPass)
api.post('/updatepass', userCtrl.updatePass)
api.post('/newpass', auth(roles.All), userCtrl.newPass)

api.get('/users/:userId', auth(roles.All), userCtrl.getUser)
api.get('/users/settings/:userId', auth(roles.All), userCtrl.getSettings)
api.put('/users/:userId', auth(roles.AllLessResearcher), userCtrl.updateUser)
api.delete('/users/:userId', auth(roles.AllLessResearcher), userCtrl.deleteUser)//de momento no se usa
api.get('/users/name/:userId', auth(roles.All), userCtrl.getUserName)
api.get('/users/email/:userId', auth(roles.All), userCtrl.getUserEmail)

//delete account
api.post('/deleteaccount/:userId', auth(roles.All), deleteAccountCtrl.deleteAccount)


//superadmin routes, using the controllers of folder Admin, this controller has methods
api.post('/superadmin/lang/:userId', auth(roles.SuperAdmin), superAdmninLangCtrl.updateLangFile)
///no se usa las 2 siguientes
//api.put('/superadmin/langs/:userId', auth, superAdmninLangCtrl.langsToUpdate)
//api.put('/admin/lang/:userId', auth, superAdmninLangCtrl.addlang)
api.put('/superadmin/lang/:userId', auth(roles.SuperAdmin), function(req, res){
  req.setTimeout(0) // no timeout
  superAdmninLangCtrl.addlang(req, res)
})
api.delete('/superadmin/lang/:userIdAndLang', auth(roles.SuperAdmin), superAdmninLangCtrl.deletelang)

api.post('/admin/lang/:userId', auth(roles.Admin), admninLangCtrl.requestLangFile)
api.put('/admin/lang/:userId', auth(roles.Admin), admninLangCtrl.requestaddlang)

// lang routes, using the controller lang, this controller has methods
api.get('/langs/',  langCtrl.getLangs)



//Support
api.post('/support/', auth(roles.UserClinicalSuperAdmin), supportCtrl.sendMsgSupport)
api.post('/homesupport/', supportCtrl.sendMsgLogoutSupport)

api.get('/support/:userId', auth(roles.UserClinicalSuperAdmin), supportCtrl.getUserMsgs)
api.put('/support/:supportId', auth(roles.SuperAdmin), supportCtrl.updateMsg)
api.get('/support/all/:userId', auth(roles.SuperAdmin), supportCtrl.getAllMsgs)

//service feedback
api.post('/feedbackdev', auth(roles.UserClinicalSuperAdmin), feedbackDevCtrl.sendMsgDev)


/*api.get('/testToken', auth, (req, res) => {
	res.status(200).send(true)
})*/
//ruta privada
api.get('/private', auth(roles.AllLessResearcher), (req, res) => {
	res.status(200).send({ message: 'You have access' })
})

module.exports = api
