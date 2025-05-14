import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

// MongoDB connection function
async function connectToDatabase() {
  const uri = process.env.MONGODB_URI || "mongodb+srv://rajnaman488:namanraj24@nextapp-cluster.iikn9.mongodb.net/3RVision?retryWrites=true&w=majority&appName=NextApp-Cluster";
  if (!uri) {
    throw new Error("MONGODB_URI is not defined");
  }
  const client = await MongoClient.connect(uri);
  const db = client.db("3RVision");
  return { client, db };
}

// Define an interface for the Post document
interface Post {
  _id: ObjectId;
  likes: number;
  // Add other post fields as needed
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Connect to the database
    const { client, db } = await connectToDatabase();

    try {
      // Update the post's likes count in the Community collection
      const result = await db.collection("Community").findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $inc: { likes: 1 } },
        { returnDocument: "after" }
      );

      await client.close();

      if (!result) {
        return NextResponse.json(
          { error: "Post not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        post: result,
      });
    } finally {
      await client.close();
    }
  } catch (error) {
    console.error("Error liking post:", error);
    return NextResponse.json(
      { error: "Failed to like post" },
      { status: 500 }
    );
  }
}
