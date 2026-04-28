import * as Users from './../controllers/Users.controller'
import multer from 'multer'
const { check } = require("express-validator");
import { validatJWT, deleteJWT, generateJWT } from './../middlewares/token';
import express = require('express');

const userRouter: express.Router = express.Router();


userRouter.get(
	'/get',
	validatJWT,
	Users.GetUsers,
)

userRouter.delete(
	'/delete',
	validatJWT,
	Users.deletedUser
)

userRouter.patch(
	'/activeDisabled',
	validatJWT,
	Users.disableUser
)

userRouter.post(
	'/',
	// generateJWT,
	Users.createUser,
)

userRouter.put(
	'/',
	validatJWT,
	Users.updatePutUser
)

userRouter.patch(
	'/updateEmail',
	validatJWT,
	Users.updateEmail
)

userRouter.patch(
	'/updatePassword',
	validatJWT,
	Users.updatePassword
)



export default userRouter;