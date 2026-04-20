import axios from 'axios';
import { OAuth2Client } from 'google-auth-library';
import catchAsync from '../../utils/catchAsync';
import { Request, Response } from 'express';
import User from '../user/user.model';
import httpStatus  from 'http-status';
import AppError from '../../error/AppError';
import jwt, { JwtPayload, Secret  } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import config from '../../config';
import sendResponse from '../../utils/sendResponse';
import { authServices,  register, userResetPasswordService, } from './user.service';
import { UserRole } from '../user/user.interface';
// import { AuthServices } from './user.service';
import * as appleSignin from 'apple-signin-auth';
import { ApplePayload } from './user.interface';



// const googleClient = new OAuth2Client('23601987612-4e3n9lf08s8hnh0o9m8ag8n22f82u2ki.apps.googleusercontent.com'); // Replace with your Google Client ID
const googleClient = new OAuth2Client('23601987612-ko94q8ki1ui42igekam6f87kamceuvu4.apps.googleusercontent.com');







export const googleLogin = async (req: Request, res: Response) => {
  const { idToken, role } = req.body;

   if (!idToken) return res.status(400).json({ success: false, message: 'idToken required' });
   if (!role) return res.status(400).json({ success: false, message: 'Role required' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: '23601987612-ko94q8ki1ui42igekam6f87kamceuvu4.apps.googleusercontent.com',
    });

    const payload = ticket.getPayload();
    console.log('Google payload:', payload);
    if (!payload?.email) return res.status(400).json({ success: false, message: 'Invalid Google token' });

    let user = await User.findOne({ email: payload.email });
if (!user) {
  user = await User.create({
    email: payload.email,
    role: role,   // Google login এর সময় role কে dynamic করার জন্য
    fullName: payload.name,
    isVerified: true,
    accountType: 'google',
    // gender: 'Male',
    // password: '12231',
    // countryCode: '+880',
    // phoneNumber: '0172287587',
    image: {
      id: 'google', // যেকোনো default id
      url: payload.picture || 'https://i.ibb.co/z5YHLV9/profile.png',
    },
  });
}

    const accessToken = jwt.sign({ id: user._id, role: user.role }, config.jwt.jwt_access_secret as string, { expiresIn: '24h' });
    const refreshToken = jwt.sign({ id: user._id, role: user.role }, config.jwt.jwt_refresh_secret as string, { expiresIn: '7d' });

    res.json({ success: true, user, accessToken, refreshToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Google login failed', err });
  }
};


const userRegistration = catchAsync(async (req: Request, res: Response) => {
  const result = await register(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "User registered successfully",
    data: result,
  });
});






// const verifyEmailController = catchAsync(async (req: Request, res: Response) => {
//   const { email, otp } = req.body;

//   // verifyOtp service → OTP check + DB save
//   const user = await authServices.verifyEmail(email, Number(otp));

//   sendResponse(res, {
//     statusCode: httpStatus.CREATED,
//     success: true,
//     message: 'OTP verified successfully. User registration complete.',
//     data: {
//       _id: user._id,
//       email: user.email,
//       fullName: user.fullName,
//       phoneNumber: user.phoneNumber,
//       countryCode: user.countryCode,
//       gender: user.gender,
//       role: user.role,
//       isVerified: user.isVerified,
//     },
//   });
// });




const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  if (!user || !user?.password) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const isPasswordMatched = await bcrypt.compare(password, user.password);
  if (!isPasswordMatched) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Incorrect password');
  }

  const accessToken = jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    config.jwt.jwt_access_secret as Secret,
    { expiresIn: '24h' },
  );

  const refreshToken = jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    config.jwt.jwt_refresh_secret as Secret,
    { expiresIn: '7d' },
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Login successful',
    data: {
      user,
      accessToken,
      refreshToken,
    },
  });
});











