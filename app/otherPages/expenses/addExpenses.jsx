import React, { useState, useContext, useEffect } from "react";
import { View, TouchableOpacity, Image, ScrollView, Platform, Text, Modal, StatusBar } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams } from "expo-router";

import PageHeader from "../../../src/components/PageHeader";
import { ThemedView, SafeAreacontext, ThemedText } from "../../../src/components/ThemedColor";
import Input from "../../../src/components/Input";
import Button from "../../../src/components/Button";
import { useTheme } from "../../../src/context/ThemeProvider";
import Select from "../../../src/components/Select";
import { useApi } from "../../../src/hooks/useApi";
import { OfflineContext } from "../../../src/offline/OfflineProvider";
import { readCache, storeCache } from "../../../src/offline/cache";
import { useModalBars } from "../../../src/hooks/useModalBar";

const CACHE_KEY = "expenses-cache";

const AddExpenses = () => {
    const { darkMode } = useTheme();
    const { isConnected } = useContext(OfflineContext);
    const { get, post } = useApi();
    const { id = null } = useLocalSearchParams();

    const [imageFullSize, setImageFullSize] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);

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
        StatusBar.setBackgroundColor(darkMode ? "#121212" : "#00f", true);
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
            label: i => i.project || i.name,
            selectedValue: selectedProject
        },
        inShift: {
            items: categoryItems,
            setItems: setCategoryItems,
            setLoading: setCategoryLoading,
            label: i => i.name,
            selectedValue: selectedCategory
        },
        inTrips: {
            items: vendorItems,
            setItems: setVendorItems,
            setLoading: setVendorLoading,
            label: i => i.name,
            selectedValue: selectedVendor
        },
        inTims: {
            items: paymentItems,
            setItems: setPaymentItems,
            setLoading: setPaymentLoading,
            label: i => i.name,
            selectedValue: selectedPayment
        }
    };

    // --- Load Editing Record from cache ---
    useEffect(() => {
        const loadRecord = async () => {
            const cashed = (await readCache(CACHE_KEY)) || { data: [] };
            const cashedList = Array.isArray(cashed.data) ? cashed.data : [];
            if (id) {
                const r = cashedList.find(item => item.id.toString() === id.toString());
                if (r) {
                    setEditingRecord(r);
                    setFormData({
                        amount: r.amount,
                        category: r.category,
                        project: r.project,
                        vendor: r.vendor,
                        paymentType: r.paymentType,
                        memo: r.memo
                    });
                    setReceipt(r?.image || null);
                    setSelectedProject(r.project);
                    setSelectedCategory(r.category);
                    setSelectedVendor(r.vendor);
                    setSelectedPayment(r.paymentType);
                    setDate(r.date ? new Date(r.date) : new Date());
                }
            }
        };
        loadRecord();
    }, [id]);

    const fetchItems = async (destination) => {
        const config = DESTINATION_MAP[destination];
        if (!config) return;

        config.setLoading(true);

        try {
            const response = await get(
                `my-projects/show-in?destination=${destination}&_t=${isConnected ? Date.now() : 0}`,
                { useBearerAuth: true }
            );

            let items = [];
            if (response?.status === "success" && Array.isArray(response.data)) {
                items = response.data.map(i => ({
                    label: config.label(i),
                    value: config.label(i)
                }));
            }

            // --- Edit mode fallback ---
            let currentValue;
            if (editingRecord) {
                switch (destination) {
                    case "expenses": currentValue = editingRecord.project; break;
                    case "inShift": currentValue = editingRecord.category; break;
                    case "inTrips": currentValue = editingRecord.vendor; break;
                    case "inTims": currentValue = editingRecord.paymentType; break;
                }
                if (currentValue && !items.find(i => i.value === currentValue)) {
                    items = [{ label: currentValue, value: currentValue }, ...items];
                }
            }

            config.setItems(items);
        } catch (e) {
            console.log(destination, e);
            config.setItems([]);
        } finally {
            config.setLoading(false);
        }
    };

    // --- Load all select items once on mount ---
    useEffect(() => {
        const loadFund = async () => {
            await fetchItems("expenses");
            await fetchItems("inShift");
            await fetchItems("inTrips");
            await fetchItems("inTims");

        }
        loadFund()
    }, [editingRecord]); //  keep editingRecord as dependency to fetch fallback

    const handleSubmit = async () => {
        let errors = { amount: "", category: "", vendor: "", paymentType: "", project: "" };
        let hasError = false;

        if (!formData.amount) { errors.amount = "Amount is required"; hasError = true; }

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
            let cachedData = await readCache(CACHE_KEY);
            if (!cachedData || typeof cachedData !== "object") cachedData = { data: [] };
            const prevExpenses = Array.isArray(cachedData.data) ? cachedData.data : [];
            cachedData.data = [...prevExpenses, newExpense];
            await storeCache(CACHE_KEY, cachedData);

            let offline = false;
            if (isConnected) {
                try {
                    const response = await post("/expenses/create", newExpense);
                    if (response?.status === "success") newExpense.pending = false;
                    else offline = true;
                } catch (err) { offline = true; }
            } else offline = true;

            cachedData.data = cachedData.data.map(e => e.id === newExpense.id ? newExpense : e);
            await storeCache(CACHE_KEY, cachedData);

            alert(offline
                ? "Expense saved locally. It will sync when you are online."
                : "Expense submitted successfully!"
            );

            setFormData({ amount: "", category: "", vendor: "", paymentType: "", project: "", memo: "" });
            setReceipt(null);
            setSelectedCategory(null);
            setSelectedVendor(null);
            setSelectedProject(null);
            setSelectedPayment(null);
        } catch (err) {
            console.log("Expenses Error:", err);
            alert("Failed to save expense locally");
        }
    };

    const updateExpense = () => {
        console.log("Update expense called");
    }

    const bgColor = darkMode ? "bg-gray-800" : "bg-white";

    return (
        <SafeAreacontext className="flex-1">
            <PageHeader routes={` ${id ? "Edit Expense" : "Add Expenses"}`} />
            <ScrollView className="p-3">

                {/* Receipt */}
                <ThemedView className={`mb-4 p-4 rounded-lg ${bgColor} border border-gray-300`} style={{ elevation: 3 }}>
                    <TouchableOpacity className="flex-row justify-between items-center" onPress={pickImage}>
                        <View className="flex-row items-center">
                            <Ionicons name="attach-outline" size={24} color={darkMode ? "#fff" : "#1f2937"} />
                            <ThemedText className="ml-3 text-base">Attach Receipt</ThemedText>
                        </View>
                        {receipt ? (
                            <View>
                                <Image source={{ uri: receipt }} style={{ width: 40, height: 40, borderRadius: 8 }} className="ml-5" />
                                <TouchableOpacity onPress={() => setImageFullSize(true)}>
                                    <Text className="text-blue-700 underline">View receipt</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <Ionicons name="image-outline" size={26} color={darkMode ? "#aaa" : "#1f2937"} />
                        )}
                    </TouchableOpacity>
                </ThemedView>

                {/* Date */}
                {!id && (
                    <ThemedView className={`mb-4 p-4 rounded-lg ${bgColor} border border-gray-300`} style={{ elevation: 3 }}>
                        <ThemedText className="mb-1 text-base">Date of purchase:</ThemedText>
                        <TouchableOpacity className="flex-row items-center" onPress={() => setShowDatePicker(true)} style={{ width: "100%" }}>
                            <View style={{ flex: 1, marginRight: 60 }}>
                                <Input
                                    value={date.toDateString()}
                                    onchange={() => { }}
                                    placeholder="Date of Purchase"
                                    inputError=""
                                    editable={true}
                                />
                            </View>
                            <Ionicons name="calendar-outline" size={24} color={darkMode ? "#fff" : "#1f2937"} />
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={date}
                                mode="date"
                                display="default"
                                onChange={handleDateChange}
                                maximumDate={new Date()}
                            />
                        )}
                    </ThemedView>
                )}

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
                <SelectField label="Project" items={projectItems} value={selectedProject} onChange={setSelectedProject} loading={projectLoading} 
                 message={"To select a project,just click on it . if the desired project is not in the list.it could be because you might have disabled the project"}
                />
                <SelectField label="Category" items={categoryItems} value={selectedCategory} onChange={setSelectedCategory} loading={categoryLoading} 
                 message={"To select a project,just click on it . if the desired project is not in the list.it could be because you might have disabled the project"}
                />
                <SelectField label="Vendor" items={vendorItems} value={selectedVendor} onChange={setSelectedVendor} loading={vendorLoading} 
                message={"To select a project,just click on it . if the desired project is not in the list.it could be because you might have disabled the project"}
                />
                <SelectField 
                label="Payment Type" 
                items={paymentItems} 
                value={selectedPayment} 
                onChange={setSelectedPayment} 
                loading={paymentLoading}
                message={"To select a project,just click on it . if the desired project is not in the list.it could be because you might have disabled the project"}
                 />

                {/* Memo */}
                <ThemedView className={`mb-2 p-4 rounded-lg ${bgColor} border border-gray-300`} style={{ elevation: 3 }}>
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
                    <Button title={` ${id ? "Update" : "Submit"}`} onClickEvent={id ? updateExpense : handleSubmit} />
                </View>

                <ShowImageFullSizeModal visibility={imageFullSize} onPress={() => setImageFullSize(false)} receipt={receipt} />
            </ScrollView>
        </SafeAreacontext>
    );
};

