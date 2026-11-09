import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";

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
   console.log("user details from frontend", fullName, username, email, password);

   if(
    [fullName, username, email, password].some((field) => field?.trim() === "")
   ){
    throw new ApiError(400, "All fields are required", ["fullName, username, email, password are required"])
   }

  const existedUser =  User.findOne({$or: [{username}, {email}]})

  if(existedUser){
    throw new ApiError(409, "User already exists");
  }

 const avatarLocalPath =  req.files?.avatar[0]?.path;
 const coverImageLocalPath =  req.files?.coverImage[0]?.path;

 if(!avatarLocalPath){
  throw new ApiError(400, "Avatar is required");
 }


 const avatar = await uploadCloudinary(avatarLocalPath);
 const coverImage = await uploadCloudinary(coverImageLocalPath);

 if(!avatar){
  throw new ApiError(400, "Avatar file is  required");
 }

const user =  User.create({
  fullName,
  avatar: avatar.url,
  coverImage: coverImage?.url || "",
  username: username.tolowerCase(),
  email,
  password
 })


 const createdUser =  await User.findById(user._id).select("-passwprd -refreshToken" )

if (!createdUser) {
  throw new ApiError(500, "User creation failed. while  registering user"); 
}

 return res.status(201).json(
  new ApiResponse(200, createdUser, "User registered successfully"))

})

export {registerUser};