const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const token = req.headers.token as string;
  const { newPassword } = req.body;

  if (!token) throw new AppError(httpStatus.UNAUTHORIZED, 'Token missing');

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(
      token,
      config.jwt.jwt_access_secret as Secret,
    ) as JwtPayload;
  } catch {
    throw new AppError(httpStatus.FORBIDDEN, 'Token expired or invalid');
  }

  if (!decoded?.id || !decoded?.allowReset) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'OTP not verified or reset not allowed',
    );
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  user.password = newPassword; // raw password
  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Password reset successfully',
    data: { user },
  });
});

// 3. Change Password - for logged-in users
const changePassword = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(userId).select('+password');
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch)
    throw new AppError(httpStatus.BAD_REQUEST, 'Old password is incorrect');

  // const hashedPassword = await bcrypt.hash(newPassword, 12);
  // user.password = hashedPassword;
  // await user.save();
  user.password = newPassword; // raw password
  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Password changed successfully',
    data: { user },
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Refresh token is required');
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      config.jwt.jwt_refresh_secret as Secret,
    ) as JwtPayload;
    const token = jwt.sign(
      { id: decoded.id, role: decoded.role },
      config.jwt.jwt_access_secret as Secret,
      { expiresIn: '24h' },
    );




    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Access token refreshed',
      data: { token },
    });
  } catch {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Invalid or expired refresh token',
    );
  }
});






export const facebookLogin = catchAsync(
  async (req: Request, res: Response) => {
    const { accessToken, role } = req.body;

    if (!accessToken) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Facebook accessToken is required',
      );
    }

      if (!role) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Role is required');
      }

    // 🔹 Get user info from Facebook
    const fbRes = await axios.get(
      'https://graph.facebook.com/me',
      {
        params: {
          fields: 'id,name,email',
          access_token: accessToken,
        },
      },
    );

    console.log('FB DATA:', fbRes.data);

    const { id, name, email } = fbRes.data;

    // 🔹 Fallback email (VERY IMPORTANT)
    const finalEmail = email || `${id}@facebook.com`;

    // 🔹 Find or create user
    let user = await User.findOne({ email: finalEmail });

    if (!user) {
      user = await User.create({
        email: finalEmail,
        role: role, // Facebook login এর সময় role কে dynamic করার জন্য
        fullName: name,
        accountType: 'facebook', // অবশ্যই দিতে হবে
        isVerified: true,
         image: {
         id: 'facebook', // যেকোনো default id
         url: fbRes.data.picture?.data?.url || 'https://i.ibb.co/z5YHLV9/profile.png',
        },
        // role: UserRole.customer,
      });
    }

    // 🔹 Generate JWT tokens
    const accessTokenJwt = jwt.sign(
      { id: user._id, role: user.role },
      config.jwt.jwt_access_secret as Secret,
      { expiresIn: '24h' },
    );

    const refreshToken = jwt.sign(
      { id: user._id, role: user.role },
      config.jwt.jwt_refresh_secret as Secret,
      { expiresIn: '7d' },
    );

    // 🔹 Send response
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Facebook login successful',
      data: {
        user,
        accessToken: accessTokenJwt,
        refreshToken,
      },
    });
  },
);



const linkedInLogin = catchAsync(async (req: Request, res: Response) => {
  const { accessToken, role } = req.body;

  if (!accessToken) {
    throw new AppError(httpStatus.BAD_REQUEST, "LinkedIn accessToken is required");
  }

  if (!role) {
    throw new AppError(httpStatus.BAD_REQUEST, "Role is required");
  }

  try {
    // 1. Get basic profile
    const profileRes = await axios.get("https://api.linkedin.com/v2/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // 2. Get email
    const emailRes = await axios.get(
      "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const email = emailRes.data.elements[0]["handle~"].emailAddress;
    const name = `${profileRes.data.localizedFirstName} ${profileRes.data.localizedLastName}`;

    if (!email) {
      throw new AppError(httpStatus.BAD_REQUEST, "Unable to get email from LinkedIn");
    }

    // 3. Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        fullName: name,
        isVerified: true,
        accountType: "linkedin", // important
        role: role,
          image: {
          id: "linkedin", // any default id
          url: "https://i.ibb.co/z5YHLV9/profile.png", // LinkedIn থেকে profile picture পাওয়া একটু tricky, তাই default দিলাম
        },
      });
    }

    // 4. Generate tokens
    const accessTokenJwt = jwt.sign(
      { id: user._id, role: user.role },
      config.jwt.jwt_access_secret as Secret,
      { expiresIn: "24h" }
    );

    const refreshToken = jwt.sign(
      { id: user._id, role: user.role },
      config.jwt.jwt_refresh_secret as Secret,
      { expiresIn: "7d" }
    );

    // 5. Send response
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "LinkedIn login successful",
      data: { user, accessToken: accessTokenJwt, refreshToken },
    });
  } catch (err) {
    console.error(err);
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "LinkedIn login failed");
  }
});




