import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";

const generateAccessAndRefreshTokens = async (userId) => {
  try{
  const user = await User.findById(userId)
  const accessToken = user.generateAccessToken()
  const refreshToken = user.generateRefreshToken()


  user.refreshToken = refreshToken;
  await user.save({ validateBeforSave: false});

  return {accessToken, refreshToken};


   

  } catch(error){
    throw new ApiError(500, "Error while generating access and refresh tokens");

  }

}

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  //validation - not empty
  // check if user already exists: username, email  
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user in object - create entry in db
  // remove password and refresh token field from reponse
  // check for user  creation
  // return res


   const {fullName, username, email, password} = req.body
   //console.log("user details from frontend", fullName, username, //email, password);

   if (
  [fullName, username, email, password].some(
    (field) => !field || field.trim() === ""
  )
) {
  throw new ApiError(400, "All fields are required");
}

  const existedUser =  await User.findOne({$or: [{username}, {email}]})

  if(existedUser){
    throw new ApiError(409, "User already exists");
  }

  console.log(req.files);

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  //const coverImageLocalPath = req.files?.coverImage?.[0]?.path; 
  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
     coverImageLocalPath = req.files.coverImage[0].path;
  }

 if(!avatarLocalPath){
  throw new ApiError(400, "Avatar is required");
 }


 const avatar = await uploadCloudinary(avatarLocalPath);
 const coverImage = await uploadCloudinary(coverImageLocalPath);

 if(!avatar){
  throw new ApiError(400, "Avatar file is  required");
 }

const user = await User.create({
  fullName,
  avatar: avatar.url,
  coverImage: coverImage?.url || "",
  username: username.toLowerCase(),
  email,
  password
 })


 const createdUser =  await User.findById(user._id).select("-password -refreshToken" )

if (!createdUser) {
  throw new ApiError(500, "User creation failed. while  registering user"); 
}

 return res.status(201).json(
  new ApiResponse(201, createdUser, "User registered successfully"))

})

// Login user
const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  // username or email
  //find the user
  //password check
  //generate access and refresh token
  // send cookies

  const {email, username,password} = req.body;
  if(!username || !email){
    throw new ApiError(400, "Username or email is required");
  }

const user = await  User.findOne({$or: [{username}, {email}]
  })

  if(!user){
    throw new ApiError(404, "User not found");
  }


  const isPasswordValid = await user.isPasswordCorrect(password);

  if(!isPasswordValid){
    throw new ApiError(401, "Invalid password");
  }

  const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)


  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  if(!loggedInUser){
    throw new ApiError(500, "User login failed");
  }

  const options = {
    httpOnly: true,
    secure: true,
  }

  return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
    new ApiResponse(200, 
      {
        user: loggedInUser, accessToken, refreshToken
      },
      "User logged in successfully"
    )
  )

})

const logoutUser = asyncHandler(async (req, res) => {
 await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true,
    }

  )
  const options = {
    httpOnly: true,
    secure: true,
  }
  return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(
    new ApiResponse(200, {}, "User logged out successfully")
  )

   
})
      

export {registerUser , loginUser, logoutUser};