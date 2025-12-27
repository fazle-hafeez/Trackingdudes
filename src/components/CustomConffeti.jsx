import React, { useRef, useEffect } from "react";
import { Dimensions } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";

const { width, height } = Dimensions.get("window");

export default function CustomConffeti({ trigger = false }) {
  const leftRef = useRef(null);
  const rightRef = useRef(null);

  useEffect(() => {
    if (trigger) {
      leftRef.current?.start();
      setTimeout(() => leftRef.current?.start(), 100);
    }
  }, [trigger]);

  return (
    <>
      {/* BOTTOM LEFT */}
      <ConfettiCannon
        ref={leftRef}
        count={80}                 // MORE CONFETTI
        explosionSpeed={600}      // SEND HIGH
        fallSpeed={2000}           // LONG FALL (FULL SCREEN)
        autoStart={false}
        fadeOut={false}
        origin={{ x: -30, y: height + 20 }}   // TRUE BOTTOM (OUTSIDE SCREEN)
        colors={[
          "#ff0066",
          "#ffcc00",
          "#33cc33",
          "#3399ff",
          "#ff3300",
        ]}
      />

    </>
  );
}
