import React, { useState } from "react";
import { View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ThemedView, ThemedText, SafeAreacontext } from "../../../src/components/ThemedColor";
import PageHeader from "../../../src/components/PageHeader";
import Button from "../../../src/components/Button";
import Input from "../../../src/components/Input";
import Select from "../../../src/components/Select";

const CategoryPage = () => {
    const [categoryName, setCategoryName] = useState("");
    const [selectedIcon, setSelectedIcon] = useState("");
    const [categoryList, setCategoryList] = useState([]);

    // Example category icons
    const iconOptions = [
        { icon: "briefcase-outline", label: "Office", value: "office" },
        { icon: "airplane-outline", label: "Travel", value: "travel" },
        { icon: "flash-outline", label: "Utility", value: "utility" },
        { icon: "cart-outline", label: "Shopping", value: "shopping" },
        { icon: "restaurant-outline", label: "Food", value: "food" },
        { icon: "heart-outline", label: "Health", value: "health" },
    ];

    const handleAddCategory = () => {
        if (!categoryName || !selectedIcon) {
            alert("Please enter category name and select an icon");
            return;
        }

        const newCategory = {
            label: categoryName,
            value: categoryName.toLowerCase().replace(/\s/g, "-"),
            icon: selectedIcon,
        };

        setCategoryList([...categoryList, newCategory]);
        setCategoryName("");
        setSelectedIcon("");
    };

    return (
        <SafeAreacontext className="flex-1">
            <PageHeader routes="Adding Category " />

            <View className="p-4 flex-1">
                {/* Card with title */}
                <ThemedView className="p-4 rounded-lg mb-5" style={{ elevation: 2 }}>
                    <ThemedText color="#374151" className="text-center text-lg font-medium mb-1">
                        Add Category
                    </ThemedText>
                </ThemedView>

                {/* Category Name Input */}
                <ThemedView className="p-4 rounded-lg mb-5" style={{ elevation: 2 }}>
                    <ThemedText className="mb-1">Category :</ThemedText>
                    <Input placeholder="Enter your  category name..." value={categoryName} onchange={setCategoryName} />
                </ThemedView>

                {/* Icon Select */}
                <ThemedView className="p-4 rounded-lg mb-3" style={{ elevation: 2 }}>
                    <ThemedText className="mb-2">Choose an icon:</ThemedText>
                    <Select
                        items={iconOptions.map(icon => ({
                            label: icon.label,
                            value: icon.icon, // select value
                            icon: icon.icon   // modal me icon show karne ke liye
                        }))}
                        value={selectedIcon}
                        onChange={setSelectedIcon}
                        iconVisibility={true} // 3-column icons ke liye
                        placeholder="Select icon"
                    />
                </ThemedView>

                {/* Bottom display of selected icon & label */}
                {categoryName && selectedIcon && (
                    <ThemedView
                        className="flex-row items-center p-4 rounded-xl shadow-lg"
                        style={{ elevation: 5 }}
                    >
                        <Ionicons name={selectedIcon} size={28} color="#2563eb" className="mr-3" />
                        <ThemedText className="text-base font-semibold">{categoryName}</ThemedText>
                    </ThemedView>
                )}

                {/* Submit Button */}
                <Button title="Save" onPress={handleAddCategory} />

                <ThemedText color="#374151" className="mt-4 text-lg">
                    Please choose an icon that best represents this category.
                    This helps you quickly identify the category in the app.
                </ThemedText>
            </View>
        </SafeAreacontext>
    );
};

export default CategoryPage;
