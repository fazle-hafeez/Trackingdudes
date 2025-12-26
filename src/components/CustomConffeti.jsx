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
      setTimeout(() => rightRef.current?.start(), 120);
    }
  }, [trigger]);

  return (
    <>
      {/* BOTTOM LEFT */}
      <ConfettiCannon
        ref={leftRef}
        count={60}                 // MORE CONFETTI
        explosionSpeed={700}      // SEND HIGH
        fallSpeed={1500}           // LONG FALL (FULL SCREEN)
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

      {/* BOTTOM RIGHT */}
      <ConfettiCannon
        ref={rightRef}
        count={50}
        explosionSpeed={700}
        fallSpeed={1500}
        autoStart={false}
        fadeOut={false}
        origin={{ x: width + 30, y: height + 20 }} // TRUE BOTTOM RIGHT
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
