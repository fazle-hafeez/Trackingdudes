import React, { useState } from "react";
import { View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ThemedView, ThemedText, SafeAreacontext } from "../../../src/components/ThemedColor";
import PageHeader from "../../../src/components/PageHeader";
import Button from "../../../src/components/Button";
import Input from "../../../src/components/Input";
import Select from "../../../src/components/Select";

const Vendor = () => {
    const [vendorName, setVendorName] = useState("");
    const [selectedIcon, setSelectedIcon] = useState("");
    const [vendorList, setVendorList] = useState([]);

    // Example vendor icons
    const iconOptions = [
        { icon: "storefront-outline", label: "Storefront", value: "storefront" },
        { icon: "business-outline", label: "Business", value: "business" },
        { icon: "cube-outline", label: "Warehouse", value: "warehouse" },
        { icon: "cart-outline", label: "E-commerce", value: "ecommerce" },
        { icon: "receipt-outline", label: "Receipt", value: "receipt" },
        { icon: "people-outline", label: "Supplier", value: "supplier" },
    ];

    const handleAddVendor = () => {
        if (!vendorName || !selectedIcon) {
            alert("Please enter vendor name and select an icon");
            return;
        }

        const newVendor = {
            label: vendorName,
            value: vendorName.toLowerCase().replace(/\s/g, "-"),
            icon: selectedIcon,
        };

        setVendorList([...vendorList, newVendor]);
        setVendorName("");
        setSelectedIcon("");
    };

    return (
        <SafeAreacontext className="flex-1">
            <PageHeader routes="Adding Vendor" />

            <View className="p-4 flex-1">
                {/* Card with title */}
                <ThemedView className="p-4 rounded-lg mb-5" style={{ elevation: 2 }}>
                    <ThemedText color="#374151" className="text-center text-lg font-medium mb-1">
                        Add Vendor
                    </ThemedText>
                </ThemedView>

                {/* Vendor Name Input */}
                <ThemedView className="p-4 rounded-lg mb-5" style={{ elevation: 2 }}>
                    <ThemedText className="mb-1">Vendor:</ThemedText>
                    <Input placeholder="Enter your vendor name" value={vendorName} onchange={setVendorName} />
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
                        placeholder="Choose an icon"
                    />
                </ThemedView>

                {/* Bottom display of selected icon & label */}
                {vendorName && selectedIcon && (
                    <ThemedView
                        className="flex-row items-center p-4 rounded-xl shadow-lg"
                        style={{ elevation: 5 }}
                    >
                        <Ionicons name={selectedIcon} size={28} color="#2563eb" className="mr-3" />
                        <ThemedText className="text-base font-semibold">{vendorName}</ThemedText>
                    </ThemedView>
                )}

                {/* Submit Button */}
                <Button title="Save" onPress={handleAddVendor} />

                <ThemedText color="#374151" className="mt-4 text-lg">
                    Please choose an icon that best represents this vendor. 
                    This helps you quickly identify the vendor in the app.
                </ThemedText>
            </View>
        </SafeAreacontext>
    );
};

export default Vendor;
