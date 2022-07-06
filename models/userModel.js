const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'user', 'lead-guide', 'guide'],
      message: '{VALUE} is not supported',
    },
    default: 'user',
    required: [true, 'A user must have a role'],
  },
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },

  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    // required mean required input. It will not be persisted in DB (see below in save middleware)
    required: [true, 'Please confirm your password'],
    validate: {
      // this only works on CREATE and SAVE !!! not on UPDATE
      validator: function (val) {
        return val === this.password;
      },
      message: 'Password and password confirmation are not the same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
});

userSchema.pre(/^find/, function (next) {
  // 'this' points to the query middleware
  this.find({ active: true });
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  // hash the password with CPU cost of 12.
  this.password = await bcrypt.hash(this.password, 12);

  // delete the confirm and avoid persisting it ...
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  // this.isNew is true when it is a new document that is being saved

  this.passwordChangedAt = Date.now() - 1000;
  // this 1000 makes sure the JWT is always created AFTER the password has beenchanged, which is marked by passwordChangedAt. Otherwise, the JWT would be invalid, since it would have been issued BEFORE the password has been changed, and token are not valid anymore if the password has been changed)
  // since database.save might take a little while, we put it 1000 milliseconds before and make sure this will not happen

  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  // this.password not available since select:false for this field
  return await bcrypt.compare(candidatePassword, userPassword);
};

// check if the user has changed his password after the JWT token has been issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    // if this prop does not exist, the user has not changed the password at all
    // but in this block, the user DID change his password

    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    // console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp;
  }

  // false means NOT CHANGED
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  console.log({ resetToken }, this.passwordResetToken);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
