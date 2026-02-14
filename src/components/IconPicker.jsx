import React, { useState, useRef, useEffect, useMemo ,forwardRef, useImperativeHandle} from "react";
import { View, Text, TouchableOpacity, Modal, FlatList, Animated, Easing, Dimensions, ScrollView } from "react-native";
import { Ionicons, FontAwesome, FontAwesome5, FontAwesome6, MaterialIcons, AntDesign } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeProvider";
import Input from "./Input";
import { getVendorIcon } from "../utils/getVendorIcon";
import { useModalBars } from "../hooks/useModalBar";
import { ThemedText } from "./ThemedColor";

const { height } = Dimensions.get("window");

const RenderIcon = ({ icon, type, size = 26, color }) => {
    if (!icon) return null;
    const props = { name: icon, size, color };

    // Normalize type to lowercase for safe matching
    const normalizedType = type?.toLowerCase();

    switch (normalizedType) {
        case "svgicon":
        case "svg":
            const SvgComp = getVendorIcon(icon);
            return SvgComp ? <SvgComp width={size + 4} height={size + 4} fill={color} /> : null;

        case "fontawesome":
        case "font":
            return <FontAwesome {...props} />;

        case "fontawesome5":
        case "font5":
            return <FontAwesome5 {...props} />;

        case "fontawesome6":
        case "font6":
            return <FontAwesome6 {...props} />;

        case "materialicons":
        case "mater": // API support
            return <MaterialIcons {...props} />;

        case "antdesign":
        case "ant":
            return <AntDesign {...props} />;

        default:
            return <Ionicons {...props} />;
    }
};

const IconPicker = forwardRef(({
    items = [],
    filterOptions = [],   // 3 Buttons data: [{label: 'Fuel', value: 'fuel']
    value = null,
    onChange = () => { },
    placeholder = "Select Vendor",
    modalTitle = "Choose a vendor",
    inputPlaceholder = "Search vendor name......",
    error = "",
    disabled = false,
    isPickerContentShown = false
},ref) => {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const { darkMode } = useTheme();

    useModalBars(open, darkMode);

    const slideAnim = useRef(new Animated.Value(height)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // --- FILTER LOGIC ---
    const filteredData = useMemo(() => {
        return items.filter((item) => {
            // 1. Search by label only
            const matchesSearch = item.label.toLowerCase().includes(searchQuery.toLowerCase());

            // 2. Filter by category button (Checks if activeTab is in item's categories array)
            const matchesCategory = activeTab === "all" || item.categories.includes(activeTab);

            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, activeTab, items]);

    useImperativeHandle(ref, () => ({
        open: () => {
            openModal();
        },
        close: () => {
            closeModal();
        }
    }));

    const openModal = () => {
        setOpen(true);
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0.5, duration: 300, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 300, easing: Easing.out(Easing.exp), useNativeDriver: true }),
        ]).start();
    };

    const closeModal = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: height, duration: 200, useNativeDriver: true }),
        ]).start(() => {
            setOpen(false);
            setSearchQuery("");
            setActiveTab("all"); // Reset filter on close
        });
    };

    const borderColor = isPickerContentShown ? '' : error ? " border border-red-500" : disabled ? "border border-gray-300 opacity-60" : darkMode ? "border border-gray-700" : " border border-[#ccc]";
    const selectedItem = value;


    return (
        <View className="">
            {/* Input Field Appearance */}
            <TouchableOpacity
                onPress={openModal}
                className={` rounded-md px-4 py-4 flex-row justify-between items-center ${borderColor}`}
            >
                <View className="">
                    <Text className={`text-lg ${selectedItem ? (darkMode ? "text-white" : "text-black") : "text-gray-400"}`}>
                        { isPickerContentShown ? '' : selectedItem ? selectedItem.label : placeholder}
                    </Text>
                </View>
             { !isPickerContentShown && (<Ionicons name="chevron-down" size={20} color="#888" />)}
            </TouchableOpacity>

            <Modal transparent visible={open} animationType="none">
                <Animated.View style={{ flex: 1, backgroundColor: "black", opacity: fadeAnim }} />
                <Animated.View
                    style={{
                        position: "absolute", bottom: 0, left: 0, right: 0,
                        transform: [{ translateY: slideAnim }],
                        backgroundColor: darkMode ? "#1f2937" : "white",
                        borderTopLeftRadius: 30, borderTopRightRadius: 30,
                        height: height * 0.75, padding: 20,
                    }}
                >
                    {/* Header */}
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>{modalTitle}</Text>
                        <TouchableOpacity onPress={closeModal} className="bg-gray-100 p-2 rounded-full">
                            <Ionicons name="close" size={22} color="black" />
                        </TouchableOpacity>
                    </View>

                    {/* Search Input */}
                    <Input
                        placeholder={ inputPlaceholder}
                        value={searchQuery}
                        onchange={setSearchQuery}
                        className="mb-4"
                    />

                    <View className="flex-row justify-between items-center mb-4">
                        <ThemedText className=" text-lg">Most populer vendors</ThemedText>
                        <TouchableOpacity className="border border-blue-600  rounded-lg p-2">
                            <ThemedText preventWrap={true} >Add custom vendor</ThemedText>
                        </TouchableOpacity>
                    </View>

                    {/* Dynamic Filter - Auto-width based on text */}
                    <View className="mb-5">
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 2, gap: 10 }}
                        >
                            {/* "All" Button */}
                            <TouchableOpacity
                                onPress={() => setActiveTab("all")}
                                className={`py-2 px-5 rounded-lg border ${activeTab === 'all' ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                                    }`}
                            >
                                <Text className={activeTab === 'all' ? "text-white" : "text-gray-500"}>
                                    All
                                </Text>
                            </TouchableOpacity>

                            {/* Dynamic Buttons */}
                            {filterOptions.map((opt) => (
                                <TouchableOpacity
                                    key={opt.value}
                                    onPress={() => setActiveTab(opt.value)}
                                    className={`py-2 px-5 rounded-lg border items-center justify-center ${activeTab === opt.value ? "bg-blue-500 border-blue-500" : "border-gray-300"
                                        }`}
                                >
                                    <Text
                                        className={`font-medium ${activeTab === opt.value ? "text-white" : "text-gray-500"
                                            }`}
                                    >
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                    {/* Grid List */}
                    <FlatList
                        data={filteredData}
                        numColumns={3}
                        keyExtractor={(item) => item.label}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => {
                                    onChange(item);
                                    closeModal();
                                }}
                                style={{ width: '31%', marginBottom: 12 }}
                                className={`items-center mr-2 p-4 rounded-2xl ${darkMode ? "" : "bg-gray-50"} border ${(value?.label === item.label || value === item.label) ? "border-blue-500" : darkMode ? 'border-gray-500' : "border-transparent"}`}
                            >
                                <RenderIcon icon={item.icon} type={item.type} color={darkMode ? "#fff" : "#333"} />
                                <Text numberOfLines={1} className="text-[10px] mt-2 text-gray-500 text-center">{item.label}</Text>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={<Text className="text-center text-gray-500 mt-10">No vendors found in this category</Text>}
                    />
                </Animated.View>
            </Modal>
        </View>
    );
});

export default IconPicker;