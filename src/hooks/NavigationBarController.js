import { useEffect } from "react";
import * as NavigationBar from "expo-navigation-bar";

export function useNavBar(options = {}) {
  const {
    color = "#fffff", // default black
    buttonStyle = "light",
    visible = true,
  } = options;

  useEffect(() => {
    const setup = async () => {
      try {
        // Edge-to-edge ke sath kuch devices par color skip hota hai
        await NavigationBar.setButtonStyleAsync(buttonStyle);
        await NavigationBar.setVisibilityAsync(visible ? "visible" : "hidden");

        // Thoda delay de color ke liye (edge-to-edge fix)
        setTimeout(() => {
          NavigationBar.setBackgroundColorAsync(color);
        }, 100);
      } catch (e) {
        console.warn("NavBar setup failed:", e);
      }
    };

    setup();

    return () => {
      // Restore defaults
      NavigationBar.setVisibilityAsync("visible");
      NavigationBar.setButtonStyleAsync("light");
      NavigationBar.setBackgroundColorAsync("#000000");
    };
  }, [color, buttonStyle, visible]);
}
