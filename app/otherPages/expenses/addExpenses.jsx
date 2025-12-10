import React, { useState } from "react";
import { View, TouchableOpacity, Image, ScrollView, Platform, Text, ActivityIndicator } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import PageHeader from "../../../src/components/PageHeader";
import { ThemedView, SafeAreacontext, ThemedText } from "../../../src/components/ThemedColor";
import Input from "../../../src/components/Input";
import Button from "../../../src/components/Button";
import { useTheme } from "../../../src/context/ThemeProvider";
import Select from "../../../src/components/Select";
import { useApi } from "../../../src/hooks/useApi";
import Tabs from "../../../src/components/Tabs";

const AddExpenses = () => {
    const { darkMode } = useTheme();
    const { get } = useApi();
    
    const [receipt, setReceipt] = useState(null);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [vendor, setVendor] = useState("");
    const [memo, setMemo] = useState("");
    const [amountError, setAmountError] = useState("");
    const [categoryError, setCategoryError] = useState("");
    const [vendorError, setVendorError] = useState("");

    // --- PROJECT SELECT STATES ---
    const [projectItems, setProjectItems] = useState([]);
    const [projectLoading, setProjectLoading] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);

    // Pick Image
    const pickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            alert("Permission is required to select images.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            allowsEditing: true
        });

        if (!result.canceled) {
            setReceipt(result.assets[0].uri);
        }
    };

    // Handle Date
    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === "ios");
        if (selectedDate) setDate(selectedDate);
    };

    // Fetch Projects on Select Open
    const fetchProjects = async () => {
        if (projectItems.length > 0) return; // already fetched
        setProjectLoading(true);
        try {
            const url = `my-projects/show-in?destination=expenses`;
            const response = await get(url, { useBearerAuth: true });
            if (response.status === "success") {
                const formatted = response.data.map(p => ({ label: p.project, value: p.project }));
                setProjectItems(formatted);
            } else {
                setProjectItems([]);
            }
        } catch (error) {
            console.log("Project fetch error:", error);
            setProjectItems([]);
        } finally {
            setProjectLoading(false);
        }
    };

    // Submit Form
    const handleSubmit = () => {
        if (!amount) return setAmountError("Amount is required");
        if (!category) return setCategoryError("Category is required");
        if (!vendor) return setVendorError("Vendor is required");

        alert("Expense submitted successfully!");
    };

    const bgColor = darkMode ? "bg-gray-800" : "bg-white";

    return (
        <SafeAreacontext className="flex-1">
            <PageHeader routes="Add Expenses" />
            <ScrollView className="p-3">

                {/* Header */}
                <ThemedView className="p-4 rounded-lg mb-4" style={{ elevation: 5 }}>
                    <ThemedText className="text-center text-lg font-medium">Expenses Reports</ThemedText>
                </ThemedView>

                {/* Receipt */}
                <ThemedView className={`mb-4 p-4 rounded-lg ${bgColor} border border-gray-300`} style={{ elevation: 5 }}>
                    <TouchableOpacity className="flex-row justify-between items-center" onPress={pickImage}>
                        <View className="flex-row items-center">
                            <Ionicons name="attach-outline" size={24} color={darkMode ? "#fff" : "#1f2937"} />
                            <Text className={`ml-3 text-base ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Attach Receipt</Text>
                        </View>

                        {receipt ? (
                            <Image source={{ uri: receipt }} style={{ width: 50, height: 40, borderRadius: 8 }} />
                        ) : (
                            <Ionicons name="image-outline" size={26} color={darkMode ? "#aaa" : "#9ca3af"} />
                        )}
                    </TouchableOpacity>
                </ThemedView>

                {/* Date */}
                <ThemedView className={`mb-4 p-4 rounded-lg ${bgColor} border border-gray-300`} style={{ elevation: 5 }}>
                    <ThemedText className="mb-1 text-base">Date of purchase:</ThemedText>
                    <TouchableOpacity className="flex-row justify-between items-center" onPress={() => setShowDatePicker(true)}>
                        <Input value={date.toDateString()} onchange={() => { }} placeholder="Date of Purchase" inputError="" />
                        <Ionicons name="calendar-outline" size={24} color={darkMode ? "#fff" : "#1f2937"} />
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker value={date} mode="date" display="default" onChange={handleDateChange} maximumDate={new Date()} />
                    )}
                </ThemedView>

                {/* Amount */}
                <ThemedView className={`mb-4 p-4 rounded-lg ${bgColor} border border-gray-300`} style={{ elevation: 5 }}>
                    <ThemedText className="mb-1 text-base">Amount:</ThemedText>
                    <Input value={amount} onchange={setAmount} placeholder="Amount" keyboardType="numeric" inputError={amountError} setInputError={setAmountError} />
                </ThemedView>

                {/* Category */}
                <ThemedView className={`mb-4 p-4 rounded-lg ${bgColor} border border-gray-300`} style={{ elevation: 5 }}>
                    <ThemedText className="mb-1 text-base">Category:</ThemedText>
                    <Input value={category} onchange={setCategory} placeholder="Category" inputError={categoryError} setInputError={setCategoryError} />
                </ThemedView>

                {/* Vendor */}
                <ThemedView className={`mb-4 p-4 rounded-lg ${bgColor} border border-gray-300`} style={{ elevation: 5 }}>
                    <ThemedText className="mb-1 text-base">Vendor:</ThemedText>
                    <Input value={vendor} onchange={setVendor} placeholder="Vendor" inputError={vendorError} setInputError={setVendorError} />
                </ThemedView>

                {/* PROJECT SELECT */}
                <ThemedView className={`mb-4 p-4 rounded-lg ${bgColor} border border-gray-300`} style={{ elevation: 5 }}>
                    <ThemedText className="mb-1 text-base">Select your project:</ThemedText>

                    <Select
                        items={projectItems}
                        value={selectedProject}
                        onChange={setSelectedProject}
                        placeholder="Choose project"
                        loading={projectLoading}
                        onOpen={fetchProjects}   // 🔹 Lazy fetch
                    />
                </ThemedView>

                {/* Memo */}
                <ThemedView className={`mb-2 p-4 rounded-lg ${bgColor} border border-gray-300`} style={{ elevation: 5 }}>
                    <ThemedText className="mb-1 text-base">Memo:</ThemedText>
                    <Input value={memo} onchange={setMemo} placeholder="Memo" multiline />
                </ThemedView>

                {/* Submit */}
                <View className="mb-6" style={{ elevation: 5 }}>
                    <Button title="Submit" onClickEvent={handleSubmit} />
                </View>

            </ScrollView>
        </SafeAreacontext>
    );
};

export default AddExpenses;
