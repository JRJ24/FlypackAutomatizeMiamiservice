import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

const hashPassword = async(password: string) => {
    return await bcrypt.hash(password, SALT_ROUNDS);
}

export {hashPassword};