import jwt from "jsonwebtoken";

export const createToken = (user) => {
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};
