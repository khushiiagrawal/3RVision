"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaRecycle,
  FaStore,
  FaSync,
  FaLeaf,
  FaInfoCircle,
  FaExternalLinkAlt,
  FaArrowLeft,
  FaCloudMeatball, // Icon for carbon footprint
} from "react-icons/fa";
import { useRouter } from "next/navigation";
import EcoLoader from "@/components/EcoLoader";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface AnalysisResult {
  imageUrl: string;
  s3Url: string;
  predictedClass: string;
  confidence: number;
  analysis: {
    resalable: {
      is_resalable: boolean;
      platforms: string[];
      condition: string;
      value: string;
      tips: string;
    };
    recyclable: {
      is_recyclable: boolean;
      centers: string[];
      material: string;
      process: string;
      impact: string;
    };
    reusable: {
      is_reusable: boolean;
      ways: string[];
      durability: string;
      benefits: string;
      tutorial: string;
    };
    carbon_footprint: {
      production: string;
      usage: string;
      disposal: string;
      total_estimate: string;
      reduction_tips: string[];
    };
    biodegradable: boolean;
    time_to_degrade: string;
    description: string;
  };
  categories?: string[];
}

type PlatformType = "OLX" | "Facebook Marketplace" | "Quickr";

const platformMap: Record<PlatformType, string> = {
  OLX: "https://www.olx.in",
  "Facebook Marketplace": "https://www.facebook.com/marketplace",
  Quickr: "https://www.quikr.com",
};

