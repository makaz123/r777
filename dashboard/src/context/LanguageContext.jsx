import React, { createContext, useContext, useState } from 'react';

// Import translation JSONs directly from the client workspace
import english from '../../../client/src/lang/english.json';
import hindi from '../../../client/src/lang/hindi.json';
import ban from '../../../client/src/lang/ban.json';
import Gurjati from '../../../client/src/lang/Gurjati.json';
import kan from '../../../client/src/lang/kan.json';
import mal from '../../../client/src/lang/mal.json';
import mar from '../../../client/src/lang/mar.json';
import odia from '../../../client/src/lang/odia.json';
import pan from '../../../client/src/lang/pan.json';
import tamil from '../../../client/src/lang/tamil.json';
import telugu from '../../../client/src/lang/telugu.json';
import assm from '../../../client/src/lang/assm.json';

const languages = {
  en: { label: 'English', data: english },
  hi: { label: 'हिन्दी', data: hindi },
  bn: { label: 'বাংলা', data: ban },
  gu: { label: 'ગુજરાતી', data: Gurjati },
  kn: { label: 'ಕನ್ನಡ', data: kan },
  ml: { label: 'മലയാളം', data: mal },
  mr: { label: 'मराठी', data: mar },
  or: { label: 'ଓଡ଼ିଆ', data: odia },
  pa: { label: 'ਪੰਜਾਬੀ', data: pan },
  ta: { label: 'தமிழ்', data: tamil },
  te: { label: 'తెలుగు', data: telugu },
  as: { label: 'অসমীয়া', data: assm },
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
    if (english[key]) {
      return english[key];
    }
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
