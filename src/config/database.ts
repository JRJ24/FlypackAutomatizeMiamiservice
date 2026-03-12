const mongoose = require('mongoose');

const dbConnection = async () => {
	try {
		await mongoose.set('strictQuery', false);

		if(process.env.NODE_ENV === 'DEV'){
			await mongoose.connect(process.env.DB_CONN_DEV);
			return;
		}

		await mongoose.connect(process.env.DB_CONN_PROD);
		return;
	} catch (error) {
		throw new Error('Error starting the database');
	}
}

export { dbConnection };