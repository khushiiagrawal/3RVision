"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import Earth3D from "./Earth3D";
import { FaCamera, FaUpload, FaChrome } from "react-icons/fa";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import UnauthorizedDialog from "./UnauthorizedDialog";
import LoginModal from "./LoginModal";
import SignupModal from "./SignupModal";
import { useRouter } from "next/navigation";
import AnalysisResultModal from "./AnalysisResultModal";
import EcoLoader from "./EcoLoader";

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
    biodegradable: boolean;
    time_to_degrade: string;
    description: string;
  };
}

const HeroSection = () => {
  const router = useRouter();
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, remainingUploads, decrementUploads, canUpload } = useAuth();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCameraInitializing, setIsCameraInitializing] = useState(false);

  const [showUnauthorizedDialog, setShowUnauthorizedDialog] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (videoRef.current && showCamera) {
      const video = videoRef.current;
      const events = ["loadeddata", "loadedmetadata", "playing"];
      const handleVideoReady = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setIsCameraReady(true);
        }
      };

      const attemptPlay = async () => {
        try {
          await video.play();
        } catch (err) {
          console.error("Error playing video", err);
        }
      };

      const readyTimeout = setTimeout(() => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setIsCameraReady(true);
        }
      }, 3000);

      events.forEach((event) =>
        video.addEventListener(event, handleVideoReady)
      );
      attemptPlay();

      return () => {
        events.forEach((event) =>
          video.removeEventListener(event, handleVideoReady)
        );
        clearTimeout(readyTimeout);
      };
    } else {
      setIsCameraReady(false);
    }
  }, [showCamera, videoRef.current]);

  useEffect(() => {
    if (showCamera && isCameraInitializing) {
      const initializeCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          setCameraStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            try {
              await videoRef.current.play();
            } catch (e) {
              console.error("Error playing video:", e);
            }
          }
          setIsCameraInitializing(false);
        } catch (error) {
          alert("Unable to access camera. Please check permissions.");
          setShowCamera(false);
          setIsCameraInitializing(false);
        }
      };
      initializeCamera();
    }
  }, [showCamera, isCameraInitializing]);

  const captureImage = async () => {
    if (!canUpload() || !videoRef.current) {
      setShowUnauthorizedDialog(true);
      setShowCamera(false);
      stopCamera();
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    try {
      setIsProcessing(true);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => blob && resolve(blob), "image/jpeg");
      });

      // Show the loader
      setAnalysisResult({
        imageUrl: URL.createObjectURL(blob),
        s3Url: "",
        predictedClass: "",
        confidence: 0,
        analysis: {
          resalable: {
            is_resalable: false,
            platforms: [],
            condition: "",
            value: "",
            tips: "",
          },
          recyclable: {
            is_recyclable: false,
            centers: [],
            material: "",
            process: "",
            impact: "",
          },
          reusable: {
            is_reusable: false,
            ways: [],
            durability: "",
            benefits: "",
            tutorial: "",
          },
          biodegradable: false,
          time_to_degrade: "",
          description: "",
        },
      });

      // Send to Go Server (S3 upload)
      const goFormData = new FormData();
      goFormData.append("image", blob, "captured.jpg");
      const goUploadResponse = await fetch("http://localhost:8080/upload", {
        method: "POST",
        body: goFormData,
      });
      const goData = await goUploadResponse.json();

      // Send to Flask Server
      const flaskFormData = new FormData();
      flaskFormData.append("file", blob, "captured.jpg");
      const flaskResponse = await fetch("http://127.0.0.1:5001/upload", {
        method: "POST",
        body: flaskFormData,
      });
      const flaskData = await flaskResponse.json();

      // Get advanced analysis
      const goAnalyzeForm = new FormData();
      goAnalyzeForm.append("image", blob);
      const goAnalyzeResponse = await fetch("http://localhost:8080/analyze", {
        method: "POST",
        body: goAnalyzeForm,
      });
      const analysisData = await goAnalyzeResponse.json();

      setCapturedImage(URL.createObjectURL(blob));
      setShowCamera(false);
      stopCamera();
      decrementUploads();

      // Update analysis result with actual data
      const finalResult = {
        imageUrl: URL.createObjectURL(blob),
        s3Url: goData.url,
        predictedClass: flaskData.predicted_class,
        confidence: flaskData.confidence,
        analysis: analysisData.analysis,
      };

      // Store the result in localStorage and redirect
      localStorage.setItem("analysisResult", JSON.stringify(finalResult));
      router.push("/result");
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Failed to process image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Set loading state
      setIsProcessing(true);

      // Create a temporary analysis result to show the loader
      setAnalysisResult({
        imageUrl: URL.createObjectURL(file),
        s3Url: "",
        predictedClass: "",
        confidence: 0,
        analysis: {
          resalable: {
            is_resalable: false,
            platforms: [],
            condition: "",
            value: "",
            tips: "",
          },
          recyclable: {
            is_recyclable: false,
            centers: [],
            material: "",
            process: "",
            impact: "",
          },
          reusable: {
            is_reusable: false,
            ways: [],
            durability: "",
            benefits: "",
            tutorial: "",
          },
          biodegradable: false,
          time_to_degrade: "",
          description: "",
        },
      });

      // Send to Go Server (S3 upload)
      const goFormData = new FormData();
      goFormData.append("image", file);
      const goUploadResponse = await fetch("http://localhost:8080/upload", {
        method: "POST",
        body: goFormData,
      });
      const goData = await goUploadResponse.json();

      // Send to Flask Server
      const flaskFormData = new FormData();
      flaskFormData.append("file", file);
      const flaskResponse = await fetch("http://127.0.0.1:5001/upload", {
        method: "POST",
        body: flaskFormData,
      });
      const flaskData = await flaskResponse.json();

      // Get advanced analysis
      const goAnalyzeForm = new FormData();
      goAnalyzeForm.append("image", file);
      const goAnalyzeResponse = await fetch("http://localhost:8080/analyze", {
        method: "POST",
        body: goAnalyzeForm,
      });
      const analysisData = await goAnalyzeResponse.json();

      setCapturedImage(URL.createObjectURL(file));
      decrementUploads();

      // Update analysis result with actual data
      const finalResult = {
        imageUrl: URL.createObjectURL(file),
        s3Url: goData.url,
        predictedClass: flaskData.predicted_class,
        confidence: flaskData.confidence,
        analysis: analysisData.analysis,
      };

      // Store the result in localStorage and redirect
      localStorage.setItem("analysisResult", JSON.stringify(finalResult));
      router.push("/result");
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!capturedImage || !analysisResult) {
      alert("Please upload or capture an image first");
      return;
    }

    try {
      setIsProcessing(true);

      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Send to Go Server for analysis
      const goAnalyzeForm = new FormData();
      goAnalyzeForm.append("image", blob);
      const goAnalyzeResponse = await fetch("http://localhost:8080/analyze", {
        method: "POST",
        body: goAnalyzeForm,
      });
      const analysisData = await goAnalyzeResponse.json();

      // Update only the analysis part while keeping other properties
      setAnalysisResult({
        ...analysisResult,
        analysis: analysisData.analysis,
      });
      setShowAnalysisModal(true);
    } catch (error) {
      console.error("Analysis error:", error);
      alert("Failed to analyze image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const stopCamera = () => {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
  };

  const handleScanImage = async () => {
    if (!canUpload()) {
      setShowUnauthorizedDialog(true);
      return;
    }
    setShowCamera(true);
    setIsCameraInitializing(true);
    setIsCameraReady(false);
  };

  const handleUploadImage = () => {
    if (!canUpload()) {
      setShowUnauthorizedDialog(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleChromeExtension = () => {
    router.push("/extension");
  };

  return (
    <div
      id="hero"
      className="relative h-screen w-full backdrop-blur-lg bg-gradient-to-b from-green-900/10 via-teal-900/70 to-green-900/40 overflow-hidden pt-16"
    >
      <div className="absolute mt-16 inset-0">
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={45} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <Earth3D scale={1.3} />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            enableRotate={false}
            rotateSpeed={0.5}
          />
        </Canvas>
      </div>

      {showCamera && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-90">
          <div className="relative w-full max-w-[640px] h-[480px] bg-gray-800 rounded-lg overflow-hidden">
            <video
              key="camera-video"
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="rounded-lg"
              style={{
                display: "block",
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            {(isCameraInitializing || !isCameraReady) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                <p className="text-white ml-4">
                  {isCameraInitializing
                    ? "Initializing camera..."
                    : "Preparing stream..."}
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 flex space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowCamera(false);
                stopCamera();
              }}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={isCameraReady ? { scale: 1.05 } : {}}
              whileTap={isCameraReady ? { scale: 0.95 } : {}}
              onClick={captureImage}
              disabled={!isCameraReady}
              className={`px-6 py-3 text-white rounded-lg shadow-lg ${
                isCameraReady
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-500 cursor-not-allowed"
              }`}
            >
              {isCameraReady ? "Capture" : "Waiting for camera..."}
            </motion.button>
          </div>
        </div>
      )}

      {capturedImage && !showCamera && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-90">
          <img
            src={capturedImage}
            alt="Captured"
            className="max-w-full max-h-[70vh] rounded-lg"
          />
          <div className="mt-4 flex space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCapturedImage(null)}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-lg"
            >
              Close
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAnalyze}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg"
            >
              Analyze
            </motion.button>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="mb-2"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative"
          >
            <motion.h1
              initial={{ opacity: 0, y: -50, scale: 0.5, rotate: -10 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              transition={{
                duration: 1.2,
                type: "spring",
                stiffness: 100,
                damping: 10,
                delay: 0.2,
              }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold text-white mb-12 drop-shadow-lg relative z-10 tracking-tight"
              style={{
                fontFamily: "'Montserrat', 'Poppins', sans-serif",
                letterSpacing: "-0.02em",
              }}
            >
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 1.0 }}
                className="inline-block"
                style={{
                  fontFamily: "'Montserrat', 'Poppins', sans-serif",
                  letterSpacing: "-0.03em",
                }}
              >
                Welcome to{" "}
                <motion.span
                  initial={{ color: "#ffffff" }}
                  animate={{
                    color: ["#ffffff", "#4ade80", "#ffffff"],
                    textShadow: [
                      "0 0 0px rgba(74, 222, 128, 0)",
                      "0 0 20px rgba(74, 222, 128, 0.8)",
                      "0 0 0px rgba(74, 222, 128, 0)",
                    ],
                  }}
                  transition={{
                    duration: 2,
                    delay: 0.5,
                    repeat: Infinity,
                    repeatDelay: 2,
                  }}
                  className="text-green-200 font-black"
                >
                  3RVision
                </motion.span>
                !
              </motion.span>
            </motion.h1>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.3,
              type: "spring",
              stiffness: 100,
              damping: 15,
            }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 drop-shadow-lg"
          >
            Revolutionizing Sustainability
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-base sm:text-lg md:text-xl lg:text-xl text-white mb-8 max-w-2xl mx-auto drop-shadow-lg"
          >
            Empowering sustainable choices through AI-driven intelligence for
            <span className="font-semibold"> Reuse</span>,{" "}
            <span className="font-semibold">Recycle</span> and{" "}
            <span className="font-semibold">Resale</span>.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center gap-4"
        >
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleScanImage}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg"
            >
              <FaCamera className="text-xl" />
              <span>{showCamera ? "Capture Image" : "Scan Item"}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleUploadImage}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg"
            >
              <FaUpload className="text-xl" />
              <span>Upload Image</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleChromeExtension}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg"
            >
              <FaChrome className="text-xl" />
              <span>Extension</span>
            </motion.button>
          </div>

          {!user && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white/20 backdrop-blur-md rounded-lg p-2 mt-3 text-white max-w-md shadow-lg"
            >
              <p className="text-sm md:text-base">
                You have <strong>{remainingUploads}</strong> free image
                operations remaining.
                <br />
                <span className="text-xs sm:text-sm">
                  Sign up for unlimited access
                </span>
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToSignup={() => {
          setShowLoginModal(false);
          setShowSignupModal(true);
        }}
      />
      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSwitchToLogin={() => {
          setShowSignupModal(false);
          setShowLoginModal(true);
        }}
      />
      <UnauthorizedDialog
        isOpen={showUnauthorizedDialog}
        onClose={() => setShowUnauthorizedDialog(false)}
        onLogin={() => {
          setShowUnauthorizedDialog(false);
          setShowLoginModal(true);
        }}
        onSignup={() => {
          setShowUnauthorizedDialog(false);
          setShowSignupModal(true);
        }}
      />

      {isProcessing && <EcoLoader message="Analyzing your item..." />}
    </div>
  );
};

export default HeroSection;
