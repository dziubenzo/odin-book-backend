import passport from 'passport';
import {
  ExtractJwt,
  Strategy as JwtStrategy,
  type StrategyOptionsWithoutRequest,
} from 'passport-jwt';
import User from '../models/User';

const options: StrategyOptionsWithoutRequest = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET!,
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

// Check if user is authenticated
export const checkAuth = passport.authenticate('jwt', { session: false });
