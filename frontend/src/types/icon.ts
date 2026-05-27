export interface Icon {
  id: number;
  slug: string;
  name: string;
}

export interface IconsResponse {
  status: "error" | "success";
  code: string;
  data: Icon[];
}
