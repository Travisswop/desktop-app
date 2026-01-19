// Helper function to get the right filter for your 3 specific colors
const getSmallIconColorFilter = (color: string) => {
  switch (color) {
    case "#000000":
      // Black - no filter needed (default)
      return "brightness(0) saturate(100%)";
    case "black":
      // Black - no filter needed (default)
      return "brightness(0) saturate(100%)";
    case "#D3D3D3":
      // Light Gray - brightness to lighten
      return "brightness(0) saturate(100%) invert(87%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(88%)";
    case "#8D8D8D":
      // Medium Gray
      return "brightness(0) saturate(100%) invert(59%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(92%) contrast(88%)";
    case "gray":
      // Medium Gray
      return "brightness(0) saturate(100%) invert(59%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(92%) contrast(88%)";
    default:
      return "brightness(0) saturate(100%)";
  }
};

export default getSmallIconColorFilter;
