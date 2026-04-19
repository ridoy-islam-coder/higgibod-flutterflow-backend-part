import Plan from "./subplan.model";


// Create Plan
const createPlan = async (payload: any) => {
  const result = await Plan.create(payload);
  return result;
};

// Get All Plans
const getAllPlans = async () => {
  const result = await Plan.find();
  return result;
};

// Get Single Plan
const getSinglePlan = async (id: string) => {
  const result = await Plan.findById(id);
  return result;
};

// Update Plan
const updatePlan = async (id: string, payload: any) => {
  const result = await Plan.findByIdAndUpdate(id, payload, {
    new: true,
  });
  return result;
};

// Delete Plan
const deletePlan = async (id: string) => {
  const result = await Plan.findByIdAndDelete(id);
  return result;
};

export const planServices = {
  createPlan,
  getAllPlans,
  getSinglePlan,
  updatePlan,
  deletePlan,
};