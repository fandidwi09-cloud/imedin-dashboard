import { useState, useEffect } from 'react';

export interface Province {
  id: string;
  name: string;
}

export interface Regency {
  id: string;
  province_id: string;
  name: string;
}

export interface District {
  id: string;
  regency_id: string;
  name: string;
}

export interface Village {
  id: string;
  district_id: string;
  name: string;
}

export function useRegions() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
      .then(res => res.json())
      .then(data => {
        setProvinces(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getRegencies = async (provinceId: string): Promise<Regency[]> => {
    if (!provinceId) return [];
    const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provinceId}.json`);
    return res.json();
  };

  const getDistricts = async (regencyId: string): Promise<District[]> => {
    if (!regencyId) return [];
    const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${regencyId}.json`);
    return res.json();
  };

  const getVillages = async (districtId: string): Promise<Village[]> => {
    if (!districtId) return [];
    const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${districtId}.json`);
    return res.json();
  };

  return { provinces, getRegencies, getDistricts, getVillages, loading };
}
