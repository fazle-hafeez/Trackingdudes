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
import { useAuth } from "../../../src/context/UseAuth";

const CACHE_KEY = "expenses-cache";

const AddExpenses = () => {
    const { darkMode } = useTheme();
    const { isConnected } = useContext(OfflineContext);
    const { get, post } = useApi();
    const { id = null } = useLocalSearchParams();
    const { showModal, setGlobalLoading, hideModal } = useAuth();


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
        subCatogry: ""
    });

    const [formErrors, setFormErrors] = useState({
        amount: "",
        category: "",
        vendor: "",
        paymentType: "",
        project: "",
        receiptSize: "",
        subCatogry: ""
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

    // ----------- OCR FUNCTION ---------------

    const extractTextFromImage = async (imageUri) => {
        const apiKey = "helloworld"; // free OCR key

        let formData = new FormData();
        formData.append("file", {
            uri: imageUri,
            type: "image/jpeg",
            name: "receipt.jpg"
        });
        formData.append("language", "eng");
        formData.append("isTable", "true");

        try {
            let response = await fetch("https://api.ocr.space/parse/image", {
                method: "POST",
                headers: {
                    "apikey": apiKey,
                },
                body: formData,
            });

            let result = await response.json();

            if (result?.ParsedResults?.[0]?.ParsedText) {
                return result.ParsedResults[0].ParsedText;
            }

            return "";
        } catch (err) {
            console.log("OCR ERROR:", err);
            return "";
        }
    };


    const extractAmountSmart = (text) => {
        if (!text) return "";

        const lines = text.split("\n");

        // Keywords jahan amount hota hai
        const keywords = ["total", "amount", "grand", "net", "balance", "rs", "pkr"];

        // 1) Keyword wali line dhoondo
        const targetLine = lines.find(line =>
            keywords.some(k => line.toLowerCase().includes(k))
        );

        if (targetLine) {
            const nums = targetLine.match(/(\d+[\.,]?\d{0,2})/g);
            if (nums?.length) {
                return nums[nums.length - 1].replace(/,/g, "");
            }
        }

        // Fallback: Pehla number milay tou
        const fallback = text.match(/(\d+[\.,]?\d{0,2})/);
        return fallback ? fallback[0].replace(/,/g, "") : "";
    };


    // ----------- AUTO FILL FUNCTION ---------------

    const autoFillFields = (text) => {
        if (!text) return;

        // ⭐ SMART AMOUNT EXTRACTION
        let detectedAmount = extractAmountSmart(text);

        // Date detection
        let dateMatch = text.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/);
        let detectedDate = dateMatch ? dateMatch[0] : "";

        // Vendor = First line
        let vendorLine = text.split("\n")[0]?.trim();

        setFormData(prev => ({
            ...prev,
            amount: detectedAmount || prev.amount,
            vendor: vendorLine || prev.vendor,
        }));

        if (detectedDate) {
            let formatted = detectedDate.replace(/-/g, "/");
            setDate(new Date(formatted));
        }
    };



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

        const asset = result.assets?.[0];

        if (asset?.fileSize && asset.fileSize > 1024 * 1024) {
            setFormErrors(prev => ({
                ...prev,
                receiptSize: "Image too large. Please upload an image under 1MB."
            }));
            return;
        }
        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setReceipt(uri);
            setFormErrors(prev => ({ ...prev, receiptSize: "" }));

            //  START LOADING WHEN IMAGE IS PICKED
            setGlobalLoading(true);

            try {
                const ocrText = await extractTextFromImage(uri);
                console.log("OCR TEXT:", ocrText);
                autoFillFields(ocrText);
            } catch (e) {
                console.log("OCR READ FAILED:", e);
            }

            //  STOP LOADING WHEN OCR IS DONE
            setGlobalLoading(false);

            StatusBar.setBackgroundColor(darkMode ? "#121212" : "#00f", true);
        }
    };


    // --- Date Handler ---
    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === "ios");
        if (selectedDate) setDate(selectedDate);
    };

    // --- Fetch Select Items ---
    const DESTINATION_MAP = {
        expenses: { // Projects
            items: projectItems,
            setItems: setProjectItems,
            setLoading: setProjectLoading,
            // Yahan keys check karein: project_name ya name
            label: i => i.project_name || i.name || i.project || i.label,
            selectedValue: selectedProject
        },
        "expense_categories": {
            items: categoryItems,
            setItems: setCategoryItems,
            setLoading: setCategoryLoading,
            // Yahan category_name check karein
            label: i => i.category_name || i.name || i.category || i.label,
            selectedValue: selectedCategory
        },
        vendors: {
            items: vendorItems,
            setItems: setVendorItems,
            setLoading: setVendorLoading,
            label: i => i.vendor_name || i.name || i.vendor || i.label,
            selectedValue: selectedVendor
        },
        "payment_options": {
            items: paymentItems,
            setItems: setPaymentItems,
            setLoading: setPaymentLoading,
            // Yahan option_name ya payment_option
            label: i => i.option_name || i.name || i.payment_option || i.label,
            selectedValue: selectedPayment
        }
    };

    // --- Load Editing Record from cache ---
    useEffect(() => {
        const loadRecord = async () => {
            if (!id) return;

            setGlobalLoading(true);
            try {
                // 1️⃣ Pehle Cache check karein (For Offline / Fast Load)
                const cached = (await readCache(CACHE_KEY)) || { data: [] };
                const cachedList = Array.isArray(cached.data) ? cached.data : [];
                const localRecord = cachedList.find(item => item.id?.toString() === id.toString());

                if (localRecord) {
                    updateFormFields(localRecord); // Helper function niche hai
                }

                // 2️⃣ Agar online hai, toh Fresh Data API se lein (Latest version)
                if (isConnected) {
                    // Aapka naya endpoint use ho raha hai yahan
                    // loadRecord ke andar jahan apiGet likha hai usay get kar dein
                    const response = await get(`my-expenses/expense?id=${id}`, { useBearerAuth: true });;

                    if (response?.status === "success" && response?.data) {
                        updateFormFields(response.data);
                    }
                }
            } catch (error) {
                console.error("Error loading record:", error);
            } finally {
                setGlobalLoading(false);
            }
        };

        loadRecord();
    }, [id, isConnected]);

    // Logic ko clean rakhne ke liye helper function
    const updateFormFields = (data) => {
        setEditingRecord(data);
        setFormData({
            amount: data.amount?.toString() || "",
            category: data.category || "",
            project: data.project || "",
            vendor: data.vendor || "",
            paymentType: data.payment_option || data.paymentType || "", // Check both naming conventions
            memo: data.memo || ""
        });
        setReceipt(data.receipt || data.image || null);
        setSelectedProject(data.project);
        setSelectedCategory(data.category);
        setSelectedVendor(data.vendor);
        setSelectedPayment(data.payment_option || data.paymentType);
        setDate(data.date ? new Date(data.date) : new Date());
    };


    const fetchItems = async (destination) => {
        const config = DESTINATION_MAP[destination];
        if (!config) return;

        config.setLoading(true);

        try {
            const response = await get(
                `my-expenses/hints?destination=${destination}&_t=${isConnected ? Date.now() : 0}`,
                { useBearerAuth: true }
            );

            let items = [];

            if (response?.status === "success" && response.data) {
                let rawData = [];
                if (Array.isArray(response.data)) {
                    rawData = response.data;
                } else if (destination === "expenses" && Array.isArray(response.data.projects)) {
                    rawData = response.data.projects;
                } else if (Array.isArray(response.data[destination])) {
                    rawData = response.data[destination];
                }

                // Map with Index to ensure uniqueness
                items = rawData.map((i, index) => {
                    const labelText = config.label(i);

                    if (labelText && labelText !== "Unknown Category") {
                        return {
                            label: String(labelText),
                            value: String(labelText),
                            // Unique key using index + label
                            key: `${destination}-${index}-${labelText}`
                        };
                    }
                    return null;
                }).filter(item => item !== null);
            }

            // Edit mode fallback logic
            if (editingRecord) {
                let currentValue;
                switch (destination) {
                    case "expenses": currentValue = editingRecord.project; break;
                    case "expense_categories": currentValue = editingRecord.category; break;
                    case "vendors": currentValue = editingRecord.vendor; break;
                    case "payment_options": currentValue = editingRecord.payment_option || editingRecord.paymentType; break;
                }

                if (currentValue && !items.find(i => i.value === currentValue)) {
                    items = [{
                        label: String(currentValue),
                        value: String(currentValue),
                        key: `edit-fallback-${currentValue}`
                    }, ...items];
                }
            }

            config.setItems(items);

            if (isConnected && items.length > 0) {
                await storeCache(`cache_hints_${destination}`, { data: items, timestamp: Date.now() });
            }

        } catch (e) {
            console.error(`Error fetching ${destination}:`, e);
            const cached = await readCache(`cache_hints_${destination}`);
            config.setItems(cached?.data || []);
        } finally {
            config.setLoading(false);
        }
    };
    // --- Load all select items once on mount ---
    useEffect(() => {
        const loadFund = async () => {
            await fetchItems("expenses");
            await fetchItems("vendors");
            await fetchItems("payment_options");
            await fetchItems("expense_categories");

        }
        loadFund()
    }, [editingRecord]); //  keep editingRecord as dependency to fetch fallback

    const handleSubmit = async () => {
        let errors = {
            amount: "",
            category: "",
            vendor: "",
            paymentType: "",
            project: "",
        };

        let hasError = false;

        if (!formData.amount) {
            errors.amount = "Amount is required";
            hasError = true;
        }

        setFormErrors(errors);
        if (hasError) return;

        // ✅ Expense object (for cache)
        const newExpense = {
            id: Date.now().toString(),
            amount: formData.amount,
            category: selectedCategory,
            vendor: selectedVendor,
            payment_option: selectedPayment,
            project: selectedProject,
            memo: formData.memo || "",
            sub_category: formData.subCatogry || "",
            date: date.toISOString(),
            receipt,
            pending: !isConnected,
        };

        try {
            // 1️⃣ Save locally first
            let cachedData = await readCache(CACHE_KEY);
            if (!cachedData || typeof cachedData !== "object") {
                cachedData = { data: [] };
            }

            cachedData.data = [...(cachedData.data || []), newExpense];
            await storeCache(CACHE_KEY, cachedData);

            let offline = !isConnected;

            // 2️⃣ Try online submit
            if (isConnected) {
                try {
                    const fd = new FormData();

                    fd.append("amount", newExpense.amount);
                    fd.append("category", newExpense.category || "");
                    fd.append("vendor", newExpense.vendor || "");
                    fd.append("payment_option", newExpense.payment_option || "");
                    fd.append("project", newExpense.project || "");
                    fd.append("memo", newExpense.memo);
                    fd.append("sub_category", newExpense.sub_category);
                    fd.append("date", newExpense.date);

                    if (receipt) {
                        fd.append("receipt", {
                            uri: receipt,
                            name: "receipt.jpg",
                            type: "image/jpeg",
                        });
                    }

                    const response = await post(
                        "my-expenses/create-expense",
                        fd,
                        { isFormData: true }
                    );

                    console.log("CREATE RESPONSE:", response);

                    if (response?.status === "success") {
                        newExpense.pending = false;
                        showModal(response.message || "Expense added successfully", "success");
                    } else {
                        showModal(
                            response?.error || response?.data || "Failed to save expense",
                            "error"
                        );
                    }
                } catch (err) {
                    //  real network error
                    offline = true;
                    console.log("Network error:", err);
                }
            }

            //  Update cache pending flag
            cachedData.data = cachedData.data.map((e) =>
                e.id === newExpense.id ? newExpense : e
            );
            await storeCache(CACHE_KEY, cachedData);

            //  Reset form
            resetFields()

            if (offline) {
                showModal("Saved offline. It will sync when online.", "info");
            }
        } catch (err) {
            console.log("Expense Submit Error:", err);
            showModal("Failed to save expense locally", "error");
        }
    };


    const updateExpense = async () => {
        if (!editingRecord) return;

        let errors = {
            amount: "",
            category: "",
            vendor: "",
            paymentType: "",
            project: "",
        };

        let hasError = false;

        if (!formData.amount) {
            errors.amount = "Amount is required";
            hasError = true;
        }

        setFormErrors(errors);
        if (hasError) return;

        //  Updated expense (cache purpose)
        const updatedExpense = {
            ...editingRecord,
            amount: formData.amount,
            category: selectedCategory,
            vendor: selectedVendor,
            payment_option: selectedPayment,
            project: selectedProject,
            memo: formData.memo || "",
            sub_category: formData.subCatogry || "",
            date: date.toISOString(),
            receipt,
            pending: !isConnected,
            METHOD_OVERRIDE
        };

        try {
            //  Update cache immediately
            let cachedData = await readCache(CACHE_KEY);
            if (!cachedData || typeof cachedData !== "object") {
                cachedData = { data: [] };
            }

            cachedData.data = cachedData.data.map((e) =>
                e.id === updatedExpense.id ? updatedExpense : e
            );

            await storeCache(CACHE_KEY, cachedData);

            let offline = !isConnected;

            // 2️⃣ Try online update
            if (isConnected) {
                try {
                    const fd = new FormData();

                    fd.append("amount", updatedExpense.amount);
                    fd.append("category", updatedExpense.category || "");
                    fd.append("vendor", updatedExpense.vendor || "");
                    fd.append("payment_option", updatedExpense.payment_option || "");
                    fd.append("project", updatedExpense.project || "");
                    fd.append("memo", updatedExpense.memo);
                    fd.append("sub_category", updatedExpense.sub_category);
                    fd.append("date", updatedExpense.date);

                    //  send image ONLY if changed
                    if (receipt && receipt !== editingRecord.receipt) {
                        fd.append("receipt", {
                            uri: receipt,
                            name: "receipt.jpg",
                            type: "image/jpeg",
                        });
                    }

                    const response = await post(
                        `my-expenses/update-expense/${updatedExpense.id}`,
                        fd,
                        true,
                        { isFormData: true }
                    );

                    console.log("UPDATE RESPONSE:", response);

                    if (response?.status === "success") {
                        updatedExpense.pending = false;
                        showModal(response.message || "Expense updated successfully", "success");
                    } else {
                        showModal(
                            response?.error || response?.message || "Failed to update expense",
                            "error"
                        );
                    }
                } catch (err) {
                    offline = true;
                    console.log("Update network error:", err);
                }
            }

            //  Update cache pending flag
            cachedData.data = cachedData.data.map((e) =>
                e.id === updatedExpense.id ? updatedExpense : e
            );

            await storeCache(CACHE_KEY, cachedData);

            //  Reset form
            resetFields()

            if (offline) {
                showModal("Updated offline. It will sync when online.", "info");
            }
        } catch (err) {
            console.log("Update Expense Error:", err);
            showModal("Failed to update expense locally", "error");
        }
    };


    const resetFields = () => {
        setFormData({
            amount: "",
            category: "",
            vendor: "",
            paymentType: "",
            project: "",
            memo: "",
            subCatogry: "",
        });

        setReceipt(null);
        setSelectedCategory(null);
        setSelectedVendor(null);
        setSelectedProject(null);
        setSelectedPayment(null);

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
                {formErrors.receiptSize && (
                    <ThemedText className="my-1 text-red-500">{formErrors.receiptSize}</ThemedText>
                )}

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
                <ThemedView className={`mb-4 p-4 rounded-lg ${bgColor} border border-gray-300`} style={{ elevation: 3 }}>
                    <ThemedText className="mb-1 text-base">Sub categories:</ThemedText>
                    <Input
                        value={formData.subCatogry}
                        onchange={(val) => setFormData({ ...formData, subCatogry: val })}
                        placeholder="Enter sub category"
                        inputError={formErrors.subCatogry}
                        setInputError={(err) => setFormErrors({ ...formErrors, subCatogry: err })}
                    />
                </ThemedView>

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
const SelectField = ({ label, items, value, onChange, loading, message }) => {
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
