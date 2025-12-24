import React, { useState, useContext, useEffect } from "react";
import { View, TouchableOpacity, Image, ScrollView, Platform } from "react-native";
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
import { OfflineContext } from "../../../src/offline/OfflineProvider";
import { readCache, storeCache } from "../../../src/offline/cache";

const CACHE_KEY = "expenses-reporting";

const AddExpenses = () => {
    const { darkMode } = useTheme();
    const { isConnected } = useContext(OfflineContext);
    const { get } = useApi();

    const [receipt, setReceipt] = useState(null);
    const [date, setDate] = useState(new Date())
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [formData, setFormData] = useState({
        amount: "",
        category: "",
        vendor: "",
        paymentType: "",
        memo: "",
        project: "",
    });

    const [formErrors, setFormErrors] = useState({
        amount: "",
        category: "",
        vendor: "",
        paymentType: "",
        project: ""
    });

    // --- Select States ---
    const [projectItems, setProjectItems] = useState([]);
    const [projectLoading, setProjectLoading] = useState(false);

    const [categoryItems, setCategoryItems] = useState([]);
    const [categoryLoading, setCategoryLoading] = useState(false);

    const [vendorItems, setVendorItems] = useState([]);
    const [vendorLoading, setVendorLoading] = useState(false);

    const [paymentItems, setPaymentItems] = useState([]);
    const [paymentLoading, setPaymentLoading] = useState(false);

    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [selectedPayment, setSelectedPayment] = useState(null);

    // --- Pick Image ---
    const pickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            alert("Permission is required to select images.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.Images,
            quality: 0.7,
            allowsEditing: true
        });
        if (!result.canceled) setReceipt(result.assets[0].uri);
    };

    // --- Date Handler ---
    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === "ios");
        if (selectedDate) setDate(selectedDate);
    };

    // --- Fetch Select Items ---
    const DESTINATION_MAP = {
        expenses: {
            items: projectItems,
            setItems: setProjectItems,
            setLoading: setProjectLoading,
            label: i => i.project || i.name
        },
        categories: {
            items: categoryItems,
            setItems: setCategoryItems,
            setLoading: setCategoryLoading,
            label: i => i.name
        },
        vendors: {
            items: vendorItems,
            setItems: setVendorItems,
            setLoading: setVendorLoading,
            label: i => i.name
        },
        "payment-types": {
            items: paymentItems,
            setItems: setPaymentItems,
            setLoading: setPaymentLoading,
            label: i => i.name
        }
    };


    const fetchItems = async (destination) => {
        const config = DESTINATION_MAP[destination];
        if (!config) return;

        if (config.items.length > 0) return; // ✅ cache hit

        config.setLoading(true);

        try {
            const response = await get(
                `my-projects/show-in?destination=${destination}`,
                { useBearerAuth: true }
            );

            if (response?.status === "success") {
                config.setItems(
                    response.data.map(i => ({
                        label: config.label(i),
                        value: config.label(i)
                    }))
                );
            }
        } catch (e) {
            console.log(destination, e);
            config.setItems([]);
        } finally {
            config.setLoading(false);
        }
    };


    useEffect(() => {
        let mounted = true;

        const loadAll = async () => {
            if (!mounted) return;

            await fetchItems("expenses");
            await fetchItems("categories");
            await fetchItems("vendors");
            await fetchItems("payment-types");
        };

        loadAll();

        //  cleanup MUST be a function
        return () => {
            mounted = false;
        };
    }, []);


    // --- Submit Form ---
     const handleSubmit = async () => {
        let errors = { amount: "", category: "", vendor: "", paymentType: "", project: "" };
        let hasError = false;

        if (!formData.amount) { errors.amount = "Amount is required"; hasError = true; }
        // if (!selectedCategory) { errors.category = "Category is required"; hasError = true; }
        // if (!selectedVendor) { errors.vendor = "Vendor is required"; hasError = true; }
        // if (!selectedPayment) { errors.paymentType = "Payment type is required"; hasError = true; }
        // if (!selectedProject) { errors.project = "Project is required"; hasError = true; }

        setFormErrors(errors);
        if (hasError) return;

        const newExpense = {
            id: Date.now().toString(),
            amount: formData.amount,
            category: selectedCategory,
            vendor: selectedVendor,
            paymentType: selectedPayment,
            project: selectedProject,
            memo: formData.memo,
            date: date.toISOString(),
            receipt,
            pending: true,
        };

        try {
            // Read previous cache
            const cachedWrap = (await readCache(CACHE_KEY)) || {};
            const prevExpenses = Array.isArray(cachedWrap.expenses) ? cachedWrap.expenses : [];

            // Merge new expense with previous cache
            cachedWrap.expenses = [...prevExpenses, newExpense];
            await storeCache(CACHE_KEY, cachedWrap);

            // Attempt online save
            let isOffline = false;
            if (isConnected) {
                try {
                    await post("/expenses/create", newExpense);
                    newExpense.pending = false;
                } catch (err) {
                    isOffline = true;
                }
            } else {
                isOffline = true;
            }

            // Update cache with online status
            cachedWrap.expenses = cachedWrap.expenses.map(exp =>
                exp.id === newExpense.id ? newExpense : exp
            );
            await storeCache(CACHE_KEY, cachedWrap);

            alert(isOffline
                ? "Expense saved locally. It will sync when online."
                : "Expense submitted successfully!"
            );

            // Clear form
            setFormData({ amount: "", category: "", vendor: "", paymentType: "", project: "", memo: "" });
            setReceipt(null);
            setSelectedCategory(null);
            setSelectedVendor(null);
            setSelectedProject(null);
            setSelectedPayment(null);

        } catch (err) {
            console.error(err);
            alert("Failed to save expense");
        }
    };


    const bgColor = darkMode ? "bg-gray-800" : "bg-white";

    return (
        <SafeAreacontext className="flex-1">
            <PageHeader routes="Add Expenses" />
            <ScrollView className="p-3">

                {/* Receipt */}
                <ThemedView className={`mb-4 p-4 rounded-lg ${bgColor} border border-gray-300`} style={{ elevation: 3 }}>
                    <TouchableOpacity className="flex-row justify-between items-center" onPress={pickImage}>
                        <View className="flex-row items-center">
                            <Ionicons name="attach-outline" size={24} color={darkMode ? "#fff" : "#1f2937"} />
                            <ThemedText className="ml-3 text-base">Attach Receipt</ThemedText>
                        </View>
                        {receipt ? (
                            <Image source={{ uri: receipt }} style={{ width: 50, height: 40, borderRadius: 8 }} />
                        ) : (
                            <Ionicons name="image-outline" size={26} color={darkMode ? "#aaa" : "#1f2937"} />
                        )}
                    </TouchableOpacity>
                </ThemedView>

                {/* Date */}
                <ThemedView className={`mb-4 p-4 rounded-lg ${bgColor} border border-gray-300`} style={{ elevation: 3 }}>
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
                <ThemedView className={`mb-4 p-4 rounded-lg ${bgColor} border border-gray-300`} style={{ elevation: 3 }}>
                    <ThemedText className="mb-1 text-base">Amount:</ThemedText>
                    <Input
                        value={formData.amount}
                        onchange={(val) => setFormData({ ...formData, amount: val })}
                        placeholder="Amount"
                        keyboardType="numeric"
                        inputError={formErrors.amount}
                        setInputError={(err) => setFormErrors({ ...formErrors, amount: err })}
                    />
                </ThemedView>

                {/* Select Fields */}
                <ThemedView className={`mb-4 p-4 rounded-lg ${bgColor} border border-gray-300`}
                    style={{ elevation: 3 }}>
                    <ThemedText className="mb-1 text-base">Project:</ThemedText>
                    <Select
                        items={projectItems}
                        value={selectedProject}
                        onChange={setSelectedProject}
                        placeholder="Choose project"
                        loading={projectLoading}
                        message="To select a project,just click on it . if the desired project is not in the list.it could be because you might have disabled the project"
                    />
                </ThemedView>

                <ThemedView className={`mb-4 p-4 rounded-lg ${bgColor} border border-gray-300`}
                    style={{ elevation: 3 }}>
                    <ThemedText className="mb-1 text-base">Category:</ThemedText>
                    <Select
                        items={categoryItems}
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                        placeholder="Choose category"
                        loading={categoryLoading}
                        message="To select a Category,just click on it . if the desired Category is not in the list.it could be because you might have disabled the project"

                    />

                </ThemedView>

                <ThemedView className={`mb-4 p-4 rounded-lg ${bgColor} border border-gray-300`}
                    style={{ elevation: 3 }}>
                    <ThemedText className="mb-1 text-base">Vendor:</ThemedText>
                    <Select
                        items={vendorItems}
                        value={selectedVendor}
                        onChange={setSelectedVendor}
                        placeholder="Choose vendor"
                        loading={vendorLoading}
                        message="To select a project,just click on it . if the desired project is not in the list.it could be because you might have disabled the project"

                    />
                </ThemedView>

                <ThemedView className={`mb-4 p-4 rounded-lg ${bgColor} border border-gray-300`}
                    style={{ elevation: 3 }}>
                    <ThemedText className="mb-1 text-base">Payment Type:</ThemedText>
                    <Select
                        items={paymentItems}
                        value={selectedPayment}
                        onChange={setSelectedPayment}
                        placeholder="Choose payment type"
                        loading={paymentLoading}
                        message="To select a project,just click on it . if the desired project is not in the list.it could be because you might have disabled the project"

                    />
                </ThemedView>

                {/* Memo */}
                <ThemedView className={`mb-2 p-4 rounded-lg ${bgColor} border border-gray-300`}
                    style={{ elevation: 3 }}>
                    <ThemedText className="mb-1 text-base">Memo:</ThemedText>
                    <Input
                        value={formData.memo}
                        onchange={(val) => setFormData({ ...formData, memo: val })}
                        placeholder="Memo"
                        multiline
                    />
                </ThemedView>

                {/* Submit */}
                <View className="mb-6">
                    <Button title="Submit" onClickEvent={handleSubmit} />
                </View>

            </ScrollView>
        </SafeAreacontext>
    );
};


export default AddExpenses;
