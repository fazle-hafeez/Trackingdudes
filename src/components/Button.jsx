import { View,TouchableOpacity,Text,} from "react-native"
import { useTheme } from "../context/ThemeProvider";
const Button = (props) => {
    const {darkMode } = useTheme()
    const finaldarkmodeprocess = darkMode ? 'border border-gray-500 ' : 'bg-blue-700'
    const darkmodeColor = darkMode ? 'text-gray-400' : 'text-white'
    return (
        <View>
            <TouchableOpacity
                onPress={props.onClickEvent}
                className={` ${finaldarkmodeprocess} rounded-md  p-3 my-3 w-full h-14 mx-auto`}
                activeOpacity={0.6}
            
            >
                <Text
                    className={` ${darkmodeColor}  text-xl text-center font-semibold pt-1`}
                >{props.title}</Text>
            </TouchableOpacity>
        </View>
    )

}

export default Button;