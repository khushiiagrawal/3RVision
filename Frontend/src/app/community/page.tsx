"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { FaSearch, FaPlus } from "react-icons/fa";
import CreatePostModal from "@/components/CreatePostModal";
import PostCard from "@/components/PostCard";
import { useAuth } from "@/context/AuthContext";
import { Suspense } from "react";

// Define the Comment type
interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

// Define the Post type to match PostCard component
interface Post {
  _id: string;
  title: string;
  description: string;
  image?: string;
  author: string;
  timestamp: string;
  likes: number;
  comments: Comment[];
  tags: string[];
  postType?: "text" | "image" | "poll";
  pollOptions?: { text: string; votes: number }[];
  totalVotes?: number;
  userVote?: number | null;
}

const CommunityPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Only render content after component is mounted (client-side)
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"latest" | "popular">("latest");

  // Fetch posts from API
  useEffect(() => {
    if (!mounted) return;

    const fetchPosts = async () => {
      try {
        const response = await fetch("/api/posts");
        if (!response.ok) throw new Error("Failed to fetch posts");
        const data = await response.json();

        // Ensure posts have the expected structure
        const transformedPosts = data.map((post: any) => ({
          _id: post._id || "",
          title: post.title || "",
          description: post.description || "",
          image: post.image || "",
          author: post.author || "Anonymous",
          timestamp: post.timestamp || new Date().toISOString(),
          likes: post.likes || 0,
          comments: Array.isArray(post.comments) ? post.comments : [],
          tags: Array.isArray(post.tags) ? post.tags : [],
        }));

        setPosts(transformedPosts);

        const uniqueTags = [
          ...new Set(transformedPosts.flatMap((post: Post) => post.tags || [])),
        ].filter(Boolean); // Filter out undefined/null tags

        setTags(uniqueTags as string[]);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching posts:", error);
        setLoading(false);
      }
    };

    fetchPosts();
  }, [mounted]);

  // Handle creating a new post
  const handleCreatePost = async (postData: any) => {
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...postData,
          author: user?.name || "Anonymous",
          timestamp: new Date().toISOString(),
          likes: 0,
          comments: [],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create post");
      }

      const result = await response.json();

      // If the API returns the post data inside a 'post' property
      const newPost = result.post || result;

      // Make sure the post has all required fields
      const formattedPost: Post = {
        _id: newPost._id,
        title: newPost.title || postData.title || "",
        description: newPost.description || postData.description || "",
        author: newPost.author || user?.name || "Anonymous",
        timestamp: newPost.timestamp || new Date().toISOString(),
        likes: newPost.likes || 0,
        comments: Array.isArray(newPost.comments) ? newPost.comments : [],
        tags: Array.isArray(newPost.tags) ? newPost.tags : postData.tags || [],
        image: newPost.image || postData.image || "",
      };

      console.log("New post created:", formattedPost);

      setPosts((prevPosts) => [formattedPost, ...prevPosts]);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  // Handle adding a comment to a post
  const handleCommentPost = async (postId: string, commentText: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: commentText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to post comment");
      }

      const data = await response.json();

      // Update posts array with the new comment from the API response
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post._id === postId) {
            // Check if comment with this ID already exists to avoid duplicates
            const existingComment = post.comments.find(
              (c) => c.id === data.comment.id
            );
            if (existingComment) {
              return post; // Comment already exists, don't add it again
            }

            return {
              ...post,
              comments: [...(post.comments || []), data.comment],
            };
          }
          return post;
        })
      );
    } catch (error) {
      console.error("Error posting comment:", error);
    }
  };

  // Filter posts based on search query and selected tags
  const filteredPosts = posts.filter((post) => {
    // Add null checks before calling toLowerCase()
    const postTitle = post.title || "";
    const postDescription = post.description || "";

    const matchesSearch =
      postTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      postDescription.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((tag) => post.tags?.includes(tag));

    return matchesSearch && matchesTags;
  });

  // Sort posts
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === "latest") {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    } else {
      return b.likes - a.likes;
    }
  });

  // If not mounted yet, don't render the full component to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <Navbar />
        <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <Navbar />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Our Community
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Share your experiences, ask questions, and connect with others who
            are passionate about sustainable living.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-8 max-w-4xl mx-auto"
        >
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
              />
            </div>

            <div className="flex gap-4">
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "latest" | "popular")
                }
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-800 font-medium"
              >
                <option value="latest" className="text-gray-800">
                  Latest
                </option>
                <option value="popular" className="text-gray-800">
                  Most Popular
                </option>
              </select>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FaPlus />
                Create Post
              </motion.button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <motion.button
                key={tag}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedTags(
                    selectedTags.includes(tag)
                      ? selectedTags.filter((t) => t !== tag)
                      : [...selectedTags, tag]
                  );
                }}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedTags.includes(tag)
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tag}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {sortedPosts.map((post, index) => (
              <motion.div
                key={post._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <PostCard
                  post={post}
                  onLike={(postId) => {
                    const updatedPosts = posts.map((p) =>
                      p._id === postId ? { ...p, likes: p.likes + 1 } : p
                    );
                    setPosts(updatedPosts);
                  }}
                  onComment={handleCommentPost}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      <Footer />

      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreatePost}
      />
    </div>
  );
};

export default CommunityPage;
