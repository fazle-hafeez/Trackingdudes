import React, { useState, useContext, useEffect } from "react";
import { View, TouchableOpacity, Image, ScrollView, Platform, Text, Modal, StatusBar, KeyboardAvoidingView } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams } from "expo-router";
import { router } from "expo-router";

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


const AddExpenses = () => {
    const { darkMode } = useTheme();
    const { isConnected, queueAction } = useContext(OfflineContext);
    const { get, post, put } = useApi();
    const { id = null, activeTab, from, to } = useLocalSearchParams();
    const { showModal, setGlobalLoading, hideModal } = useAuth();
    const IMAGE_BASE_URL = "https://trackingdudes.com/uploads/"

    const [imageFullSize, setImageFullSize] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);

     const CACHE_KEY = `expenses_${activeTab}_${from}_${to}`


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
            label: i => i.project_name || i.name || i.project || i.label,
            selectedValue: selectedProject
        },
        "expense_categories": {
            items: categoryItems,
            setItems: setCategoryItems,
            setLoading: setCategoryLoading,
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
                // first check offlinee recored 
                const cached = (await readCache(CACHE_KEY)) || { data: [] };
                const cachedList = Array.isArray(cached) ? cached : [];
                const localRecord = cachedList.find(item => item.id?.toString() === id.toString());

                if (localRecord) {
                    updateFormFields(localRecord); // Helper function 
                }

                // if online is available  then get fresh data from api latest versn
                if (isConnected) {
                    const response = await get(`my-expenses/expense?id=${id}&_t=${Date.now()}`, { useBearerAuth: true });
                    console.log("server side response:", response);

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

    //cleaning the code this fun is call above
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
        const CACHE_KEY_HINTS = `cache_hints_${destination}`;

        try {
            // 1. Pehle Local Cache read karein taake UI khali na dikhe
            const cached = await readCache(CACHE_KEY_HINTS);
            if (cached?.data) {
                config.setItems(cached.data);
            }

            // 2. Agar internet nahi hai, toh aage API call karne ki zaroorat hi nahi
            if (!isConnected) return;

            // 3. API Call to get fresh data
            const response = await get(
                `my-expenses/hints?destination=${destination}&_t=${Date.now()}`,
                { useBearerAuth: true }
            );

            if (response?.status === "success" && response.data) {
                let rawData = [];

                // Data normalization
                if (Array.isArray(response.data)) {
                    rawData = response.data;
                } else if (destination === "expenses" && Array.isArray(response.data.projects)) {
                    rawData = response.data.projects;
                } else if (Array.isArray(response.data[destination])) {
                    rawData = response.data[destination];
                }

                // Formatting items
                let items = rawData.map((i, index) => {
                    const labelText = config.label(i);
                    if (labelText && labelText !== "Unknown") {
                        return {
                            label: String(labelText),
                            value: String(labelText),
                            key: `${destination}-${index}-${labelText}`
                        };
                    }
                    return null;
                }).filter(Boolean);

                // 4. Edit mode fallback (agar current value list mein na ho)
                if (editingRecord) {
                    const map = {
                        expenses: editingRecord.project,
                        expense_categories: editingRecord.category,
                        vendors: editingRecord.vendor,
                        payment_options: editingRecord.payment_option || editingRecord.paymentType
                    };
                    const currentVal = map[destination];
                    if (currentVal && !items.find(i => i.value === currentVal)) {
                        items.unshift({ label: String(currentVal), value: String(currentVal), key: `fallback-${currentVal}` });
                    }
                }

                // 5. Update State and Sync Cache
                config.setItems(items);
                await storeCache(CACHE_KEY_HINTS, { data: items, timestamp: Date.now() });
            }
        } catch (e) {
            console.error(`Fetch Error (${destination}):`, e.message);
            // Fail hone ki surat mein humne pehle hi cache set kar diya tha (Step 1), 
            // isliye user ko purana data dikhta rahega.
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
    }, [editingRecord, isConnected]); //  keep editingRecord as dependency to fetch fallback

    //=============================
    // Handle Add expense 
    // =============================

    const handleSubmit = async () => {
        // 🔑 Validate mandatory field
        if (!formData.amount) {
            setFormErrors({ amount: "Amount is required" });
            return;
        }

        // 🔑 Format date
        const formattedDate = date.toISOString().split("T")[0];
        const tempId = `local_${Date.now()}`;

        const expenseData = {
            ...formData,
            tempId,
            category: selectedCategory,
            vendor: selectedVendor,
            payment_option: selectedPayment,
            project: selectedProject,
            date: formattedDate,
            receipt, // just the URI
            sub_category: formData.subCatogry || "",
        };

        setGlobalLoading(true);

        try {
            let isSavedOnline = false;

            /* =========================
               1️⃣ TRY ONLINE SAVE
            ========================== */
            if (isConnected) {
                try {
                    const fd = new FormData();
                    Object.keys(expenseData).forEach(key => {
                        if (key === "receipt" && receipt) {
                            fd.append("receipt", {
                                uri: receipt,
                                name: "receipt.jpg",
                                type: "image/jpeg",
                            });
                        } else {
                            fd.append(key, expenseData[key] ?? "");
                        }
                    });

                    const res = await post(
                        "my-expenses/create",
                        fd,
                        { useBearerAuth: true },
                        { isFormData: true }
                    );

                    if (res?.status === "success") {
                        isSavedOnline = true;
                    }
                } catch (e) {
                    console.log("Online failed → offline mode");
                }
            }

            /* =========================
               2️⃣ OFFLINE SAVE
            ========================== */
            if (!isSavedOnline) {
                // 🔹 Add to offline queue
                await queueAction({
                    method: "post",
                    endpoint: "my-expenses/create",
                    body: expenseData,
                    isFormData: true,
                    useToken: true,
                    timestamp: Date.now(),
                });

                // 🔹 Update current TAB CACHE only (this-week / prev-week / next-week)

                const TAB_CACHE_KEY = `expenses_${activeTab}_${from}_${to}`;
                const cachedWrap = (await readCache(TAB_CACHE_KEY)) || [];

                const newOfflineRecord = {
                    ...expenseData,
                    id: tempId,
                    tempId,
                    pending: true,
                };

                cachedWrap.unshift(newOfflineRecord);

                await storeCache(TAB_CACHE_KEY, cachedWrap);
            }

            // 🔹 Flag so fetchEffect can refresh
            await storeCache("newRecordAdded", true);

            /* =========================
               3️⃣ SHOW MODAL
            ========================== */
            showModal(
                isSavedOnline
                    ? "Expense created successfully!"
                    : "Expense saved offline. Avoid duplicate names to prevent conflicts.",
                isSavedOnline ? "success" : "warning",
                false,
                [
                    { label: "Add More", bgColor: "bg-green-600", onPress: () => hideModal() },
                    { label: "View All", bgColor: "bg-blue-600", onPress: () => { hideModal(); router.back(); } },
                ]
            );

            // 🔹 Reset form fields
            resetFields();
        } catch (err) {
            console.error("Submit error:", err);
            showModal("Failed to save expense", "error");
        } finally {
            setGlobalLoading(false);
        }
    };


    //========================================
    //  Update Expenses Report
    //=======================================

    const updateExpense = async () => {
    if (!editingRecord) return;

    if (!formData.amount) {
        setFormErrors({ amount: "Amount is required" });
        return;
    }

    setGlobalLoading(true);
    const formattedDate = date.toISOString().split("T")[0];

    const updatedExpense = {
        id: editingRecord.id, 
        amount: formData.amount,
        category: selectedCategory,
        vendor: selectedVendor,
        payment_option: selectedPayment,
        project: selectedProject,
        memo: formData.memo.trim() || "",
        sub_category: formData.subCatogry || "",
        date: formattedDate,
        receipt, 
    };

    try {
        let isSavedOnline = false;

        if (isConnected) {
            try {
                const fd = new FormData();
                // Method override for server
                fd.append("_method", "PUT");
                fd.append("id", String(updatedExpense.id));

                Object.keys(updatedExpense).forEach(key => {
                    if (key !== "id") {
                        // Agar receipt nayi hai toh append karein
                        if (key === "receipt") {
                            if (receipt && receipt !== editingRecord.receipt && !receipt.startsWith('http')) {
                                fd.append("receipt", {
                                    uri: receipt,
                                    name: "receipt.jpg",
                                    type: "image/jpeg",
                                });
                            }
                        } else {
                            fd.append(key, String(updatedExpense[key] || ""));
                        }
                    }
                });

                const res = await post("my-expenses/update", fd, { useBearerAuth: true }, { isFormData: true });
                if (res?.status === "success") isSavedOnline = true;
            } catch (err) {
                console.log("Online update failed → shifting to offline");
            }
        }

        /* 🚨 OFFLINE LOGIC FIXED HERE */
        if (!isSavedOnline) {
            // 1. Context wala queueAction use karein (Ye sync trigger karega)
            await queueAction({
                method: "post", // Server side par _method: PUT handle ho raha hai
                endpoint: "my-expenses/update",
                body: { ...updatedExpense, _method: "PUT" },
                isFormData: true,
                useToken: true,
                affectedIds: [updatedExpense.id] // Taake sync ke baad UI refresh ho
            });

            // 2. Local Cache Update (Taake list mein foran tabdeeli dikhe)
            const TAB_CACHE_KEY = `expenses_${activeTab}_${from}_${to}`;
            const cachedData = await readCache(TAB_CACHE_KEY);
            // Handle different cache structures
            let list = Array.isArray(cachedData) ? cachedData : (cachedData?.data || []);

            const offlineRecord = {
                ...updatedExpense,
                pending: true,
            };

            const idx = list.findIndex(e => String(e.id) === String(updatedExpense.id));
            if (idx >= 0) {
                list[idx] = { ...list[idx], ...offlineRecord };
            }

            await storeCache(TAB_CACHE_KEY, Array.isArray(cachedData) ? list : { ...cachedData, data: list });
        }

        await storeCache("recordUpdated", true);

        showModal(
            isSavedOnline ? "Expense updated successfully!" : "Expense updated offline. It will sync when online.",
            isSavedOnline ? "success" : "warning",
            false,
            [
                { label: "View", bgColor: "bg-green-600", onPress: () => hideModal() },
                { label: "View All", bgColor: "bg-blue-600", onPress: () => { hideModal(); router.back(); } },
            ]
        );

        resetFields();

    } catch (error) {
        console.error("Update error:", error);
        showModal("Failed to update expense", "error");
    } finally {
        setGlobalLoading(false);
    }
};

    // const updateExpense = async () => {
    //     if (!editingRecord) return;

    //     // 🔑 Validate mandatory field
    //     if (!formData.amount) {
    //         setFormErrors({ amount: "Amount is required" });
    //         return;
    //     }

    //     setGlobalLoading(true);

    //     const formattedDate = date.toISOString().split("T")[0];

    //     // 🔹 Construct updated expense object
    //     const updatedExpense = {
    //         id: editingRecord.id, // must be present
    //         amount: formData.amount,
    //         category: selectedCategory,
    //         vendor: selectedVendor,
    //         payment_option: selectedPayment,
    //         project: selectedProject,
    //         memo: formData.memo.trim() || "",
    //         sub_category: formData.subCatogry || "",
    //         date: formattedDate,
    //         receipt, // just the URI if changed
    //     };

    //     try {
    //         let isSavedOnline = false;

    //         /* =========================
    //            1️⃣ TRY ONLINE UPDATE
    //         ========================== */
    //         if (isConnected) {
    //             try {
    //                 const fd = new FormData();

    //                 // Append method override for PUT (server expects this)
    //                 fd.append("OVERRIDE_METHOD", "PUT");
    //                 fd.append("METHOD_OVERRIDE", "PUT");
    //                 fd.append("_method", "PUT");

    //                 fd.append("id", String(updatedExpense.id)); // ID required

    //                 // Append all other fields
    //                 Object.keys(updatedExpense).forEach(key => {
    //                     if (key !== "id") {
    //                         fd.append(key, String(updatedExpense[key] || ""));
    //                     }
    //                 });

    //                 // Append receipt if changed
    //                 if (receipt && receipt !== editingRecord.receipt) {
    //                     fd.append("receipt", {
    //                         uri: receipt,
    //                         name: "receipt.jpg",
    //                         type: "image/jpeg",
    //                     });
    //                 }

    //                 // POST request (server handles as PUT with override)
    //                 const res = await post(
    //                     "my-expenses/update",
    //                     fd,
    //                     { useBearerAuth: true },
    //                     { isFormData: true }
    //                 );

    //                 if (res?.status === "success") isSavedOnline = true;
    //                 else console.log("Server rejected update:", res);
    //             } catch (err) {
    //                 console.log("Online update failed → fallback offline:", err);
    //             }
    //         }

    //         /* =========================
    //            2️⃣ OFFLINE SAVE (queue + tab cache)
    //         ========================== */
    //         if (!isSavedOnline) {
    //             // 2a. Add to offline queue
    //             const queue = (await readCache("offlineQueue")) || [];
    //             queue.push({
    //                 method: "post",
    //                 endpoint: "my-expenses/update",
    //                 body: { ...updatedExpense, OVERRIDE_METHOD: "PUT", METHOD_OVERRIDE: "PUT" },
    //                 isFormData: true,
    //                 timestamp: Date.now(),
    //             });
    //             await storeCache("offlineQueue", queue);

    //             // 2b. Update current TAB CACHE only (like add record)
    //             const TAB_CACHE_KEY = `expenses_${activeTab}_${from}_${to}`;
    //             const cachedWrap = (await readCache(TAB_CACHE_KEY)) || [];

    //             const offlineRecord = {
    //                 ...updatedExpense,
    //                 id: updatedExpense.id,
    //                 tempId: `local_${Date.now()}`,
    //                 pending: true, //  pending flag for offline
    //             };

    //             // Replace existing record if date matches
    //             const idx = cachedWrap.findIndex(e => String(e.id) === String(updatedExpense.id));
    //             if (idx >= 0) cachedWrap[idx] = offlineRecord;
    //             else cachedWrap.unshift(offlineRecord);

    //             await storeCache(TAB_CACHE_KEY, cachedWrap);
    //         }

    //         // 🔹 Flag to notify fetchEffect
    //         await storeCache("recordUpdated", true);

    //         /* =========================
    //            3️⃣ SHOW MODAL
    //         ========================== */
    //         showModal(
    //             isSavedOnline
    //                 ? "Expense updated successfully!"
    //                 : "Expense updated offline. it will suyn when you are online",
    //             isSavedOnline ? "success" : "warning",
    //             false,
    //             [
    //                 { label: "View", bgColor: "bg-green-600", onPress: () => hideModal() },
    //                 { label: "View All", bgColor: "bg-blue-600", onPress: () => { hideModal(); router.back(); } },
    //             ]
    //         );

    //         // 🔹 Reset form fields
    //         resetFields();

    //     } catch (error) {
    //         console.error("Global update error:", error);
    //         showModal("Failed to update expense", "error");
    //     } finally {
    //         setGlobalLoading(false);
    //     }
    // };



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
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
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
                                    <Image source={{ uri: receipt.startsWith('http') ? receipt : `${IMAGE_BASE_URL}${receipt}` }} style={{ width: 40, height: 40, borderRadius: 8 }} className="ml-5" />
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
                        message={"To select a category,just click on it . if the desired category is not in the list.it could be because you might have disabled the category"}
                    />
                    <SelectField label="Vendor" items={vendorItems} value={selectedVendor} onChange={setSelectedVendor} loading={vendorLoading}
                        message={"To select a vendor,just click on it . if the desired vendor is not in the list.it could be because you might have disabled the vendor"}
                    />
                    <SelectField
                        label="Payment Type"
                        items={paymentItems}
                        value={selectedPayment}
                        onChange={setSelectedPayment}
                        loading={paymentLoading}
                        message={"To select a payment option,just click on it . if the desired payment option is not in the list.it could be because you might have disabled the payment option"}
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
            </KeyboardAvoidingView>
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
    const IMAGE_BASE_URL = "https://trackingdudes.com/uploads/receipts/"
    const { darkMode } = useTheme();
    useModalBars(visibility, darkMode);
    return (
        <Modal visible={visibility} transparent={true} animationType="fade">
            <View className="flex-1 bg-black/80 justify-center items-center p-4">
                <View className={`rounded-2xl p-3 shadow-2xl`} style={{
                    width: "90%", maxHeight: "85%", backgroundColor: darkMode ? "#1f2938" : "#fff",
                    justifyContent: "center", alignItems: "center",
                }}>
                    <Image source={{ uri: receipt?.startsWith('http') ? receipt : `${IMAGE_BASE_URL}${receipt}` }} style={{ width: "100%", height: "100%", resizeMode: "contain" }} />
                </View>
                <TouchableOpacity onPress={onPress} className="absolute top-10 right-5" style={{ elevation: 2 }}>
                    <Ionicons name="close-circle" size={45} color="#fff" />
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

export default AddExpenses;
