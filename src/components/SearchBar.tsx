import { FiSearch } from "react-icons/fi";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchLocations } from "../lib/locations";
import type { Location } from "../types";

function SearchBar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");
  const [locations, setLocations] = useState<Location[]>([]);

  const initialCity = searchParams.get("city") ?? "";
  const initialCountry = searchParams.get("country") ?? "";

  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(initialCountry);
  const [selectedCity, setSelectedCity] = useState(initialCity);

  useEffect(() => {
    fetchLocations()
      .then(setLocations)
      .catch(() => setLocations([]));
  }, []);

  // Once locations load, derive the region/country for whatever city or
  // country came in via the URL, so the bar reflects the current search
  // instead of resetting blank.
  useEffect(() => {
    if (locations.length === 0) return;
    const city = initialCity || selectedCity;
    const match = city
      ? locations.find((location) => location.city === city)
      : locations.find((location) => location.country === initialCountry);
    if (match) {
      setSelectedRegion(match.region);
      if (!selectedCountry) setSelectedCountry(match.country);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations]);

  const regions = useMemo(
    () => Array.from(new Set(locations.map((location) => location.region))),
    [locations]
  );

  const availableCountries = useMemo(
    () =>
      selectedRegion
        ? Array.from(
            new Set(
              locations
                .filter((location) => location.region === selectedRegion)
                .map((location) => location.country)
            )
          )
        : [],
    [locations, selectedRegion]
  );

  const availableCities = useMemo(
    () =>
      selectedCountry
        ? locations
            .filter((location) => location.country === selectedCountry)
            .map((location) => location.city)
        : [],
    [locations, selectedCountry]
  );

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRegion(e.target.value);
    setSelectedCountry("");
    setSelectedCity("");
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCountry(e.target.value);
    setSelectedCity("");
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCity(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("keyword", keyword.trim());
    if (selectedCity) params.set("city", selectedCity);
    else if (selectedCountry) params.set("country", selectedCountry);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <form id="search-wrap" onSubmit={handleSubmit}>
      {/* region dropdown */}
      <select id="region" value={selectedRegion} onChange={handleRegionChange}>
        <option value="">Select a region</option>
        {regions.map((region) => (
          <option key={region} value={region}>
            {region}
          </option>
        ))}
      </select>
      {/* country dropdown */}
      <select id="country" value={selectedCountry} onChange={handleCountryChange}>
        <option value="">Select a country</option>
        {availableCountries.map((country) => (
          <option key={country} value={country}>
            {country}
          </option>
        ))}
      </select>
      {/* city dropdown */}
      <select id="city" value={selectedCity} onChange={handleCityChange}>
        <option value="">Select a city</option>
        {availableCities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>
      <input
        id="keyword"
        type="text"
        placeholder="Search posts..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />
      <button id="find" type="submit" aria-label="Search">
        <FiSearch />
      </button>
    </form>
  );
}

export default SearchBar;
