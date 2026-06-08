export interface Icon {
  id: number;
  name: string;
  type_id: number | null;
  tags: string | null;
  library_id: number;
  filename: string;
}

export interface PaginatedIcons {
  items: Icon[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface IconsResponse {
  status: "error" | "success";
  code: string;
  data: PaginatedIcons;
}

interface LibraryMeta {
  h: number; // height of the icon
  w: number; // width of the icon
}

export interface Library {
  id: number;
  slug: string;
  name: string;
  meta: LibraryMeta | null;
}

export interface LibrariesResponse {
  status: "error" | "success";
  code: string;
  data: Library[];
}

export interface IconType {
  id: number;
  type: string;
}

export interface IconTypesResponse {
  status: "error" | "success";
  code: string;
  data: IconType[];
}