export const appleLogin = catchAsync(async (req: Request, res: Response) => {
  const { identityToken, role } = req.body;

  if (!identityToken) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Apple identity token is required');
  }

  if (!role) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Role is required');
  }

  // 🔹 Verify the Apple JWT
  let applePayload: ApplePayload;
  try {
    applePayload = await appleSignin.verifyIdToken(identityToken, {
      audience: config.apple.client_id, // Bundle ID (iOS) or Service ID (Web)
      ignoreExpiration: false,
    }) as ApplePayload;
  } catch (err) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid Apple identity token');
  }

  console.log('Apple payload:', applePayload);

  const { sub: appleId, email, name } = applePayload;

  // 🔹 Fallback email if Apple doesn't provide it
  const finalEmail = email || `${appleId}@apple.com`;

  // 🔹 Find existing user
  let user = await User.findOne({ email: finalEmail });

  // 🔹 Create user if not found
  if (!user) {
    const fullName = name?.firstName
      ? `${name.firstName} ${name.lastName || ''}`
      : 'Apple User';

    user = await User.create({
      email: finalEmail,
      role: role, // Apple login এর সময় role কে dynamic করার জন্য
      fullName,
      accountType: 'apple',
      isVerified: true,
        image: {
        id: 'apple', // any default id
        url: 'https://i.ibb.co/z5YHLV9/profile.png',
      },
      // role: UserRole.customer,
    });
  }

  // 🔹 Generate JWT tokens
  const accessTokenJwt = jwt.sign(
    { id: user._id, role: user.role },
    config.jwt.jwt_access_secret as Secret,
    { expiresIn: '24h' }
  );

  const refreshToken = jwt.sign(
    { id: user._id, role: user.role },
    config.jwt.jwt_refresh_secret as Secret,
    { expiresIn: '7d' }
  );

  // 🔹 Send response
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Apple login successful',
    data: {
      user,
      accessToken: accessTokenJwt,
      refreshToken,
    },
  });
});





// neja korce ai api gulla oky

const codeVerification = catchAsync(async (req: Request, res: Response) => {
 const { email } = req.body;

    if (!email) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Email is required');
    }

  const otp = await authServices.sendVerificationCode(email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'OTP sent successfully, please verify before reset password',
    data: { email, otp }, // 🔒 prod এ otp response দিও না, শুধুমাত্র email
  });
});







export const verifyOtpController = catchAsync(async (req, res) => {
  const { email, otp } = req.body;
   if (!email || !otp) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Email and OTP are required');
    }

  await authServices.userVerifyOtp(email, Number(otp));
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'OTP verified successfully. You can now reset your password.',
    data: { email },
  });
});


export const userResetPassword = catchAsync(
  async (req: Request, res: Response) => {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !newPassword || !confirmPassword) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Email, newPassword and confirmPassword are required',
      );
    }

    if (newPassword !== confirmPassword) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Passwords do not match');
    }

    await userResetPasswordService(email, newPassword);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Password reset successful',
      data: {},
    });
  },



);





















// forgot password এর জন্য OTP verify করার পরে password set করার জন্য এই controller টা ব্যবহার করব।



 const sendOtp = catchAsync(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new AppError(400, 'Email is required');

  await authServices.Enteryouremail(email);

  res.status(200).json({
    success: true,
    message: 'OTP sent successfully to your email',
  });
});





 const verifyOtpOnly = catchAsync(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw new AppError(400, 'Email and OTP are required');

  // Verify OTP
  await authServices.verifyOtp(email, Number(otp));

  res.status(200).json({
    success: true,
    message: 'OTP verified successfully',
  });
});




