import { sendEmail } from "../../utils/mailSender";
import { Admin } from "../Dashboard/admin/admin.model";
import { ContactQueryParams, ContactStats, CreateContactDto, IContactDocument, PaginationMeta, UpdateContactStatusDto } from "./contact.interface";
import { Contact } from "./contact.model";

// Create new contact
const createContact = async (
  dto: CreateContactDto,
  ipAddress?: string,
  userId?: string
): Promise<IContactDocument> => {
  const contact = await Contact.create({
    phoneNumber: dto.phoneNumber,
    email: dto.email || null,
    message: dto.message,
    ipAddress: ipAddress || null,
    status: "pending",
    user: userId,
  });

  return contact;
};

// Get all contacts with pagination & filter
const getAllContacts = async (
  params: ContactQueryParams
): Promise<{ contacts: IContactDocument[]; pagination: PaginationMeta }> => {
  const page = params.page || 1;
  const limit = params.limit || 10;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (params.status) {
    filter.status = params.status;
  }

  const [contacts, total] = await Promise.all([
    Contact.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Contact.countDocuments(filter),
  ]);

  const pagination: PaginationMeta = {
    total,
    page,
    limit,
    totalPage: Math.ceil(total / limit),
  };

  return { contacts, pagination };
};

// Get single contact by ID (auto-mark as read)
const getContactById = async (id: string): Promise<IContactDocument | null> => {
  const contact = await Contact.findById(id);

  if (!contact) return null;

  if (contact.status === "pending") {
    contact.status = "read";
    await contact.save();
  }

  return contact;
};

// Update contact status
const updateStatus = async (
  id: string,
  dto: UpdateContactStatusDto
): Promise<IContactDocument | null> => {
  const contact = await Contact.findByIdAndUpdate(
    id,
    { status: dto.status },
    { new: true, runValidators: true }
  );

  return contact;
};

// Delete contact
const deleteContact = async (id: string): Promise<boolean> => {
  const result = await Contact.findByIdAndDelete(id);
  return result !== null;
};

// Get contact stats
const getStats = async (): Promise<ContactStats> => {
  const [total, pending, read, replied] = await Promise.all([
    Contact.countDocuments(),
    Contact.countDocuments({ status: "pending" }),
    Contact.countDocuments({ status: "read" }),
    Contact.countDocuments({ status: "replied" }),
  ]);

  return { total, pending, read, replied };
};







const sendMessageToAdmin = async (payload: any) => {
  const { name, phoneNumber, message } = payload;
const admin = await Admin.findOne({ role: "ADMIN" }).select("email");
const adminEmail = admin?.email;
console.log("Admin email:", adminEmail);



if (!adminEmail) {
  throw new Error("Admin email not found");
}


  const emailBody = `
New Support Message:

Name: ${name}
Phone Number: ${phoneNumber}

Message:
${message}
  `;

  await sendEmail(
    adminEmail,
    "New User Message",
    emailBody
  );

  return {
    message: "Message sent successfully to admin",
  };
};





export const ContactService = {
  createContact,
  getAllContacts,
  getContactById,
  updateStatus,
  deleteContact,
  getStats,
  sendMessageToAdmin,
};