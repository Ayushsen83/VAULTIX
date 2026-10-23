const argon2 = require("argon2");
const pool = require("../db");

const getMyProfile = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         user_id,
         name,
         email,
         phonenumber,
         age,
         created_at
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [req.user.user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const { name, phonenumber, age } = req.body ?? {};

    // Reject empty or unexpected request bodies.
    if (
      !req.body ||
      typeof req.body !== "object" ||
      Array.isArray(req.body)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid JSON object is required.",
      });
    }

    const allowedFields = ["name", "phonenumber", "age"];
    const suppliedFields = Object.keys(req.body);

    if (
      suppliedFields.length === 0 ||
      suppliedFields.some((field) => !allowedFields.includes(field))
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide valid profile fields to update.",
      });
    }

    // Validate only fields the user supplied.
    if (
      Object.hasOwn(req.body, "name") &&
      (typeof name !== "string" ||
        !name.trim() ||
        name.trim().length > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Name must contain 1–100 characters.",
      });
    }

    if (
      Object.hasOwn(req.body, "phonenumber") &&
      phonenumber !== null &&
      (typeof phonenumber !== "string" ||
        phonenumber.trim().length > 20)
    ) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be a string of at most 20 characters or null.",
      });
    }

    if (Object.hasOwn(req.body, "age")) {
      const validAge =
        age === null ||
        (Number.isInteger(age) && age >= 1 && age <= 120);

      if (!validAge) {
        return res.status(400).json({
          success: false,
          message: "Age must be an integer between 1 and 120, or null.",
        });
      }
    }

    // Build the update using fixed, server-controlled SQL fragments.
    const updates = [];
    const values = [];
    let index = 1;

    if (Object.hasOwn(req.body, "name")) {
      values.push(name.trim());
      updates.push(`name = $${index++}`);
    }

    if (Object.hasOwn(req.body, "phonenumber")) {
      values.push(
        typeof phonenumber === "string" && phonenumber.trim()
          ? phonenumber.trim()
          : null
      );
      updates.push(`phonenumber = $${index++}`);
    }

    if (Object.hasOwn(req.body, "age")) {
      values.push(age);
      updates.push(`age = $${index++}`);
    }

    values.push(req.user.user_id);

    const result = await pool.query(
      `UPDATE users
       SET ${updates.join(", ")}
       WHERE user_id = $${index}
       RETURNING user_id, name, email, phonenumber, age, created_at`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
};


const changeMyPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body ?? {};

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !currentPassword ||
      newPassword.length < 12 ||
      newPassword.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Provide your current password and a new password of 12–128 characters.",
      });
    }

    const result = await pool.query(
      `SELECT password_hash
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [req.user.user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    const passwordMatches = await argon2.verify(
      result.rows[0].password_hash,
      currentPassword
    );

    if (!passwordMatches) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must differ from the current password.",
      });
    }

    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
    });

    await pool.query(
      `UPDATE users
       SET password_hash = $1
       WHERE user_id = $2`,
      [passwordHash, req.user.user_id]
    );

    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Please log in again if required.",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
};

