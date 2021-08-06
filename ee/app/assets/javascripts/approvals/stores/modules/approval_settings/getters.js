export const settingChanged = ({ settings, initialSettings }) => {
  return Object.entries(settings).findIndex(([key, value]) => initialSettings[key] !== value) > -1;
};
