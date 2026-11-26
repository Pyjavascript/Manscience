import { Country, State } from "country-state-city";

// Shared by the roadmap details form and the profile edit pop-up

export const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];

// Countries come from country-state-city; names are what we store
const ALL_COUNTRIES = Country.getAllCountries();
export const COUNTRY_NAMES = ALL_COUNTRIES.map((c) => c.name);

// State names for a country name; empty when the package has none
export const getStateNames = (countryName) => {
  const country = ALL_COUNTRIES.find((c) => c.name === countryName);
  return country
    ? State.getStatesOfCountry(country.isoCode).map((s) => s.name)
    : [];
};

// 7–15 digits; allows +, spaces, dashes and brackets
export const isValidPhone = (phone) => {
  const digits = phone.replace(/\D/g, "");
  return (
    /^[+\d\s()-]+$/.test(phone) && digits.length >= 7 && digits.length <= 15
  );
};
