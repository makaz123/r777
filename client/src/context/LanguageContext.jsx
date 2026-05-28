import React, { createContext, useContext, useState } from 'react';

// Static imports of all language files
import english from '../lang/english.json';
import hindi from '../lang/hindi.json';
import ban from '../lang/ban.json';
import Gurjati from '../lang/Gurjati.json';
import kan from '../lang/kan.json';
import mal from '../lang/mal.json';
import mar from '../lang/mar.json';
import odia from '../lang/odia.json';
import pan from '../lang/pan.json';
import tamil from '../lang/tamil.json';
import telugu from '../lang/telugu.json';
import assm from '../lang/assm.json';

const languages = {
  en: { symbol: 'EN', label: 'English', data: english },
  hi: { symbol: 'HI', label: 'Hindi', data: hindi },
  bn: { symbol: 'BN', label: 'Bangla', data: ban },
  gu: { symbol: 'GU', label: 'Gujarati', data: Gurjati },
  kn: { symbol: 'KN', label: 'Kannada', data: kan },
  ml: { symbol: 'ML', label: 'Malayalam', data: mal },
  mr: { symbol: 'MR', label: 'Marathi', data: mar },
  or: { symbol: 'OR', label: 'Odia', data: odia },
  pa: { symbol: 'PA', label: 'Punjabi', data: pan },
  ta: { symbol: 'TA', label: 'Tamil', data: tamil },
  te: { symbol: 'TE', label: 'Telugu', data: telugu },
  as: { symbol: 'AS', label: 'Assamese', data: assm },
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [currentLang, setCurrentLang] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  const changeLanguage = (langCode) => {
    if (languages[langCode]) {
      setCurrentLang(langCode);
      localStorage.setItem('language', langCode);
    }
  };

  const t = (key, fallback = '') => {
    const langData = languages[currentLang]?.data || english;
    if (langData && langData[key]) {
      return langData[key];
    }
    // Try english fallback next
    if (english[key]) {
      return english[key];
    }
    // Fall back to original key/provided text if key missing entirely
    return fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{ currentLang, changeLanguage, t, languages }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
