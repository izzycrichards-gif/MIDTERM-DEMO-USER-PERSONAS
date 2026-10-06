import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";
import { db, usersTable } from "@workspace/db";

export const crmAuth: RequestHandler = async (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in to access your CRM." });
    return;
  }
  await db.insert(usersTable).values({ id: userId }).onConflictDoNothing();
  res.locals.userId = userId;
  next();
};
