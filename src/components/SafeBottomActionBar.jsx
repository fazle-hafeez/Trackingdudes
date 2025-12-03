import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomActionBar from "./ActionBar";

const SafeBottomActionBar = (props) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{ paddingBottom: insets.bottom  }} // safe area + extra padding
      className="absolute left-0 right-0 bottom-0"
    >
      <BottomActionBar {...props} />
    </View>
  );
};

export default SafeBottomActionBar;
