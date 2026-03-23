import { ROLES } from "./roles.js";

export const ADMIN_EMAILS = ["stapdevs@gmail.com", "tobbygold4@gmail.com"];

export const isAdminEmail = (email = "") => ADMIN_EMAILS.includes(email.trim().toLowerCase());

export const resolveRoleForEmail = (email = "", fallbackRole = ROLES.USER) =>
  isAdminEmail(email) ? ROLES.ADMIN : fallbackRole;
