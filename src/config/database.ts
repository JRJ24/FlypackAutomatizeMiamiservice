const mongoose = require('mongoose');
import { config } from "./env";

const dbConnection = async () => {
	try {
		await mongoose.set('strictQuery', false);

		await mongoose.connect(config.mongodbUri);
		return;
	} catch (error) {
		throw error;
	}
}

export { dbConnection };
