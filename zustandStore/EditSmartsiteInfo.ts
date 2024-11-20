import { create } from "zustand";
export type FontType =
  | "roboto"
  | "poppins"
  | "opensans"
  | "montserrat"
  | "rubik";
// Define the type for form data
interface FormData {
  name: string;
  bio: string;
  profileImg: string;
  backgroundImg: string;
  backgroundColor: string;
  theme: boolean;
  galleryImg: string;
  fontColor: string;
  fontType: FontType;
  templateColor: string;
}

// Define the type for the store state
interface SmartsiteFormStore {
  formData: FormData;
  setFormData: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
}

// Create the Zustand store
const useSmartsiteFormStore = create<SmartsiteFormStore>((set) => ({
  formData: {
    name: "",
    bio: "",
    profileImg: "",
    backgroundImg: "",
    theme: true,
    galleryImg: "",
    backgroundColor: "",
    fontColor: "",
    fontType: "roboto",
    templateColor: "",
  },
  setFormData: (field, value) =>
    set((state) => ({
      formData: {
        ...state.formData,
        [field]: value,
      },
    })),
}));

export default useSmartsiteFormStore;
