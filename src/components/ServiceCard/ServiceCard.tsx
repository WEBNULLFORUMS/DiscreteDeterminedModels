"use client";

import React from "react";
import styles from "./ServiceCard.module.scss";

interface ServiceCardProps {
  modelId: "matrix" | "rings" | "graph";
  serviceName: string;
  badge: string;
  description: string;
  tags: string[];
  difficulty?: "easy" | "medium" | "hard";
  onDifficultyChange?: (diff: "easy" | "medium" | "hard") => void;
  onAction?: () => void;
  actionText?: string;
  onClick?: () => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  modelId,
  serviceName,
  badge,
  description,
  tags,
  difficulty,
  onDifficultyChange,
  onAction,
  actionText,
  onClick,
}) => {
  const getVisualClass = () => {
    switch (modelId) {
      case "matrix": return styles.googleVisual;
      case "rings": return styles.spotifyVisual;
      case "graph": return styles.kaspiVisual;
      default: return "";
    }
  };

  const renderIcon = () => {
    switch (modelId) {
      case "matrix":
        return (
          <svg viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="8" height="8" rx="1" fill="#4285F4"/>
            <rect x="13" y="3" width="8" height="8" rx="1" fill="#EA4335"/>
            <rect x="3" y="13" width="8" height="8" rx="1" fill="#34A853"/>
            <rect x="13" y="13" width="8" height="8" rx="1" fill="#FBBC05"/>
          </svg>
        );
      case "rings":
        return (
          <svg viewBox="0 0 24 24" fill="#1DB954">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 14.36c-.18.28-.56.36-.84.18-2.3-1.4-5.2-1.72-8.6-.94-.32.08-.66-.12-.74-.46-.08-.32.12-.66.46-.74 3.74-.86 6.94-.48 9.54 1.1.28.16.36.56.18.86zm1.22-2.7c-.22.34-.7.46-1.04.24-2.64-1.62-6.66-2.1-9.78-1.14-.4.12-.82-.1-.94-.5s.1-.82.5-.94c3.56-1.08 8-.56 11.02 1.3.34.2.44.68.24 1.04zm.1-2.82c-3.16-1.88-8.38-2.04-11.4-1.12-.48.14-1-.14-1.14-.62-.14-.48.14-1 .62-1.14 3.46-1.04 9.22-.84 12.86 1.3.44.26.58.82.32 1.26-.26.42-.82.58-1.26.32z"/>
          </svg>
        );
      case "graph":
        return (
          <svg viewBox="0 0 24 24" fill="none">
            <rect x="2" y="6" width="20" height="12" rx="2" fill="#FF0033"/>
            <rect x="4" y="10" width="8" height="2" rx="1" fill="white"/>
            <circle cx="18" cy="11" r="2" fill="white"/>
          </svg>
        );
    }
  };

  const renderPreview = () => {
    switch (modelId) {
      case "matrix":
        return (
          <div className={styles.previewGrid}>
            {[1, 0, 1, 0, 1, 0, 1, 0, 1].map((val, i) => (
              <div key={i} className={`${styles.previewCell} ${val ? styles.on : styles.off}`}></div>
            ))}
          </div>
        );
      case "rings":
        return (
          <div className={styles.previewRings}>
            <div className={`${styles.previewRing} ${styles.ringOuter}`}></div>
            <div className={`${styles.previewRing} ${styles.ringMiddle}`}></div>
            <div className={`${styles.previewRing} ${styles.ringInner}`}></div>
            <div className={styles.previewCenter}></div>
          </div>
        );
      case "graph":
        return (
          <div className={styles.previewGraph}>
            <div className={`${styles.graphNodePreview} ${styles.n1}`}></div>
            <div className={`${styles.graphNodePreview} ${styles.n2}`}></div>
            <div className={`${styles.graphNodePreview} ${styles.n3}`}></div>
            <div className={`${styles.graphNodePreview} ${styles.n4}`}></div>
            <svg className={styles.graphLines} viewBox="0 0 100 60">
              <line x1="15" y1="30" x2="40" y2="15" stroke="currentColor" strokeWidth="2"/>
              <line x1="15" y1="30" x2="40" y2="45" stroke="currentColor" strokeWidth="2"/>
              <line x1="40" y1="15" x2="85" y2="30" stroke="currentColor" strokeWidth="2"/>
              <line x1="40" y1="45" x2="85" y2="30" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
        );
    }
  };

  const handleDifficultyClick = (e: React.MouseEvent, diff: "easy" | "medium" | "hard") => {
    e.stopPropagation();
    if (onDifficultyChange) {
      onDifficultyChange(diff);
    }
  };

  return (
    <div className={styles.serviceCard} onClick={onClick}>
      <div className={`${styles.serviceVisual} ${getVisualClass()}`}>
        <div className={styles.serviceIconWrapper}>
          {renderIcon()}
        </div>
        <div className={styles.servicePreview}>
          {renderPreview()}
        </div>
      </div>
      <div className={styles.serviceContent}>
        <div className={styles.serviceBadge}>{badge}</div>
        <h3 className={styles.serviceName}>{serviceName}</h3>
        <p className={styles.serviceDescription}>{description}</p>
        <div className={styles.serviceTags}>
          {tags.map((tag) => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
        </div>
        {difficulty && (
          <div className={styles.difficultyPicker}>
            <span>Сложность:</span>
            {(["easy", "medium", "hard"] as const).map((diff) => (
              <button
                key={diff}
                className={`${styles.difficultyOption} ${difficulty === diff ? styles.active : ""}`}
                onClick={(e) => handleDifficultyClick(e, diff)}
              >
                {diff === "easy" ? "Легко" : diff === "medium" ? "Средне" : "Сложно"}
              </button>
            ))}
          </div>
        )}
      </div>
      {actionText && (
        <button
          className={`btn btn-primary ${styles.btnCard}`}
          onClick={(e) => {
            e.stopPropagation();
            if (onAction) onAction();
          }}
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
