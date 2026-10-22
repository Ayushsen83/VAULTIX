
const argon2 = require("argon2");
const pool = require("../db");

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, phonenumber, age } = req.body;

    // 1. Validate required fields
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // 2. Validate name and email
    if (normalizedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name must not exceed 100 characters.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      normalizedEmail.length > 255 ||
      !emailRegex.test(normalizedEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // 3. Validate password
    if (password.length < 12 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 12 and 128 characters.",
      });
    }

    // 4. Validate optional phone number
    let phone = null;

    if (phonenumber !== undefined && phonenumber !== null) {
      if (
        typeof phonenumber !== "string" ||
        phonenumber.trim().length > 20
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone number.",
        });
      }

      phone = phonenumber.trim() || null;
    }

    // 5. Validate optional age
    let userAge = null;

    if (age !== undefined && age !== null && age !== "") {
      userAge = Number(age);

      if (
        !Number.isInteger(userAge) ||
        userAge < 1 ||
        userAge > 120
      ) {
        return res.status(400).json({
          success: false,
          message: "Age must be an integer between 1 and 120.",
        });
      }
    }

    // 6. Check whether the email already exists
    const existingUser = await pool.query(
      "SELECT user_id FROM users WHERE email = $1 LIMIT 1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // 7. Hash password using Argon2id
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    // 8. Create the user in PostgreSQL
    const result = await pool.query(
      `INSERT INTO users
        (name, email, password_hash, phonenumber, age)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, name, email, phonenumber, age, created_at`,
      [
        normalizedName,
        normalizedEmail,
        passwordHash,
        phone,
        userAge,
      ]
    );

    // 9. Return safe user data (never return the password hash)
    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      user: result.rows[0],
    });
  } catch (error) {
    // Handle concurrent attempts to register the same email
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    next(error);
  }
};

module.exports = { registerUser };
