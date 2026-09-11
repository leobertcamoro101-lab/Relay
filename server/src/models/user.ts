import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  birthday: Date;
  gender: "female" | "male" | "custom";
  email: string;
  password: string;
  image: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  // places: mongoose.Types.ObjectId[];
  name: string; // virtual
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  birthday: { type: Date, required: true },
  gender: { type: String, required: true, enum: ["female", "male", "custom"] },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  image: { 
    type: String, 
    required: true, 
    default: "https://ui-avatars.com/api/?name=User&background=random"  // ← just adds a fallback
  },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },

  // places: [{ type: mongoose.Types.ObjectId, required: true, ref: "Place" }], // with relation to place
}, 
{ 
  timestamps: true,
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true } 
},

);

// Computed full name — keeps every existing `.name` usage across the app working unchanged
userSchema.virtual('name').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

const User: Model<IUser> = mongoose.model("User", userSchema);

export default User;