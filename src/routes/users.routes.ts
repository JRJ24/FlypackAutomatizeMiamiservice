import * as Users from './../controllers/Users.controller'
import multer from 'multer'
const { check } = require("express-validator");
import { validatJWT } from './../middlewares/token';
import { authorize, ROLE_GROUPS } from '../middlewares/authorize';
import express = require('express');

const userRouter: express.Router = express.Router();


userRouter.get(
	'/get',
	validatJWT,
	authorize(...ROLE_GROUPS.admin),
	Users.GetUsers,
)

userRouter.get(
	'/get2',
	validatJWT,
	authorize(...ROLE_GROUPS.operations),
	Users.getUserClient,
)

userRouter.delete(
	'/delete',
	validatJWT,
	authorize(...ROLE_GROUPS.admin),
	Users.deletedUser
)

userRouter.patch(
	'/activeDisabled',
	validatJWT,
	authorize(...ROLE_GROUPS.admin),
	Users.disableUser
)

userRouter.post(
	'/',
	validatJWT,
	authorize(...ROLE_GROUPS.admin),
	Users.createUser,
)

userRouter.put(
	'/',
	validatJWT,
	authorize(...ROLE_GROUPS.admin),
	Users.updatePutUser
)

userRouter.patch(
	'/updateEmail',
	validatJWT,
	authorize(...ROLE_GROUPS.admin),
	Users.updateEmail
)

userRouter.patch(
	'/updatePassword',
	validatJWT,
	authorize(...ROLE_GROUPS.admin),
	Users.updatePassword
)



export default userRouter;
