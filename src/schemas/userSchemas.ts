import z, { ZodSchema } from "zod";

const userSchema: ZodSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  username: z.string().min(1, "User Name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
});

const userSignInSchema: ZodSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const forgotPasswordSchema: ZodSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  answer: z.string().min(1, "Answer to security quetion is required"),
});

const verifySignupOTPSchema: ZodSchema = z.object({
  email: z.string().email("invalid email format"),
  otp: z.string().length(6, "OTP must be 6 characters long"),
});

const verifySigninOTPSchema: ZodSchema = z.object({
  email: z.string().email("invalid email format"),
  otp: z.string().length(6, "OTP must be 6 characters long"),
});

export {
  userSchema,
  userSignInSchema,
  forgotPasswordSchema,
  verifySigninOTPSchema,
  verifySignupOTPSchema,
};
