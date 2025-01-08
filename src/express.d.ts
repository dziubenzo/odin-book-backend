// Provides types for req.user
// User interface is empty by default

declare global {
  namespace Express {
    interface User {
      _id?: ObjectId;
      bio?: string;
      avatar?: string;
      followed_users?: ObjectId[];
      followed_categories?: ObjectId[];
    }
  }
}

export {};
