import { create } from "zustand";
export type FontType =
  | "Roboto"
  | "Poppins"
  | "OpenSans"
  | "Montserrat"
  | "Rubik";
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
  secondaryFontColor: string;
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
    secondaryFontColor: "",
    fontType: "Roboto",
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
