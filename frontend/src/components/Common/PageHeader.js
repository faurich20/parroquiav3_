// parroquia-frontend\src\components\Common\PageHeader.js
import React from "react";
import { motion } from "framer-motion";

const PageHeader = ({ title, subtitle, icon: Icon, children }) => {
  return (
    <motion.div
      className="rounded-2xl p-6 mb-6 shadow-sm border"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        color: "var(--text)"
      }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {Icon && (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, var(--primary), var(--secondary))"
              }}
            >
              <Icon className="w-6 h-6 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1" style={{ color: "var(--muted)" }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {children && (
          <div className="flex items-center gap-3">{children}</div>
        )}
      </div>
    </motion.div>
  );
};

export default PageHeader;