// --- Reusable SelectField component ---
const SelectField = ({ label, items, value, onChange, loading,message }) => {
    const { darkMode } = useTheme();
    const bgColor = darkMode ? "bg-gray-800" : "bg-white";
    return (
        <ThemedView className={`mb-4 p-4 rounded-lg ${bgColor} border border-gray-300`} style={{ elevation: 3 }}>
            <ThemedText className="mb-1 text-base">{label}:</ThemedText>
            <Select items={items} value={value} onChange={onChange} placeholder={`Choose ${label.toLowerCase()}`} loading={loading}
            message={message} />
        </ThemedView>
    );
};

const ShowImageFullSizeModal = ({ visibility, onPress, receipt = null }) => {
    const { darkMode } = useTheme();
    useModalBars(visibility, darkMode);
    return (
        <Modal visible={visibility} transparent={true} animationType="fade">
            <View className="flex-1 bg-black/80 justify-center items-center p-4">
                <View className={`rounded-2xl p-3 shadow-2xl`} style={{
                    width: "90%", maxHeight: "85%", backgroundColor: darkMode ? "#1f2938" : "#fff",
                    justifyContent: "center", alignItems: "center",
                }}>
                    <Image source={{ uri: receipt }} style={{ width: "100%", height: "100%", resizeMode: "contain" }} />
                </View>
                <TouchableOpacity onPress={onPress} className="absolute top-10 right-5" style={{ elevation: 2 }}>
                    <Ionicons name="close-circle" size={45} color="#fff" />
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

export default AddExpenses;
