import React, { useRef, useEffect } from "react";
import { Dimensions } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";

const { width, height } = Dimensions.get("window");

export default function CustomConffeti({ trigger = false }) {
  const leftRef = useRef(null);

  useEffect(() => {
    if (trigger) {
      leftRef.current?.start();     // now ONLY 1 TIME
    }
  }, [trigger]);

  return (
    <>
      <ConfettiCannon
        ref={leftRef}
        count={80}
        autoStart={false}
        radius={20}                        // 🔥BIG CONFETTI
        explosionSpeed={800}               // MORE POWER
        fallSpeed={2000}                   // MORE FALL
        origin={{ x: -30, y: height + 20 }}
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
