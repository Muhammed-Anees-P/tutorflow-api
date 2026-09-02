import { SignOptions } from 'jsonwebtoken';

export const JWT_CONSTANTS: {
  secret: string;
  expiresIn: SignOptions['expiresIn'];
} = {
  secret: process.env.JWT_SECRET || 'your_jwt_secret',
  expiresIn: (process.env.JWT_EXPIRY || '7d') as SignOptions['expiresIn'],
};
