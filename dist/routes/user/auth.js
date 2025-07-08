import { config } from "dotenv";
import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as GoogleStrategy, } from "passport-google-oauth20";
import { db } from "../../lib/db.js";
import { isLoggedIn, optionalAuth } from "../../middlewares/auth.js";
import { Router } from "express";
import { signup, signin, forgotPassword, logout, getUserId, getUserData, } from "../../controllers/user/auth.js";
config();
const router = Router();
const googleStrategyOptions = {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.FRONTEND_URL}/api/auth/google/callback`,
    scope: ["profile", "email"],
    passReqToCallback: true,
};
const verifyCallback = async (req, accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        const existingUser = await db.user.findUnique({ where: { email } });
        if (existingUser) {
            return done(null, existingUser, { isNew: false });
        }
        const baseUsername = email
            .split("@")[0]
            .replace(/[^a-zA-Z0-9._-]/g, "")
            .toLowerCase();
        let username = baseUsername;
        let suffix = 1;
        while (await db.user.findUnique({ where: { username } })) {
            username = `${baseUsername}${suffix}`;
            suffix++;
        }
        const newUser = await db.user.create({
            data: {
                name: profile.displayName,
                pfp: profile.photos[0].value,
                email: email,
                provider: "GOOGLE",
                username,
            },
        });
        done(null, newUser, { isNew: true });
    }
    catch (error) {
        console.error("ERROR_WHILE_AUTHENTICATING_TO_GOOGLE", error);
        return done(error, null);
    }
};
passport.use(new GoogleStrategy(googleStrategyOptions, verifyCallback));
// Get Google auth scrren
router.get("/google", (req, res, next) => {
    const { redirectUrl } = req.query;
    const state = encodeURIComponent(JSON.stringify({ redirectUrl }));
    passport.authenticate("google", {
        session: false,
        scope: ["profile", "email"],
        state,
    })(req, res, next);
});
// Google auth callback route
router.get("/google/callback", (req, res, next) => {
    passport.authenticate("google", { session: false }, (err, user, info) => {
        if (err) {
            console.error("ERROR_IN_GOOGLE_CALLBACK", err);
            return res.redirect("/login?error=google_auth_failed");
        }
        if (!user) {
            return res.redirect("/login?error=user_not_found");
        }
        const { state } = req.query;
        if (!state) {
            return res.redirect("/login?error=missing_state");
        }
        const { redirectUrl } = JSON.parse(decodeURIComponent(state));
        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: "none",
        });
        if (info.isNew) {
            res.redirect(`${process.env.FRONTEND_URL}/user/auth/user-details`);
        }
        else {
            res.redirect(redirectUrl);
        }
    })(req, res, next);
});
// Get User data
router.get("/user-data", optionalAuth, getUserData);
// User Get Id route
router.get("/get-id", isLoggedIn, getUserId);
// User logout route
router.get("/logout", isLoggedIn, logout);
// User signup route
router.post("/signup", signup);
// User signin route
router.post("/signin", signin);
// forgot password route
router.post("/forgot-password", forgotPassword);
export default router;
