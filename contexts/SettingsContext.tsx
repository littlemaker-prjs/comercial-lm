
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { InfraItem, Region, GlobalVariables, SystemSettings } from '../types';
import { INFRA_CATALOG, REGIONS } from '../constants';

interface SettingsContextProps {
  settings: SystemSettings;
  loading: boolean;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
  resetToDefaults: () => void;
}

const DEFAULT_VARIABLES: GlobalVariables = {
  marketplaceMargin: 0.83,
  materialBonus: 0.25,
  infraBonus: 0.15
};

const SettingsContext = createContext<SettingsContextProps | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings>({
    infraCatalog: INFRA_CATALOG,
    regions: REGIONS,
    variables: DEFAULT_VARIABLES
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch settings if the user is authenticated to avoid permission errors
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchSettings();
      } else {
        // If not logged in, we stop loading and use defaults
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchSettings = async () => {
    try {
      const doc = await db.collection('config').doc('general').get();
      if (doc.exists) {
        const data = doc.data() as Partial<SystemSettings>;
        setSettings({
          infraCatalog: data.infraCatalog || INFRA_CATALOG,
          regions: data.regions || REGIONS,
          variables: { ...DEFAULT_VARIABLES, ...data.variables }
        });
      }
    } catch (error) {
      console.error("Error fetching settings, using defaults:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    try {
      const mergedSettings = { ...settings, ...newSettings };
      setSettings(mergedSettings);
      await db.collection('config').doc('general').set(mergedSettings, { merge: true });
    } catch (error) {
      console.error("Error saving settings:", error);
      throw error;
    }
  };

  const resetToDefaults = () => {
      setSettings({
          infraCatalog: INFRA_CATALOG,
          regions: REGIONS,
          variables: DEFAULT_VARIABLES
      });
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, resetToDefaults }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
