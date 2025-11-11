const {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendEmailVerification,
    sendPasswordResetEmail
} = require('../config/firebase');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const auth = getAuth();
class FirebaseAuthController {
    async registerUser(req, res) {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(422).json({
        firstName: !firstName ? 'First name is required' : undefined,
        lastName: !lastName ? 'Last name is required' : undefined,
        email: !email ? 'Email is required' : undefined,
        password: !password ? 'Password is required' : undefined,
      });
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUid = userCredential.user.uid;

    try {
      await prisma.users.create({
        data: { firstName, lastName, email, firebaseUid, roleId: BigInt(5) }, // BigInt per schema
      });
    } catch (dbError) {
      console.error('DB error:', dbError);
      if (dbError.code === 'P2002') {
        return res.status(409).json({ message: 'User already exists' });
      }
      return res.status(500).json({ message: 'Error saving to the database!' });
    }

    await sendEmailVerification(userCredential.user);
    return res
      .status(201)
      .json({ message: 'Verification email sent! User created successfully!' });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
}

    loginUser(req, res) {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(422).json({
                email: "Email is required",
                password: "Password is required",
            });
        }
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const idToken = userCredential._tokenResponse.idToken
                if (idToken) {
                    res.cookie('access_token', idToken, {
                        httpOnly: true
                    });
                    res.status(200).json({ message: "User logged in successfully", userCredential });
                } else {
                    res.status(500).json({ error: "Internal Server Error" });
                }
            })
            .catch((error) => {
                console.error(error);
                const errorMessage = error.message || "An error occurred while logging in";
                res.status(500).json({ error: errorMessage });
            });
    }
    logoutUser(req, res) {
        signOut(auth)
            .then(() => {
                res.clearCookie('access_token');
                res.status(200).json({ message: "User logged out successfully" });
            })
            .catch((error) => {
                console.error(error);
                res.status(500).json({ error: "Internal Server Error" });
            });
    }
    resetPassword(req, res) {
        const { email } = req.body;
        if (!email) {
            return res.status(422).json({
                email: "Email is required"
            });
        }
        sendPasswordResetEmail(auth, email)
            .then(() => {
                res.status(200).json({ message: "Password reset email sent successfully!" });
            })
            .catch((error) => {
                console.error(error);
                res.status(500).json({ error: "Internal Server Error" });
            });
    }
}

module.exports = new FirebaseAuthController();