const getPlatformUrl = (platform: string): string => {
  return platformMap[platform as PlatformType] || "#";
};

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("overview");

  useEffect(() => {
    // Get the result from localStorage
    const storedResult = localStorage.getItem("analysisResult");
    if (storedResult) {
      setResult(JSON.parse(storedResult));
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-b from-green-900/10 via-teal-900/70 to-green-900/40 flex items-center justify-center pt-16">
          <EcoLoader message="Loading your results..." />
        </div>
        <Footer />
      </>
    );
  }

  if (!result) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-b from-green-900/10 via-teal-900/70 to-green-900/40 flex items-center justify-center pt-16">
          <div className="text-center">
            <h1 className="text-2xl text-white mb-4">No results found</h1>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Go Back Home
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-green-900/10 via-teal-900/70 to-green-900/40 pt-16 pb-16">
        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-white mb-6 bg-green-800/30 px-4 py-2 rounded-lg hover:bg-green-700/40 transition-colors"
          >
            <FaArrowLeft /> Back to Home
          </motion.button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - Image and Basic Info */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="lg:col-span-4 space-y-6"
            >
              {/* Image Card */}
              <motion.div
                variants={cardVariants}
                className="bg-white/10 backdrop-blur-md rounded-xl border border-green-500/20 p-4 overflow-hidden"
              >
                <div className="relative group aspect-square">
                  <img
                    src={result.imageUrl}
                    alt="Analyzed Item"
                    className="w-full h-full object-cover rounded-lg shadow-xl transition-transform group-hover:scale-[1.02] duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-green-900/80 via-transparent to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              </motion.div>

              {/* Basic Info Card */}
              <motion.div
                variants={cardVariants}
                className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-green-500/20"
              >
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                  <FaInfoCircle className="text-green-400 text-xl" />
                  <h3 className="font-semibold text-lg text-white">
                    Basic Information
                  </h3>
                </div>
                <div className="space-y-4">
                  {result.categories && result.categories.length > 0 && (
                    <div>
                      <p className="text-green-100 mb-2">
                        <span className="font-medium text-green-400">
                          Categories:
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {result.categories.map((category, idx) => (
                          <span 
                            key={idx} 
                            className="bg-green-800/50 text-green-100 px-3 py-1 rounded-full text-sm"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-green-100">
                    <span className="font-medium text-green-400">
                      Predicted Class:{" "}
                    </span>
                    {result.predictedClass}
                  </p>
                  <div>
                    <p className="text-green-100 mb-2">
                      <span className="font-medium text-green-400">
                        Confidence:{" "}
                      </span>
                      {result.confidence.toFixed(2)}%
                    </p>
                    <div className="overflow-hidden h-2 text-xs flex rounded-full bg-green-900/50">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${result.confidence}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Description Card */}
              <motion.div
                variants={cardVariants}
                className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-green-500/20"
              >
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                  <FaInfoCircle className="text-green-400 text-xl" />
                  <h3 className="font-semibold text-lg text-white">
                    Description
                  </h3>
                </div>
                <p className="text-green-100">{result.analysis.description}</p>
              </motion.div>

              {/* Biodegradable Info */}
              <motion.div
                variants={cardVariants}
                className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-green-500/20"
              >
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                  <FaLeaf className="text-green-400 text-xl" />
                  <h3 className="font-semibold text-lg text-white">
                    Biodegradability
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full ${
                        result.analysis.biodegradable
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                    />
                    <p className="text-green-100">
                      {result.analysis.biodegradable
                        ? "Biodegradable"
                        : "Non-biodegradable"}
                    </p>
                  </div>
                  {result.analysis.biodegradable && (
                    <p className="text-green-100">
                      <span className="font-medium text-green-400">
                        Time to degrade:
                      </span>{" "}
                      {result.analysis.time_to_degrade}
                    </p>
                  )}
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column - Analysis Results */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 h-fit"
            >
              {/* Resalable Section */}
              <motion.div
                variants={cardVariants}
                className="bg-blue-900/30 backdrop-blur-md p-6 rounded-xl border border-blue-500/20 h-full"
              >
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                  <FaStore className="text-blue-400 text-xl" />
                  <h3 className="font-semibold text-lg text-white">
                    Resale Potential
                  </h3>
                </div>
                {result.analysis.resalable.is_resalable ? (
                  <div className="space-y-3 text-blue-100">
                    <p>
                      <span className="font-medium text-blue-400">
                        Condition:
                      </span>{" "}
                      {result.analysis.resalable.condition}
                    </p>
                    <p>
                      <span className="font-medium text-blue-400">Value:</span>{" "}
                      {result.analysis.resalable.value}
                    </p>
                    <div>
                      <p className="font-medium text-blue-400 mb-2">
                        Platforms:
                      </p>
                      <ul className="list-none space-y-2">
                        {result.analysis.resalable.platforms.map(
                          (platform, index) => (
                            <motion.li
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center gap-2"
                            >
                              <a
                                href={getPlatformUrl(platform)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-blue-800/20 p-2 rounded-lg w-full group hover:bg-blue-700/30 transition-all duration-300"
                              >
                                <span className="w-2 h-2 bg-blue-400 rounded-full group-hover:w-3 group-hover:h-3 transition-all duration-300" />
                                <span className="flex-grow">{platform}</span>
                                <FaExternalLinkAlt
                                  className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                  size={12}
                                />
                              </a>
                            </motion.li>
                          )
                        )}
                      </ul>
                    </div>
                    <p className="mt-3">
                      <span className="font-medium text-blue-400">Tips:</span>{" "}
                      {result.analysis.resalable.tips}
                    </p>
                  </div>
                ) : (
                  <p className="text-blue-200/70">
                    This item is not recommended for resale.
                  </p>
                )}
              </motion.div>

              {/* Recyclable Section */}
              <motion.div
                variants={cardVariants}
                className="bg-green-900/30 backdrop-blur-md p-6 rounded-xl border border-green-500/20 h-full"
              >
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                  <FaRecycle className="text-green-400 text-xl" />
                  <h3 className="font-semibold text-lg text-white">
                    Recycling Information
                  </h3>
                </div>
                {result.analysis.recyclable.is_recyclable ? (
                  <div className="space-y-3 text-green-100">
                    <p>
                      <span className="font-medium text-green-400">
                        Material:
                      </span>{" "}
                      {result.analysis.recyclable.material}
                    </p>
                    <p>
                      <span className="font-medium text-green-400">
                        Process:
                      </span>{" "}
                      {result.analysis.recyclable.process}
                    </p>
                    <p>
                      <span className="font-medium text-green-400">
                        Impact:
                      </span>{" "}
                      {result.analysis.recyclable.impact}
                    </p>
                    <div>
                      <p className="font-medium text-green-400 mb-2">
                        Centers:
                      </p>
                      <ul className="list-none space-y-2">
                        {result.analysis.recyclable.centers.map(
                          (center, index) => (
                            <motion.li
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center gap-2 bg-green-800/20 p-2 rounded-lg"
                            >
                              <span className="w-2 h-2 bg-green-400 rounded-full" />
                              {center}
                            </motion.li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-green-200/70">
                    This item is not recyclable.
                  </p>
                )}
              </motion.div>

              {/* Reusable Section */}
              <motion.div
                variants={cardVariants}
                className="bg-purple-900/30 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 h-full"
              >
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                  <FaSync className="text-purple-400 text-xl" />
                  <h3 className="font-semibold text-lg text-white">
                    Reuse Options
                  </h3>
                </div>
                {result.analysis.reusable.is_reusable ? (
                  <div className="space-y-3 text-purple-100">
                    <p>
                      <span className="font-medium text-purple-400">
                        Durability:
                      </span>{" "}
                      {result.analysis.reusable.durability}
                    </p>
                    <p>
                      <span className="font-medium text-purple-400">
                        Benefits:
                      </span>{" "}
                      {result.analysis.reusable.benefits}
                    </p>
                    <div>
                      <p className="font-medium text-purple-400 mb-2">
                        Ways to Reuse:
                      </p>
                      <ul className="list-none space-y-2">
                        {result.analysis.reusable.ways.map((way, index) => (
                          <motion.li
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center gap-2 bg-purple-800/20 p-2 rounded-lg"
                          >
                            <span className="w-2 h-2 bg-purple-400 rounded-full" />
                            {way}
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                    <p>
                      <span className="font-medium text-purple-400">
                        Tutorial:
                      </span>{" "}
                      {result.analysis.reusable.tutorial}
                    </p>
                  </div>
                ) : (
                  <p className="text-purple-200/70">
                    This item is not suitable for reuse.
                  </p>
                )}
              </motion.div>

              {/* Carbon Footprint Section */}
              <motion.div
                variants={cardVariants}
                className="bg-amber-900/30 backdrop-blur-md p-6 rounded-xl border border-amber-500/20 h-full"
              >
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                  <FaCloudMeatball className="text-amber-400 text-xl" />
                  <h3 className="font-semibold text-lg text-white">
                    Carbon Footprint
                  </h3>
                </div>
                <div className="space-y-3 text-amber-100">
                  <p>
                    <span className="font-medium text-amber-400">
                      Production:
                    </span>{" "}
                    {result.analysis.carbon_footprint.production}
                  </p>
                  <p>
                    <span className="font-medium text-amber-400">
                      Usage:
                    </span>{" "}
                    {result.analysis.carbon_footprint.usage}
                  </p>
                  <p>
                    <span className="font-medium text-amber-400">
                      Disposal:
                    </span>{" "}
                    {result.analysis.carbon_footprint.disposal}
                  </p>
                  <p>
                    <span className="font-medium text-amber-400">
                      Total Estimate:
                    </span>{" "}
                    {result.analysis.carbon_footprint.total_estimate}
                  </p>
                  <div>
                    <p className="font-medium text-amber-400 mb-2">
                      Reduction Tips:
                    </p>
                    <ul className="list-none space-y-2">
                      {result.analysis.carbon_footprint.reduction_tips.map(
                        (tip, index) => (
                          <motion.li
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center gap-2 bg-amber-800/20 p-2 rounded-lg"
                          >
                            <span className="w-2 h-2 bg-amber-400 rounded-full" />
                            {tip}
                          </motion.li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-10 bg-white/10 backdrop-blur-md p-6 rounded-xl border border-green-500/20 text-center"
          >
            <h3 className="text-xl font-semibold text-white mb-4">
              Make a Sustainable Choice
            </h3>
            <p className="text-green-100 mb-6 max-w-2xl mx-auto">
              Now that you know the environmental impact of this item, you can make an informed decision on how to handle it. Remember, small choices add up to big impacts!
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Analyze Another Item
            </button>
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  );
}