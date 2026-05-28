import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../../context/LanguageContext';

export default function LanguageSelector() {
  const { currentLang, changeLanguage, languages } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLang = languages[currentLang] || languages.en;

  return (
    <div className='language-selector-wrapper' ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='lang-trigger-btn'
        aria-expanded={isOpen}
      >
        <span className='lang-icon'>🌐</span>
        <span className='lang-label'>{activeLang.symbol}</span>
        <span className={`lang-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <ul className='lang-dropdown-menu scrollbar-hide max-h-screen overflow-y-scroll pb-50'>
          {Object.entries(languages).map(([code, item]) => (
            <li key={code}>
              <button
                onClick={() => {
                  changeLanguage(code);
                  setIsOpen(false);
                }}
                className={`lang-option-btn ${code === currentLang ? 'active' : ''}`}
              >
                <span className='lang-check'>
                  {code === currentLang ? '✓' : ''}
                </span>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <style jsx='true'>{`
        .language-selector-wrapper {
          position: relative;
          display: inline-block;
          font-family: 'Outfit', 'Inter', sans-serif;
        }

        .lang-trigger-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          padding: 6px 12px;
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
          outline: none;
        }

        .lang-trigger-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }

        .lang-arrow {
          font-size: 10px;
          transition: transform 0.2s ease;
          opacity: 0.7;
        }

        .lang-arrow.open {
          transform: rotate(180deg);
        }

        .lang-dropdown-menu {
          position: absolute;
          top: 40px;
          right: 0;
          min-width: 140px;
          background: rgba(26, 26, 36, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 6px;
          list-style: none;
          box-shadow:
            0 10px 25px -5px rgba(0, 0, 0, 0.5),
            0 8px 10px -6px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(20px);
          animation: langSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          margin: 0;
          z-index: 99;
        }

        @keyframes langSlideIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .lang-option-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          background: none;
          border: none;
          padding: 8px 12px;
          text-align: left;
          color: rgba(255, 255, 255, 0.8);
          font-size: 13px;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .lang-option-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }

        .lang-option-btn.active {
          background: linear-gradient(135deg, #02aab0 0%, #00cdac 100%);
          color: #ffffff;
        }

        .lang-check {
          display: inline-block;
          width: 12px;
          font-size: 11px;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}
