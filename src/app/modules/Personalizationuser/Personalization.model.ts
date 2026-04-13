

// personalization.model.ts
import { model, Schema } from "mongoose";
import { IPersonalization } from "./Personalization.interface";

 
const personalizationSchema = new Schema<IPersonalization>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // per user ekta personalization record
    },
 
    // Personalization 1 — Skating Interests
    interests: [
      {
        type: String,
        enum: [
          "Cone Skating",
          "Artistic Skating",
          "Rhythm/Line Skating",
          "Inline Derby",
          "Freestyle Skating",
          "Ramp Skating",
          "Downhill / Marathon Skating",
          "Freestyle Slalom Skating",
          "Distance / Marathon Skating",
          "Park Skating",
          "Speed Skating",
          "Aggressive Skating",
          "Slalom Skating",
          "Quad Skating",
          "Inline Hockey",
        ],
      },
    ],
 
    // Personalization 4 — Skill Level
    skillLevel: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced", ""],
      default: "",
    },
 
    // Personalization 5 — Years Skating
    yearsSkating: {
      type: String,
      enum: [
        "0-5 years",
        "6-10 years",
        "11-25 years",
        "16-20 years",
        "20+ years",
        "",
      ],
      default: "",
    },
 
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, versionKey: false }
);
 
export const Personalization = model<IPersonalization>(
  "Personalization",
  personalizationSchema
);
