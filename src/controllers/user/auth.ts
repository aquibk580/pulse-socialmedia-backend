import { Request, Response } from "express";
import { db } from "../../lib/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendOtpEmail } from "../../lib/OtpService.js";
import {
  userSchema,
  userSignInSchema,
  forgotPasswordSchema,
  verifySignupOTPSchema,
  verifySigninOTPSchema,
} from "../../schemas/userSchemas.js";
import { UserPayload } from "../../types/Payload.js";

interface User {
  name: string;
  email: string;
  password: string;
  username: string;
}

// Signup Controller
async function signup(req: Request, res: Response): Promise<void> {
  try {
    const userData: User = userSchema.parse(req.body);

    const existingUser = await db.user.findFirst({
      where: {
        OR: [{ email: userData.email }, { username: userData.username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === userData.email) {
        res
          .status(400)
          .json({ error: "Email already exists", flag: "UserExists" });
      } else {
        res
          .status(400)
          .json({ error: "Username already exists", flag: "UserNameExists" });
      }
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const user = await db.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        otp,
        otpExpiry,
      },
    });
    await sendOtpEmail(user.email, otp);

    const { password: _, ...safeUserData } = user;
    res.status(201).json({
      message: "User created successfully and OTP sent",
      user: safeUserData,
    });
    return;
  } catch (err: any) {
    if (err.name === "ZodError") {
      res.status(400).json({ error: err.errors }); // Validation errors
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" }); // General server error
    return;
  }
}

interface UserSignIn {
  email: string;
  password: string;
}

// Signin Controller
async function signin(req: Request, res: Response): Promise<void> {
  try {
    const userData: UserSignIn = await userSignInSchema.parse(req.body);

    const user = await db.user.findUnique({
      where: { email: userData.email },
    });

    if (
      !user ||
      !user.password ||
      !(await bcrypt.compare(userData.password, user.password))
    ) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    if (user.is2FAEnabled || !user.isVerified) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

      await db.user.update({
        where: { email: userData.email },
        data: { otp, otpExpiry },
      });

      await sendOtpEmail(user.email, otp);
      res.json({ message: "OTP sent", requiresOTP: true });
      return;
    } else {
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
      );
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.status(200).json({ token });
    }

    return;
  } catch (error: any) {
    console.error("Error during signin:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
}

async function clearOTP(email: string) {
  await db.user.update({
    where: { email },
    data: { otp: null, otpExpiry: null },
  });
}

// Verify Signin Controller
async function verifyOTP(req: Request, res: Response) {
  try {
    const MAX_ATTEMPTS = 3;
    const { email, otp } = await verifySigninOTPSchema.parse(req.body);
    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.otpExpiry && new Date() > user.otpExpiry) {
      await db.user.update({
        where: { email },
        data: { otp: null, otpExpiry: null, otpAttempts: 0 },
      });
      return res.status(400).json({ message: "OTP expired" });
    }

    if (user.otp !== otp) {
      const updatedAttempts = user.otpAttempts + 1;

      if (updatedAttempts >= MAX_ATTEMPTS) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
        await db.user.update({
          where: { email },
          data: { otp, otpExpiry, otpAttempts: 0 },
        });

        await sendOtpEmail(email, otp);
        res
          .status(400)
          .json({ message: "Too many invalid attempts. OTP reset." });
        return;
      } else {
        await db.user.update({
          where: { email },
          data: { otpAttempts: updatedAttempts },
        });
        return res.status(400).json({
          message: "Invalid OTP",
          attemptsLeft: MAX_ATTEMPTS - updatedAttempts,
        });
      }
    }

    await db.user.update({
      where: { email },
      data: { otp: null, otpExpiry: null, isVerified: true, otpAttempts: 0 },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  } catch (error: any) {
    console.error(error.message, "ERROR_WHILE_VERIFYING_OTP");
    res.status(500).json({ error: "Internal server error" });
    return;
  }
}

interface ForgotPassword {
  email: string;
  password: string;
  answer: string;
}

// Forgot password
async function forgotPassword(req: Request, res: Response) {
  try {
    const userData: ForgotPassword = await forgotPasswordSchema.parse(req.body);

    const user = await db.user.findUnique({
      where: {
        email: userData.email,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found", flag: "UserNotFound" });
      return;
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const updatedUser = await db.user.update({
      where: {
        email: userData.email,
      },
      data: {
        password: hashedPassword,
      },
    });

    const { password, ...safeUserData } = updatedUser;

    res.status(200).json({ user: safeUserData });
    return;
  } catch (err: any) {
    if (err.name === "ZodError") {
      res.status(400).json({ error: err.errors });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
}

// logout
async function logout(req: Request, res: Response) {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.status(200).json({ message: "Logged Out successfully" });
    return;
  } catch (error) {
    console.log("ERROR_WHILE_LOGOUT");
    res.status(500).json({ error: "Internal Sever Error" });
    return;
  }
}

// Get User ID
async function getUserId(req: Request, res: Response) {
  try {
    const currentUser = req.user as UserPayload;
    const id = currentUser.id;
    res.status(200).json(id);
    return;
  } catch (error: any) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
    return;
  }
}

// Get User Data
async function getUserData(req: Request, res: Response) {
  try {
    const currentUser = req.user as UserPayload;

    if (!currentUser) {
      res
        .status(401)
        .json({ error: "Unauthorized", user: null, authorized: false });
      return;
    }
    const user = await db.user.findUnique({
      where: { email: currentUser.email },
    });

    if (!user) {
      res
        .status(404)
        .json({ error: "User not found", user: null, authorized: false });
      return;
    }

    res.status(200).json({
      user,
      authorized: true,
    });
    return;
  } catch (error) {
    console.error("ERROR_WHILE_GETTING_USER_DATA", error);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
}

export {
  signup,
  signin,
  forgotPassword,
  verifyOTP,
  logout,
  getUserId,
  getUserData,
};
