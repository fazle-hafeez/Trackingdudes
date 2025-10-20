import { View,TouchableOpacity,Text,} from "react-native"

const Button = (props) => {
    return (
        <View>
            <TouchableOpacity
                onPress={props.onClickEvent}
                className="rounded-md bg-blue p-3 my-3 w-full h-14 mx-auto"
                activeOpacity={0.6}
            
            >
                <Text
                    className="text-white text-xl text-center font-semibold pt-1"
                >{props.title}</Text>
            </TouchableOpacity>
        </View>
    )

}

export default Button;