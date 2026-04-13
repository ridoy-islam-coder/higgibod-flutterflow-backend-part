

// personalization.service.ts

import { Personalization } from "./Personalization.model";

 
// ─── 1. Step save — frontend step by step pathabe ─────────────────────────
// Frontend har step e call korbe, je fields ache shegulo pathabe
const savePersonalization = async (
  userId: string,
  data: {
    interests?: string[];
    skillLevel?: string;
    yearsSkating?: string;
  }
) => {
  // upsert — already thakle update, na thakle create
  const personalization = await Personalization.findOneAndUpdate(
    { user: userId },
    { ...data },
    { new: true, upsert: true }
  );
 
  return personalization;
};
 
// ─── 2. Complete personalization — last step e call hobe ──────────────────
const completePersonalization = async (userId: string) => {
  const personalization = await Personalization.findOneAndUpdate(
    { user: userId },
    { isCompleted: true },
    { new: true }
  );
 
  if (!personalization) throw new Error("Personalization not found");
  return personalization;
};
 
// ─── 3. Get personalization — user er data dekhte ─────────────────────────
const getPersonalization = async (userId: string) => {
  const personalization = await Personalization.findOne({ user: userId });
  return personalization || null;
};
 
// ─── 4. Check completed — registration er por redirect korte ──────────────
const isPersonalizationCompleted = async (userId: string) => {
  const personalization = await Personalization.findOne({ user: userId });
  return {
    isCompleted: personalization?.isCompleted || false,
    hasStarted: !!personalization,
  };
};
 
export const personalizationService = {
  savePersonalization,
  completePersonalization,
  getPersonalization,
  isPersonalizationCompleted,
};