import { Audio } from "expo-av";

export const playSound = async (type = "success") => {
  const sound = new Audio.Sound();

  try {
    const sounds = {
      success: require("../../assets/sounds/success.mp3"),
      removed: require("../../assets/sounds/removed.wav"),
      error: require("../../assets/sounds/error.mp3"),
      warning: require("../../assets/sounds/warning.wav"),
    };

    const soundFile = sounds[type] || sounds.success;

    await sound.loadAsync(soundFile);
    await sound.playAsync();

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) sound.unloadAsync();
    });
  } catch (error) {
    console.log("Sound play error:", error);
  }
};
