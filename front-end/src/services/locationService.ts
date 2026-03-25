const LOCATION_API_BASE = 'https://provinces.open-api.vn/api/v2';

export interface ProvinceOption {
  code: number;
  name: string;
}

export interface WardOption {
  code: number;
  name: string;
}

interface ProvinceWithWardsResponse {
  code: number;
  name: string;
  wards?: WardOption[];
}

let provincesWithWardsPromise: Promise<ProvinceWithWardsResponse[]> | null = null;

function sortByName<T extends { name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

async function fetchProvincesWithWards(): Promise<ProvinceWithWardsResponse[]> {
  if (!provincesWithWardsPromise) {
    provincesWithWardsPromise = fetch(`${LOCATION_API_BASE}/?depth=2`).then(async (response) => {
      if (!response.ok) {
        throw new Error('Không thể tải danh sách tỉnh/thành phố.');
      }

      return (await response.json()) as ProvinceWithWardsResponse[];
    });
  }

  return provincesWithWardsPromise;
}

export async function fetchProvinces(): Promise<ProvinceOption[]> {
  const data = await fetchProvincesWithWards();
  return sortByName(data.map((item) => ({ code: item.code, name: item.name })));
}

export async function fetchWardsByProvinceCode(provinceCode: number): Promise<WardOption[]> {
  const provinces = await fetchProvincesWithWards();
  const province = provinces.find((item) => item.code === provinceCode);

  if (!province) {
    return [];
  }

  return sortByName((province.wards ?? []).map((ward) => ({ code: ward.code, name: ward.name })));
}
