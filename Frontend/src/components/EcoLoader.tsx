import { motion } from "framer-motion";
import { FaRecycle, FaLeaf } from "react-icons/fa";

interface EcoLoaderProps {
  message?: string;
}

const EcoLoader = ({ message = "Analyzing your item..." }: EcoLoaderProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative flex flex-col items-center">
        {/* Container for the loader */}
        <div className="relative w-32 h-32">
          {/* Outer rotating circle */}
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute inset-0"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 rounded-full border-4 border-green-500/30"
            />
            <motion.div
              animate={{
                scale: [1.1, 1, 1.1],
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 rounded-full border-4 border-t-green-400 border-r-green-400 border-b-transparent border-l-transparent"
            />
          </motion.div>

          {/* Center icon */}
          <motion.div
            animate={{
              rotate: [0, -360],
              scale: [1, 1.2, 1],
            }}
            transition={{
              rotate: {
                duration: 4,
                repeat: Infinity,
                ease: "linear",
              },
              scale: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <FaRecycle className="text-4xl text-green-400" />
          </motion.div>

          {/* Floating leaves */}
          <div className="absolute inset-0">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: -50,
                  y: 50,
                  scale: 0,
                  opacity: 0,
                }}
                animate={{
                  x: 50,
                  y: -50,
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: "easeInOut",
                }}
                className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
              >
                <FaLeaf className="text-green-400/50 text-sm" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Loading text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 text-center"
        >
          <motion.p
            animate={{
              opacity: [1, 0.7, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="text-lg text-green-400 font-medium"
          >
            {message}
          </motion.p>
          <motion.div
            animate={{
              scaleX: [1, 1.5, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="mt-2 h-0.5 w-24 mx-auto bg-gradient-to-r from-transparent via-green-400 to-transparent"
          />
        </motion.div>
      </div>
    </div>
  );
};

export default EcoLoader;
