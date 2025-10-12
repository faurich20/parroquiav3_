// src/components/Common/ActionButton.js
import React from "react";
import { motion } from "framer-motion";

const colorVariants = {
  // "blue" ahora sigue la paleta activa del Theme (var(--primary), var(--secondary))
  blue: null,
  red: "from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700",
  green: "from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700",
  gray: "from-gray-500 to-gray-700 hover:from-gray-600 hover:to-gray-800",
};

const ActionButton = ({ color = "blue", icon: Icon, children, onClick }) => {
  return (
    <motion.button
      onClick={onClick}
      className={`bg-gradient-to-r ${colorVariants[color] || ''} text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 text-sm transition-all ${(color === 'blue' || color === 'theme') ? 'hover:brightness-110' : ''}`}
      style={
        (color === 'blue' || color === 'theme')
          ? { background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }
          : undefined
      }
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </motion.button>
  );
};

export default ActionButton;