// const verifyOtpAndResetPassword = catchAsync(async (req, res) => {
//   const { email, otp, newPassword } = req.body;
//   if (!email || !otp || !newPassword)
//     throw new AppError(400, 'Email, OTP and newPassword are required');

// // Verify OTP
//   await authServices.verifyOtp(email, Number(otp));
//   // Update password in DB
//   const user = await User.findOne({ email, isDeleted: false, isVerified: true });
//   if (!user) throw new AppError(404, 'User not found');

//   const saltRounds = Number(config.bcrypt_salt_rounds);
//   user.password = await bcrypt.hash(newPassword, saltRounds);
//   user.needsPasswordChange = false; // optional

//   await user.save();

//   res.status(200).json({
//     success: true,
//     message: 'Password reset successfully',
//   });
// });









// const loginUser = async (payload: { email: string; password: string }) => {
//   const user = await User.isUserExist(payload.email);

//   if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');
//   if (user.isDeleted) throw new AppError(httpStatus.FORBIDDEN, 'User is deleted');
//   if (!user.isActive) throw new AppError(httpStatus.FORBIDDEN, 'User is inactive');

//   const isPasswordMatch = await User.isPasswordMatched(
//     payload.password,
//     user.password,
//   );
//   if (!isPasswordMatch)
//     throw new AppError(httpStatus.UNAUTHORIZED, 'Incorrect password');

//   // ─── Subscription Check ──────────────────────────────────────────
//   const subStatus = user.subscription?.status;

//   // Trial শেষ হয়েছে কিনা check
//   if (subStatus === 'trialing' && user.subscription?.expiresAt) {
//     if (new Date() > user.subscription.expiresAt) {
//       await User.findByIdAndUpdate(user._id, {
//         'subscription.status': 'expired',
//       });
//       // Login দেবে তবে frontend কে জানাবে payment দরকার
//       const jwtPayload = { _id: user._id, role: user.role, email: user.email };
//       const accessToken = createToken(jwtPayload, config.jwt_access_secret as string, config.jwt_access_expires_in as string);

//       return {
//         accessToken,
//         needsPayment: true,          // ← Frontend এই flag দেখে payment page এ নিয়ে যাবে
//         subscriptionStatus: 'expired',
//       };
//     }
//   }

//   // কোনো subscription নেই — payment করতে হবে
//   if (!subStatus || subStatus === 'none' || subStatus === 'cancelled') {
//     const jwtPayload = { _id: user._id, role: user.role, email: user.email };
//     const accessToken = createToken(jwtPayload, config.jwt_access_secret as string, config.jwt_access_expires_in as string);

//     return {
//       accessToken,
//       needsPayment: true,            // ← Frontend payment page এ নিয়ে যাবে
//       subscriptionStatus: subStatus || 'none',
//     };
//   }
//   // ─────────────────────────────────────────────────────────────────

//   const jwtPayload = { _id: user._id, role: user.role, email: user.email };
//   const accessToken = createToken(
//     jwtPayload,
//     config.jwt_access_secret as string,
//     config.jwt_access_expires_in as string,
//   );

//   return {
//     accessToken,
//     needsPayment: false,
//     subscriptionStatus: subStatus,
//   };
// };





// // যেকোনো protected route এ checkSubscription যোগ করুন
// import checkSubscription from '../../middlewares/checkSubscription';

// // Example:
// router.get(
//   '/dashboard',
//   auth(UserRole.user),
//   checkSubscription,          // ← subscription না থাকলে 402 error
//   DashboardController.getData,
// );






export const authControllers = {
  login,
  sendOtp,
  verifyOtpOnly,
  resetPassword,
  verifyOtpController,
  codeVerification,
  changePassword,
  refreshToken,
  linkedInLogin,
  googleLogin,

  facebookLogin,

  userRegistration,
  appleLogin,
  
};
