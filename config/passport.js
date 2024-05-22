import User from '../models/User.js';

import { Strategy as JwtStrategy } from 'passport-jwt';
import { ExtractJwt } from 'passport-jwt';

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

export const jwtStrategy = new JwtStrategy(options, async (payload, done) => {
  const match = await User.findOne({ _id: payload.id }, '-password')
    .lean()
    .exec();
  if (match) {
    return done(null, match);
  }
  return done(null, false);
});
