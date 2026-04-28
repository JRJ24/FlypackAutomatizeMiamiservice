import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import userModel from "../models/Users.model";
// import { sendAdminNewUserNotification, sendWelcomeEmail } from "../helpers/";

const authGoogle = () => {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_ID || "";
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_SECRET || "";
  const CALLBACK_URL =
    process.env.GOOGLE_CALLBACK ||
    "http://localhost:5173/api/auth/google/callback";

  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: CALLBACK_URL, // ← IMPORTANTE: Debe coincidir con Google Console
        scope: ["profile", "email"],
        passReqToCallback: false,
      },
      async (accessToken, refreshToken, profile, cb) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return cb(new Error("No email found in Google profile"));
          }

          let user = await userModel.findOne({ email }).exec();

          if (!user) {
            user = await userModel.create({
              name: profile.displayName,
              email: email,
              googleId: profile.id,
              mustchangePassword: false,
              isActive: true,
              isDelete: false,
            });

            // sendWelcomeEmail(user);

            const params = {
              newUserName: user.name,
              newUserEmail: user.email,
            }

            // sendAdminNewUserNotification(params);
          }

          return cb(null, user);
        } catch (err) {
          return cb(err as Error);
        }
      },
    ),
  );

  // Serialización necesaria (aunque uses session: false)
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await userModel.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
};

export { authGoogle };