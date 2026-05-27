import type { ThemeConfig } from "antd";

export const antdTheme: ThemeConfig = {
  token: {
    fontFamily: '"Inter", sans-serif',
    borderRadius: 4,
    colorPrimary: "#3858e9",
    controlHeight: 40,
  },
  components: {
    Button: {
      paddingInline: 12,
    },
  },
};
