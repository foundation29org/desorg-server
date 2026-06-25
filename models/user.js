// user schema
'use strict'

const mongoose = require('mongoose')
const Schema = mongoose.Schema
const bcrypt = require('bcryptjs')

const { conndbaccounts } = require('../db_connect')

const MAX_LOGIN_ATTEMPTS = 5
const LOCK_TIME = 2 * 60 * 60 * 1000

const UserSchema = Schema({
	email: {
		type: String,
		index: true,
		trim: true,
		lowercase: true,
		unique: true,
		required: 'Email address is required',
		match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
	},
	password: { type: String, select: false, required: true, minlength: [8, 'Password too short'] },
	role: { type: String, required: true, enum: ['User', 'Clinical', 'Admin'], default: 'User' },
	subrole: String,
	group: { type: String, required: true, default: 'None' },
	confirmed: { type: Boolean, default: false },
	confirmationCode: String,
	signupDate: { type: Date, default: Date.now },
	lastLogin: { type: Date, default: null },
	userName: { type: String, default: '' },
	lastName: { type: String, default: '' },
	loginAttempts: { type: Number, required: true, default: 0 },
	lockUntil: { type: Number },
	lang: { type: String, required: true, default: 'en' },
	randomCodeRecoverPass: String,
	dateTimeRecoverPass: Date,
	massunit: { type: String, required: true, default: 'kg' },
	lengthunit: { type: String, required: true, default: 'cm' },
	blockedaccount: { type: Boolean, default: false },
	permissions: { type: Object, default: {} },
	platform: { type: String, default: '' },
	countryselectedPhoneCode: { type: String, default: '' },
	phone: { type: String, default: '' },
	provider: { type: String, default: '' }
})



UserSchema.virtual('isLocked').get(function () {
	// check for a future lockUntil timestamp
	return !!(this.lockUntil && this.lockUntil > Date.now());
});

UserSchema.pre('save', function (next) {
	let user = this
	if (!user.isModified('password')) return next()

	bcrypt.genSalt(10, (err, salt) => {
		if (err) return next(err)

		bcrypt.hash(user.password, salt, (err, hash) => {
			if (err) return next(err)

			user.password = hash
			next()
		})
	})
})

UserSchema.methods.comparePassword = function (candidatePassword, cb) {
	bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
		cb(err, isMatch)
	});
}

UserSchema.methods.incLoginAttempts = async function () {
	// if we have a previous lock that has expired, restart at 1
	if (this.lockUntil && this.lockUntil < Date.now()) {
		return this.updateOne({
			$set: { loginAttempts: 1 },
			$unset: { lockUntil: 1 }
		});
	}
	// otherwise we're incrementing
	var updates = { $inc: { loginAttempts: 1 } };
	// lock the account if we've reached max attempts and it's not locked already
	if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
		updates.$set = { lockUntil: Date.now() + LOCK_TIME };
	}
	return this.updateOne(updates);
};

// expose enum on the model, and provide an internal convenience reference
var reasons = UserSchema.statics.failedLogin = {
	NOT_FOUND: 0,
	PASSWORD_INCORRECT: 1,
	MAX_ATTEMPTS: 2,
	UNACTIVATED: 3,
	BLOCKED: 4,
	WRONG_PLATFORM: 5
};

UserSchema.statics.getAuthenticated = function (email, password, cb) {
	const self = this;
	const reasons = UserSchema.statics.failedLogin;
	(async () => {
		try {
			const user = await self.findOne({ email: email }).select('_id email +password loginAttempts lockUntil confirmed lastLogin role subrole userName lang randomCodeRecoverPass dateTimeRecoverPass group blockedaccount permissions platform shared');
			if (!user) {
				return cb(null, null, reasons.NOT_FOUND);
			}
			console.log(user.role);
			if (user.role != 'User' && user.role != 'Admin' && user.role != 'SuperAdmin') {
				return cb(null, null, reasons.WRONG_PLATFORM);
			}
			if (!user.confirmed) {
				return cb(null, null, reasons.UNACTIVATED);
			}
			if (user.blockedaccount) {
				return cb(null, null, reasons.BLOCKED);
			}
			if (user.isLocked) {
				await user.incLoginAttempts();
				return cb(null, null, reasons.MAX_ATTEMPTS);
			}

			user.comparePassword(password, async (err, isMatch) => {
				if (err) return cb(err);

				if (isMatch) {
					try {
						if (!user.loginAttempts && !user.lockUntil) {
							await user.updateOne({ $set: { lastLogin: Date.now() } });
						} else {
							await user.updateOne({
								$set: { loginAttempts: 0, lastLogin: Date.now() },
								$unset: { lockUntil: 1 }
							});
						}
						return cb(null, user);
					} catch (updateErr) {
						return cb(updateErr);
					}
				}

				try {
					await user.incLoginAttempts();
					return cb(null, null, reasons.PASSWORD_INCORRECT);
				} catch (incErr) {
					return cb(incErr);
				}
			});
		} catch (err) {
			cb(err);
		}
	})();
};

module.exports = conndbaccounts.model('User', UserSchema)
// we need to export the model so that it is accessible in the rest of the app
